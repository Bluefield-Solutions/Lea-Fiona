import { EntityType, PARTICLE_GRAVITY, PARTICLE_LIFETIME, TILE_SIZE, GRAVITY_FALLING, MAX_FALL_SPEED } from '../constants';
import { Entity } from './base';

// Bewegliche Plattform: pendelt auf einer Achse (horizontal oder vertikal)
// zwischen Ursprung und Ursprung+range hin und her. Die Spielerin kann von
// oben darauf landen (semisolid) und wird mitgetragen — die Carry-Physik
// liegt in der Engine (nach dem Plattform-Schritt). prevX/prevY merken die
// Position vor dem Schritt, sodass die Engine das Bewegungs-Delta kennt.
export class MovingPlatform extends Entity {
  axis: 'h' | 'v';
  range: number;
  speed: number;
  origin: number;
  dir = 1;
  prevX: number;
  prevY: number;

  constructor(x: number, y: number, widthTiles: number, axis: 'h' | 'v', range: number, speed: number) {
    super(x, y, widthTiles * TILE_SIZE, Math.round(TILE_SIZE * 0.5), EntityType.MOVING_PLATFORM);
    this.axis = axis;
    this.range = range;
    this.speed = speed;
    this.origin = axis === 'h' ? x : y;
    this.prevX = x;
    this.prevY = y;
  }

  update(_dt: number) {
    this.prevX = this.x;
    this.prevY = this.y;
    let pos = this.axis === 'h' ? this.x : this.y;
    pos += this.dir * this.speed;
    if (pos >= this.origin + this.range) { pos = this.origin + this.range; this.dir = -1; }
    else if (pos <= this.origin) { pos = this.origin; this.dir = 1; }
    if (this.axis === 'h') this.x = pos; else this.y = pos;
  }

  get deltaX() { return this.x - this.prevX; }
  get deltaY() { return this.y - this.prevY; }
}

// Sprungfeder: statisches, platzierbares Objekt. Landet die Spielerin von oben
// darauf, wird sie hoch katapultiert (Launch-Logik in der Engine). `compress`
// (0..1) treibt die Stauch-Animation beim Auslösen; `cooldown` verhindert
// Mehrfach-Trigger im selben Kontakt.
export class Spring extends Entity {
  compress = 0;
  cooldown = 0;

  constructor(x: number, y: number) {
    // Halbe Kachelhöhe, sitzt auf der Bodenkante; y wird beim Spawn so gesetzt,
    // dass die Oberkante bündig auf dem Boden steht.
    super(x, y, TILE_SIZE, Math.round(TILE_SIZE * 0.5), EntityType.SPRING_STONE);
  }

  update(_dt: number) {
    if (this.cooldown > 0) this.cooldown--;
    // Stauch-Animation klingt weich ab.
    if (this.compress > 0) this.compress = Math.max(0, this.compress - 0.12);
  }

  trigger() {
    this.compress = 1;
    this.cooldown = 8;
  }
}

// Schalter (P_SWITCH): flacher Boden-Button. Wird er von oben betreten/gestampft,
// öffnet die Engine alle verknüpften Türen. `pressed` treibt die Druck-Animation.
export class Switch extends Entity {
  pressed = false;
  group: number;
  constructor(x: number, y: number, group = 0) {
    super(x, y, TILE_SIZE, Math.round(TILE_SIZE * 0.4), EntityType.P_SWITCH);
    this.group = group;
  }
  update(_dt: number) { this.frame++; }
}

// Tür/Tor (DOOR): solide Barriere (1 Kachel breit, mehrere hoch). Solange
// `open` false ist, blockiert sie die Spielerin wie eine Wand. Aktiviert der
// verknüpfte Schalter, öffnet sie sich (gleitet nach oben und wird nicht-solide).
export class Door extends Entity {
  open = false;
  openTimer = 0;        // Frames seit Öffnen (Gleit-Animation)
  group: number;
  fullHeight: number;
  originY: number;
  constructor(x: number, y: number, heightTiles: number, group = 0) {
    super(x, y, TILE_SIZE, heightTiles * TILE_SIZE, EntityType.DOOR);
    this.group = group;
    this.fullHeight = heightTiles * TILE_SIZE;
    this.originY = y;
  }
  update(_dt: number) {
    this.frame++;
    if (this.open && this.openTimer < 24) {
      this.openTimer++;
      // Gleitet in den Boden ab (Tor öffnet sich, Weg wird frei).
      this.y = this.originY + (this.fullHeight * this.openTimer) / 24;
    }
  }
  get doorSolid(): boolean { return !this.open; }
}

