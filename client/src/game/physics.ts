import { TILE_SIZE, TileType, EntityType, NOTE_BLOCK_BOUNCE_FORCE } from './constants';
import { Entity } from './entities';
import { isSolidForCollision, isOneWayPlatform, isSlopeTile, slopeSurfaceY } from './level';
import { smoothGroundY, isInHill, type HillSpec } from './terrain';

export class Physics {
  tiles: TileType[][];
  worldWidth: number;
  worldHeight: number;
  terrainHills: HillSpec[] = [];
  // Oberflächen-Wasser (Billabongs/Teiche) ist in Plattform-Welten eine
  // überspringbare Gefahr (reinfallen = Treffer wie Lava). NUR in der
  // Unterwasser-Welt (Schwimm-Level) ist Wasser das Medium und keine Gefahr —
  // dort bleibt dieses Flag false.
  waterHazard = false;

  constructor(tiles: TileType[][], worldWidth: number, worldHeight: number) {
    this.tiles = tiles;
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
  }

  getTile(col: number, row: number): TileType {
    if (row < 0 || row >= this.tiles.length || col < 0 || col >= this.tiles[0].length) {
      return TileType.EMPTY;
    }
    return this.tiles[row][col];
  }

  setTile(col: number, row: number, type: TileType) {
    if (row >= 0 && row < this.tiles.length && col >= 0 && col < this.tiles[0].length) {
      this.tiles[row][col] = type;
    }
  }

  isSolid(col: number, row: number): boolean {
    return isSolidForCollision(this.getTile(col, row));
  }

  isOneWay(col: number, row: number): boolean {
    return isOneWayPlatform(this.getTile(col, row));
  }

  isSlope(col: number, row: number): boolean {
    return isSlopeTile(this.getTile(col, row));
  }

  isIce(col: number, row: number): boolean {
    const t = this.getTile(col, row);
    return t === TileType.ICE || t === TileType.ICE_TOP;
  }

  isHazard(col: number, row: number): boolean {
    const t = this.getTile(col, row);
    if (t === TileType.LAVA || t === TileType.LAVA_TOP || t === TileType.SPIKE) return true;
    // Oberflächen-Wasser als Gefahr (außer im Unterwasser-Level).
    if (this.waterHazard && (t === TileType.WATER_TOP || t === TileType.WATER)) return true;
    return false;
  }