// Feuer-Barriere (FIRE_BARRIER): eine brennbare Ranken-/Dornenwand (1 Kachel
// breit, mehrere hoch), die den Weg solide blockiert — NUR ein Feuerball der
// Spielerin brennt sie weg. Ohne die Feuerblume kommt man nicht vorbei → das
// Power-Up bekommt eine echte Aufgabe. `burn` treibt die Verbrenn-Animation.
export class FireBarrier extends Entity {
  fullHeight: number;
  burn = 0;              // 0 = intakt, >0 = verbrennt (Frames), bei alive=false weg
  swayPhase: number;
  constructor(x: number, y: number, heightTiles: number) {
    super(x, y, TILE_SIZE, heightTiles * TILE_SIZE, EntityType.FIRE_BARRIER);
    this.fullHeight = heightTiles * TILE_SIZE;
    this.swayPhase = (x * 0.13) % (Math.PI * 2);
  }
  update(_dt: number) { this.frame++; if (this.burn > 0) this.burn++; }
  get solid(): boolean { return this.alive && this.burn === 0; }
}

// Schiebbare, per Bodenstampfer zerstörbare Kiste. Fällt mit Schwerkraft und
// ruht auf dem Boden (Tile-Kollision macht die Engine via physics.moveEntity).
// Horizontales Schieben + Draufstehen/Blockieren löst die Engine im Player-Pass.
export class Crate extends Entity {
  constructor(x: number, y: number) {
    super(x, y, TILE_SIZE - 2, TILE_SIZE - 2, EntityType.CRATE);
  }

  update(_dt: number) {
    this.frame++;
    // Schwerkraft.
    this.velY = Math.min(MAX_FALL_SPEED, this.velY + GRAVITY_FALLING);
    // Horizontaler Push klingt aus (kein endloses Gleiten).
    this.velX *= this.onGround ? 0.5 : 0.85;
    if (Math.abs(this.velX) < 0.05) this.velX = 0;
  }
}

export class Particle extends Entity {
  color: string;
  lifetime: number;
  maxLifetime: number;
  size: number;

  constructor(x: number, y: number, velX: number, velY: number, color: string, size = 3, lifetime = PARTICLE_LIFETIME) {
    super(x, y, size, size, EntityType.PARTICLE);
    this.velX = velX;
    this.velY = velY;
    this.color = color;
    this.size = size;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
  }

  update(dt: number) {
    super.update(dt);
    this.x += this.velX;
    this.y += this.velY;
    this.velY += PARTICLE_GRAVITY;
    this.lifetime--;
    if (this.lifetime <= 0) this.alive = false;
  }

  get alpha(): number {
    return Math.max(0, this.lifetime / this.maxLifetime);
  }

  // Reset for object pooling.
  reset(x: number, y: number, velX: number, velY: number, color: string, size = 3, lifetime = PARTICLE_LIFETIME) {
    this.x = x;
    this.y = y;
    this.velX = velX;
    this.velY = velY;
    this.color = color;
    this.size = size;
    this.width = size;
    this.height = size;
    this.lifetime = lifetime;
    this.maxLifetime = lifetime;
    this.alive = true;
    this.frame = 0;
  }
}


export class FloatingText extends Entity {
  text: string;
  lifetime = 40;
  maxLifetime = 40;
  // Render scale (Game-Feel): combo numbers grow with the combo count.
  scale = 1;

  constructor(x: number, y: number, text: string, scale = 1) {
    super(x, y, 0, 0, EntityType.FLOATING_TEXT);
    this.text = text;
    this.scale = scale;
    this.velY = -2;
  }

  update(dt: number) {
    super.update(dt);
    this.y += this.velY;
    this.velY *= 0.95;
    this.lifetime--;
    if (this.lifetime <= 0) this.alive = false;
  }

  get alpha(): number {
    return Math.max(0, this.lifetime / this.maxLifetime);
  }

  // Reset for object pooling.
  reset(x: number, y: number, text: string, scale = 1) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.scale = scale;
    this.velX = 0;
    this.velY = -2;
    this.lifetime = 40;
    this.maxLifetime = 40;
    this.alive = true;
    this.frame = 0;
  }
}