  // Returns true if any tile in the entity's hitbox is a hazard tile,
  // OR if a hazard sits on the entity's swept path between (x,y) and
  // (x-velX, y-velY). The swept check guarantees that a fast entity
  // (e.g. a player diving onto a spike at MAX_FALL_SPEED) cannot
  // "tunnel" through a single-tile-wide hazard between frames.
  intersectsHazard(entity: Entity): boolean {
    if (this.hazardAt(entity.x, entity.y, entity.width, entity.height)) return true;
    // Sweep along the *previous* trajectory. Splits the velocity into
    // sub-tile chunks and tests each intermediate AABB. Cheap because
    // we only enter the loop when velocity exceeds half a tile.
    const vx = entity.velX;
    const vy = entity.velY;
    const maxComp = Math.max(Math.abs(vx), Math.abs(vy));
    const half = TILE_SIZE / 2;
    if (maxComp <= half) return false;
    const steps = Math.ceil(maxComp / half);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const sx = entity.x - vx * t;
      const sy = entity.y - vy * t;
      if (this.hazardAt(sx, sy, entity.width, entity.height)) return true;
    }
    return false;
  }

  private hazardAt(x: number, y: number, w: number, h: number): boolean {
    // skin=0: any pixel of overlap registers. We err on the side of
    // detection here because the previous skin=1 forgiveness allowed
    // a player landing on a spike-tile boundary to walk away unharmed.
    const leftCol = Math.floor(x / TILE_SIZE);
    const rightCol = Math.floor((x + w - 0.01) / TILE_SIZE);
    const topRow = Math.floor(y / TILE_SIZE);
    const bottomRow = Math.floor((y + h - 0.01) / TILE_SIZE);
    for (let row = topRow; row <= bottomRow; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isHazard(col, row)) return true;
      }
    }
    return false;
  }

  // Substep collision to avoid tunneling at high speeds (e.g. apex of jump,
  // long fall, kicked shells). We split the move into chunks of <= TILE_SIZE - 1.
  // wallDir: -1 if the entity hit a wall on its LEFT side this frame, +1 on
  // its RIGHT side, 0 if no wall contact. Used by the player for wall-slide
  // and wall-jump detection.
  moveEntity(entity: Entity): { hitWall: boolean; hitCeiling: boolean; hitFloor: boolean; edgeDetected: boolean; onIce: boolean; wallDir: -1 | 0 | 1 } {
    let hitWall = false;
    let hitCeiling = false;
    let hitFloor = false;
    let wallDir: -1 | 0 | 1 = 0;
    const wasOnGround = entity.onGround; // pre-move ground state (for slope stick)

    const maxStep = TILE_SIZE - 2;
    const totalDx = entity.velX;
    const totalDy = entity.velY;
    const stepsX = Math.max(1, Math.ceil(Math.abs(totalDx) / maxStep));
    const stepsY = Math.max(1, Math.ceil(Math.abs(totalDy) / maxStep));
    const steps = Math.max(stepsX, stepsY);
    const dx = totalDx / steps;
    const dy = totalDy / steps;

    let lastOnGround = false;

    for (let step = 0; step < steps; step++) {
      const r = this.moveStep(entity, dx, dy, wasOnGround);
      if (r.hitWall) hitWall = true;
      if (r.hitCeiling) hitCeiling = true;
      if (r.hitFloor) hitFloor = true;
      if (r.hitFloor) lastOnGround = true;
      if (r.hitCeiling && entity.velY < 0) entity.velY = 0;
      // Latest non-zero wall contact wins so the wall-slide flag tracks the
      // side the entity is currently pressing into.
      if (r.wallDir !== 0) wallDir = r.wallDir;
      if (r.hitWall) {
        // Don't keep stepping into the wall.
      }
    }

    // Slopes: non-solid for AABB, resolved here via a per-tile height map.
    // Lifts the entity onto an ascending slope and sticks it to a descending
    // one so it walks smoothly instead of clipping in or hopping off.
    if (this.resolveSlopeCollision(entity, wasOnGround)) {
      hitFloor = true;
    }

    // Glatte Hügel: gekrümmte Höhenkurve, hebt/hält die Figur auf der Kurve.
    if (this.resolveSmoothHills(entity, wasOnGround)) {
      hitFloor = true;
    }

    // Kanten-Fall-Anschub (nur Player): Verliert die laufende Figur diesen Frame
    // den Boden (volle Breite → Füße ganz über der Lücke), bekommt der Fall einen
    // kleinen Startschub nach unten, damit er SOFORT sichtbar einsetzt statt über
    // mehrere Frames anzulaufen (sonst läuft sie weit über die Kante, bevor man sie
    // fallen sieht). KEIN y-Versatz → kein Durchsacken durch den Block; greift erst,
    // wenn die Figur ohnehin frei über der Lücke ist (Hügelkurve ausgenommen, da
    // trägt sie weiter). Nur in Bewegung → am Rand still stehen bleibt ruhig.
    const CORNER_FALL_KICK = 2.0;
    if (
      wasOnGround && !entity.onGround &&
      entity.velY >= 0 && entity.velY < CORNER_FALL_KICK &&
      Math.abs(entity.velX) > 0.5 &&
      (entity as Entity & { cornerCorrect?: boolean }).cornerCorrect === true
    ) {
      entity.velY = CORNER_FALL_KICK;
    }

    // Edge-detection (robust window): for ground enemies that walk off pits,
    // sample a small look-ahead window (the front foot AND one tile further
    // in the movement direction) so the enemy turns BEFORE its center
    // crosses the edge. This avoids the brittle single-pixel probe that
    // missed pits when velX was small / the foot straddled a tile boundary.
    let edgeDetected = false;
    let onIce = false;
    if (entity.onGround && entity.velX !== 0) {
      const dir = entity.velX < 0 ? -1 : 1;
      const skin = 0.5;
      const frontX = dir < 0
        ? entity.x + skin
        : entity.x + entity.width - skin - 0.01;
      const frontCol = Math.floor(frontX / TILE_SIZE);
      const lookAheadCol = frontCol + dir;
      const belowRow = Math.floor((entity.y + entity.height + 2) / TILE_SIZE);
      if (!this.isSolid(frontCol, belowRow) && !this.isSolid(lookAheadCol, belowRow)) {
        // In einer Hügel-Zone trägt die glatte Kurve den Boden — kein Abgrund,
        // auch wenn dort kein solides Tile liegt. Sonst dreht der Gegner am
        // Hügelfuß fälschlich um.
        const frontInHill = isInHill(this.terrainHills, (frontCol + 0.5) * TILE_SIZE);
        const aheadInHill = isInHill(this.terrainHills, (lookAheadCol + 0.5) * TILE_SIZE);
        if (!frontInHill && !aheadInHill) {
          edgeDetected = true;
        }
      }
    }

    if (entity.onGround) {
      const leftCol = Math.floor((entity.x + 1) / TILE_SIZE);
      const rightCol = Math.floor((entity.x + entity.width - 1.01) / TILE_SIZE);
      const belowRow = Math.floor((entity.y + entity.height + 1) / TILE_SIZE);
      if (this.isIce(leftCol, belowRow) || this.isIce(rightCol, belowRow)) {
        onIce = true;
      }
    }

    if (entity.x < 0) {
      entity.x = 0;
      entity.velX = 0;
      hitWall = true;
      wallDir = -1;
    }
    if (entity.x + entity.width > this.worldWidth * TILE_SIZE) {
      entity.x = this.worldWidth * TILE_SIZE - entity.width;
      entity.velX = 0;
      hitWall = true;
      wallDir = 1;
    }

    if (lastOnGround) entity.onGround = true;

    return { hitWall, hitCeiling, hitFloor, edgeDetected, onIce, wallDir };
  }

  private moveStep(entity: Entity, dx: number, dy: number, wasOnGround = false): { hitWall: boolean; hitCeiling: boolean; hitFloor: boolean; wallDir: -1 | 0 | 1 } {
    let hitWall = false;
    let hitCeiling = false;
    let hitFloor = false;
    let wallDir: -1 | 0 | 1 = 0;
    const skinWidth = 0.5;

    // Capture state BEFORE the horizontal move so an opt-in auto-step
    // (≤ 4 px) can rescue the move when the entity slams into a tiny
    // floor seam while grounded. Without this, micro-bumps between
    // adjacent tiles can momentarily zero a sprint.
    const startY = entity.y;
    const startVelX = entity.velX;
    const startOnGround = entity.onGround;

    entity.x += dx;
    const desiredX = entity.x;

    {
      const leftCol = Math.floor((entity.x + skinWidth) / TILE_SIZE);
      const rightCol = Math.floor((entity.x + entity.width - skinWidth - 0.01) / TILE_SIZE);
      const topRow = Math.floor((entity.y + skinWidth) / TILE_SIZE);
      const bottomRow = Math.floor((entity.y + entity.height - skinWidth - 0.01) / TILE_SIZE);
      // In Hügel-Zonen trägt die glatte Kurve den Boden. Eine solide Kachel,
      // deren Oberkante AUF oder UNTER der Hügelkurve liegt, ist Hügel-Untergrund
      // und darf horizontal NICHT blockieren — sonst bleibt die Figur beim
      // Bergab-Laufen an der Untergrund-Kachel hängen, bevor resolveSmoothHills
      // sie vertikal auf die Kurve hebt. Kacheln ÜBER der Kurve (echte
      // Hindernisse) wirken weiterhin als Wand.
      const hillSurfaceY = this.terrainHills.length
        ? smoothGroundY(this.terrainHills, entity.x + entity.width / 2)
        : null;
      for (let row = topRow; row <= bottomRow; row++) {
        for (let col = leftCol; col <= rightCol; col++) {
          if (this.isSolid(col, row)) {
            if (hillSurfaceY !== null && row * TILE_SIZE >= hillSurfaceY - 0.01) continue;
            if (dx > 0) {
              entity.x = col * TILE_SIZE - entity.width;
              hitWall = true;
              wallDir = 1;
            } else if (dx < 0) {
              entity.x = (col + 1) * TILE_SIZE;
              hitWall = true;
              wallDir = -1;
            }
            entity.velX = 0;
          }
        }
      }
    }

    // Auto-step: opt-in via entity.autoStep. Only kicks in when grounded
    // and the obstacle is short enough that lifting the AABB by ≤ 4 px
    // clears it. We keep the original horizontal velocity so the player
    // doesn't perceive a stall.
    if (
      hitWall &&
      startOnGround &&
      dx !== 0 &&
      (entity as Entity & { autoStep?: boolean }).autoStep === true
    ) {
      for (let stepH = 1; stepH <= 4; stepH++) {
        const liftedY = startY - stepH;
        if (this.canFitAt(desiredX, liftedY, entity.width, entity.height)) {
          entity.x = desiredX;
          entity.y = liftedY;
          entity.velX = startVelX;
          hitWall = false;
          wallDir = 0;
          break;
        }
      }
    }

    const preFeetY = entity.y + entity.height; // feet position before this Y move
    entity.y += dy;
    entity.onGround = false;

    // Bumped-head corner correction: BEFORE resolving a ceiling hit, if the
    // entity is rising and only a small sliver of its head clips a block
    // corner, nudge it sideways so it slips past instead of having its jump
    // killed. Opt-in via entity.cornerCorrect (player only).
    if (dy < 0 && (entity as Entity & { cornerCorrect?: boolean }).cornerCorrect === true) {
      this.tryHeadCornerCorrect(entity);
    }
    // Landing edge forgiveness: while descending, if the feet just barely
    // miss a solid ledge (within a few px), nudge onto it so a near-miss
    // landing still connects. Same opt-in flag (player only).
    if (dy > 0 && (entity as Entity & { cornerCorrect?: boolean }).cornerCorrect === true) {
      this.tryLedgeLandCorrect(entity);
    }

    {
      // Boden-/Decken-Kollision über die VOLLE Fußbreite. So fällt die Figur erst,
      // wenn ihre Füße den Block wirklich verlassen — sie sinkt nie durch den Block
      // (kein vorzeitiges Abkippen mit der hinteren Hälfte noch über dem Block) und
      // bleibt am Rand stehend stabil (kein Zittern). Pixelgenauer, sauberer Abgang.
      const leftCol = Math.floor((entity.x + skinWidth) / TILE_SIZE);
      const rightCol = Math.floor((entity.x + entity.width - skinWidth - 0.01) / TILE_SIZE);
      const topRow = Math.floor(entity.y / TILE_SIZE);
      const bottomRow = Math.floor((entity.y + entity.height - 0.01) / TILE_SIZE);
      for (let row = topRow; row <= bottomRow; row++) {
        for (let col = leftCol; col <= rightCol; col++) {
          if (this.isSolid(col, row)) {
            if (dy > 0) {
              entity.y = row * TILE_SIZE - entity.height;
              const landedTile = this.getTile(col, row);
              if (landedTile === TileType.NOTE_BLOCK && entity.type === EntityType.PLAYER) {
                // Sprungfeder: katapultiert die Spielerin nach oben, statt sie
                // landen zu lassen. onGround bleibt false, damit sie sofort
                // wieder steigt. Das Flag triggert Sound + Partikel im Engine.
                entity.velY = NOTE_BLOCK_BOUNCE_FORCE;
                (entity as Entity & { noteBounceThisFrame?: boolean }).noteBounceThisFrame = true;
                (entity as Entity & { noteBounceCol?: number }).noteBounceCol = col;
                (entity as Entity & { noteBounceRow?: number }).noteBounceRow = row;
                hitFloor = true;
              } else {
                entity.velY = 0;
                hitFloor = true;
                entity.onGround = true;
              }
            } else if (dy < 0) {
              entity.y = (row + 1) * TILE_SIZE;
              entity.velY = 0;
              hitCeiling = true;
            }
          }
        }
      }
    }

    // One-way (semisolid) platforms: catch the entity only when DESCENDING
    // and its feet crossed the platform's top surface this step — so you can
    // jump up THROUGH them and only land when coming down. Holding the drop
    // flag (Down) lets the player fall through. Applies to all entities, so
    // enemies rest on them too.
    if (dy > 0 && !hitFloor && !(entity as Entity & { dropThrough?: boolean }).dropThrough) {
      const feetY = entity.y + entity.height;
      const footRow = Math.floor((feetY - 0.01) / TILE_SIZE);
      const leftCol = Math.floor((entity.x + skinWidth) / TILE_SIZE);
      const rightCol = Math.floor((entity.x + entity.width - skinWidth - 0.01) / TILE_SIZE);
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isOneWay(col, footRow)) {
          const platformTop = footRow * TILE_SIZE;
          if (preFeetY <= platformTop + 1 && feetY > platformTop) {
            entity.y = platformTop - entity.height;
            entity.velY = 0;
            hitFloor = true;
            entity.onGround = true;
            break;
          }
        }
      }
    }

    return { hitWall, hitCeiling, hitFloor, wallDir };
  }

  // Bumped-head corner correction. When `entity` is moving up and only a
  // small horizontal sliver of its head clips a block corner (every other
  // head column is open), nudge it sideways past the corner so the jump
  // continues — the classic "you clearly meant to make that gap" fairness.
  // Guarded by canFitAt so we never nudge into a wall. Returns true if a
  // nudge was applied.
  private tryHeadCornerCorrect(entity: Entity): boolean {
    const skin = 0.5;
    const MAX = 10; // largest clip we forgive (px). Leicht großzügiger als
    // zuvor (8) — Celeste-Stil-Forgiveness gegen „Kopf-Bonk" an Plattform-
    // ecken. Knapp ein Drittel Kachel; verhindert hängenbleiben beim Sprung
    // durch enge Lücken, ohne echte Decken zu „durchlöchern".
    const headRow = Math.floor(entity.y / TILE_SIZE);
    const leftX = entity.x + skin;
    const rightX = entity.x + entity.width - skin - 0.01;
    const leftCol = Math.floor(leftX / TILE_SIZE);
    const rightCol = Math.floor(rightX / TILE_SIZE);
    if (leftCol === rightCol) return false; // fully under one tile → real ceiling

    const leftSolid = this.isSolid(leftCol, headRow);
    const rightSolid = this.isSolid(rightCol, headRow);

    // Münz-/Ziegel-Blöcke NICHT wegkorrigieren: sie sollen angestoßen werden,
    // sobald der Kopf sie berührt — auch wenn die Figur nicht exakt mittig
    // darunter steht (mehr Toleranz beim Block-Anstoß, User-Wunsch).
    const bumpable = (t: TileType) => t === TileType.QUESTION_BLOCK || t === TileType.BRICK;
    if ((leftSolid && bumpable(this.getTile(leftCol, headRow))) ||
        (rightSolid && bumpable(this.getTile(rightCol, headRow)))) {
      return false;
    }

    // Left corner clipped, everything to its right open → slip right.
    if (leftSolid && !rightSolid) {
      let interiorClear = true;
      for (let c = leftCol + 1; c <= rightCol; c++) {
        if (this.isSolid(c, headRow)) { interiorClear = false; break; }
      }
      if (interiorClear) {
        const penetration = (leftCol + 1) * TILE_SIZE - leftX;
        if (penetration > 0 && penetration <= MAX) {
          const newX = entity.x + penetration + 0.01;
          if (this.canFitAt(newX, entity.y, entity.width, entity.height)) {
            entity.x = newX;
            return true;
          }
        }
      }
    }

    // Right corner clipped, everything to its left open → slip left.
    if (rightSolid && !leftSolid) {
      let interiorClear = true;
      for (let c = leftCol; c <= rightCol - 1; c++) {
        if (this.isSolid(c, headRow)) { interiorClear = false; break; }
      }
      if (interiorClear) {
        const penetration = rightX - rightCol * TILE_SIZE;
        if (penetration > 0 && penetration <= MAX) {
          const newX = entity.x - penetration - 0.01;
          if (this.canFitAt(newX, entity.y, entity.width, entity.height)) {
            entity.x = newX;
            return true;
          }
        }
      }
    }

    return false;
  }

  // Landing edge forgiveness (mirror of the head correction, for the feet).
  // While descending, if the feet would just barely miss a solid ledge to
  // one side (gap ≤ SNAP px) while sitting over empty space, nudge onto the
  // ledge so a near-miss landing connects. Guarded by canFitAt on the body
  // ABOVE the landing surface, so it never shoves into a wall. Returns true
  // if a nudge was applied.
  private tryLedgeLandCorrect(entity: Entity): boolean {
    const skin = 0.5;
    const SNAP = 5; // largest near-miss we forgive (px)
    const feetY = entity.y + entity.height;
    const footRow = Math.floor((feetY - 0.01) / TILE_SIZE);
    const leftX = entity.x + skin;
    const rightX = entity.x + entity.width - skin - 0.01;
    const leftCol = Math.floor(leftX / TILE_SIZE);
    const rightCol = Math.floor(rightX / TILE_SIZE);

    // Only assist when the feet sit over empty space — a genuine miss.
    for (let c = leftCol; c <= rightCol; c++) {
      if (this.isSolid(c, footRow)) return false;
    }
    const bodyH = footRow * TILE_SIZE - entity.y; // body above the landing surface

    // Never nudge against the direction of travel — otherwise a player walking
    // off a block narrower than their body gets yanked back onto it every
    // frame (infinite trap). Only assist toward a ledge being approached.
    const movingRight = entity.velX > 0.1;
    const movingLeft = entity.velX < -0.1;

    // Ledge just past the RIGHT edge → nudge right onto it.
    if (!movingLeft && this.isSolid(rightCol + 1, footRow)) {
      const gap = (rightCol + 1) * TILE_SIZE - rightX;
      if (gap > 0 && gap <= SNAP) {
        const newX = entity.x + gap + 0.01;
        if (bodyH <= 0 || this.canFitAt(newX, entity.y, entity.width, bodyH)) {
          entity.x = newX;
          return true;
        }
      }
    }
    // Ledge just past the LEFT edge → nudge left onto it.
    if (!movingRight && this.isSolid(leftCol - 1, footRow)) {
      const gap = leftX - leftCol * TILE_SIZE;
      if (gap > 0 && gap <= SNAP) {
        const newX = entity.x - gap - 0.01;
        if (bodyH <= 0 || this.canFitAt(newX, entity.y, entity.width, bodyH)) {
          entity.x = newX;
          return true;
        }
      }
    }
    return false;
  }

  // Resolve a 45° slope under the entity via its height map. Lifts the entity
  // onto an ascending slope it penetrated, and sticks a grounded entity to a
  // descending slope so it follows the surface instead of hopping off. Slopes
  // are non-solid for the AABB pass, so this is the only thing holding the
  // entity up on them. Returns true if it ended up resting on a slope.
  private resolveSlopeCollision(entity: Entity, wasOnGround: boolean): boolean {
    if (entity.velY < -0.5) return false; // clearly rising/jumping → let go

    const centerX = entity.x + entity.width / 2;
    const col = Math.floor(centerX / TILE_SIZE);
    const localX = centerX - col * TILE_SIZE;
    const feetY = entity.y + entity.height;
    const feetRow = Math.floor(feetY / TILE_SIZE);
    const STICK = 10; // px below the feet we still snap up a descending slope

    // Check the feet row first, then the rows just below/above for fast motion.
    for (const row of [feetRow, feetRow + 1, feetRow - 1]) {
      const t = this.getTile(col, row);
      if (!isSlopeTile(t)) continue;
      const surfaceY = slopeSurfaceY(t, col, row, localX);

      if (feetY >= surfaceY) {
        // Penetrating the slope → lift onto the surface.
        entity.y = surfaceY - entity.height;
        entity.velY = 0;
        entity.onGround = true;
        return true;
      }
      if (wasOnGround && feetY >= surfaceY - STICK) {
        // Walking downhill: feet just above the descending surface → stick.
        entity.y = surfaceY - entity.height;
        entity.velY = 0;
        entity.onGround = true;
        return true;
      }
      return false; // airborne above this slope → leave it alone
    }
    return false;
  }

  // Glatte Hügel über eine gekrümmte Höhenkurve auflösen — analog zu den
  // Slopes, aber die Oberflächen-Höhe kommt aus smoothGroundY (beliebige
  // sanfte Steigung statt fester 45°). Hebt die Figur auf einen ansteigenden
  // Hügel und hält sie auf einem abfallenden, damit sie der Kurve folgt.
  private resolveSmoothHills(entity: Entity, wasOnGround: boolean): boolean {
    if (this.terrainHills.length === 0) return false;
    if (entity.velY < -0.5) return false; // steigt/springt → loslassen
    const centerX = entity.x + entity.width / 2;
    // Bodenhöhe am MITTELPUNKT der Hitbox abtasten — dort steht der gezeichnete
    // (mittig verankerte) Fuß. So sitzt die Figur pixelgenau auf der Kurve,
    // statt am höchsten Punkt unter der Hitbox über der gezeichneten Oberfläche
    // zu „schweben". Fällt der Mittelpunkt aus der Hügelzone, tragen die
    // Randpunkte als Fallback (Hügelanfang/-ende).
    const sMid = smoothGroundY(this.terrainHills, centerX);
    const sLeft = smoothGroundY(this.terrainHills, entity.x + 2);
    const sRight = smoothGroundY(this.terrainHills, entity.x + entity.width - 2);
    const surfaceY = sMid ?? sLeft ?? sRight;
    if (surfaceY === null) return false;
    const feetY = entity.y + entity.height;
    // Trägt ein solider Block die Füße direkt? Dann hat die normale Block-
    // Kollision Vorrang — die glatte Hügelkurve darf die Figur nicht über den
    // Block heben (Schweben) oder in ihn hineinziehen. Verhindert das "ein paar
    // Pixel über dem Block"-Schweben, wenn die Kurve knapp über einer Block-
    // Oberkante verläuft. Auf der Kurve selbst (über dem Boden) ist diese Tile
    // leer, also bleibt das normale Hügelverhalten unberührt.
    const footCol = Math.floor(centerX / TILE_SIZE);
    const footRow = Math.floor((feetY + 0.5) / TILE_SIZE);
    const STICK = 16; // px unter den Füßen, bis zu denen wir bergab anschnappen
    const FLOAT_EPS = 4; // nur echtes Schweben-Artefakt (Kurve ~2px über Block) schützen
    // Block-Vorrang NUR, wenn der tragende Block die Füße praktisch auf Kurvenhöhe
    // hält (echtes Schweben-Artefakt). Schon ab wenigen px Kurve über dem Boden ist
    // es der Hügel-BASIS-Boden — dann MUSS die Kurve tragen, sonst schneiden die
    // Füße am Hügelfuß in den Berg (Lift setzte sonst erst spät ein).
    if (this.isSolid(footCol, footRow) && feetY - surfaceY < FLOAT_EPS) return false;
    if (feetY >= surfaceY) {
      entity.y = surfaceY - entity.height;
      entity.velY = 0;
      entity.onGround = true;
      return true;
    }
    if (wasOnGround && feetY >= surfaceY - STICK) {
      entity.y = surfaceY - entity.height;
      entity.velY = 0;
      entity.onGround = true;
      return true;
    }
    return false;
  }

  checkTileAt(x: number, y: number): TileType {
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    return this.getTile(col, row);
  }

  // Returns true if the given AABB does NOT overlap any solid tile.
  // Used by the player to refuse to un-duck under a low ceiling.
  canFitAt(x: number, y: number, width: number, height: number): boolean {
    const skin = 0.5;
    const leftCol = Math.floor((x + skin) / TILE_SIZE);
    const rightCol = Math.floor((x + width - skin - 0.01) / TILE_SIZE);
    const topRow = Math.floor(y / TILE_SIZE);
    const bottomRow = Math.floor((y + height - 0.01) / TILE_SIZE);
    for (let row = topRow; row <= bottomRow; row++) {
      for (let col = leftCol; col <= rightCol; col++) {
        if (this.isSolid(col, row)) return false;
      }
    }
    return true;
  }
}
