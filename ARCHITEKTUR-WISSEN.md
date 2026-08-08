# Architektur & Wissen — Lea und Fiona

Verdichtetes Referenzwissen, damit ein neuer Chat sofort produktiv ist.

## Verzeichnis-Landkarte
```
client/src/
  game/
    constants.ts          Physik, TileType, EntityType, ThemeName, Direction
    physics.ts            Kollision/Bewegung (Physics(tiles,W,H) = Tile-Anzahl)
    terrain.ts            smoothGroundY(hills,worldX), HillSpec
    level.ts              LEVELS[1..13], groundRowOf, isSolidForCollision, isOneWayPlatform
    levelHelpers.ts       bindHelpers, bindCoinHelpers, buildUndergroundRoom
    engine.ts             Hauptloop, spawnDust, shakeCamera, acquireFloatingText,
                          trackFunnel, finalizeLevelComplete, startLevel
    input.ts              InputManager (Getter + Touch-Flags, dashPressed)
    audio.ts              THEMES pro ThemeName, playSfx(name,pan,pitchMul)
    assets/beraterSprites.ts  Base64-Sprites Welt-13-Figur (autark)
    levels/<name>.ts      je create<Name>Level(): LevelData  (bluefield.ts = Welt 13)
    entities/
      player.ts           handleInput(), applyX(), Dash-Zustand
      enemies.ts          Gegner-Klassen
    engine_internal/
      render.ts           Render-Orchestrierung + Bodenband (renderTerrainHills),
                          Theme-Paletten, Ambient, Player-Zeichnung + Dash-Afterimage
      player_collisions.ts runEntityCollisions + Power-Up-Aufnahme (Namen/Labels)
    renderer.ts           Renderer-Klasse: fiona/lea/beraterFrames (+DuckArr),
                          loadFrame, time, viewport, currentTheme
    renderer/
      backgrounds.ts      Himmel je Theme, drawProbe, Ambiente-Marker, Werte-Billboards
      signs.ts            drawSignText / drawTerminalSign (bluefield //-Panels)
      hud.ts              drawHUD, drawLevelComplete (Sterne/Bestwert/CTA), drawBluefieldBoot
      items.ts            Power-Up-Items (drawShield mit bluefield DSGVO-Schild)
      enemies-core.ts     drawGoomba (Bug), drawKoopa (Legacy-System)
      enemies-extra.ts    drawBombOmb (schlechte Idee)
      player.ts           drawPlayer / drawPlayerSprite (12-Frame-Auswahl, useBerater)
      tiles-jungle.ts     drawGroundTile (bluefield blauer Zweig)
  pages/game.tsx          Startbildschirm (Zwei-Schritt-Flow), Touch-Controls, CSS
  tools/
    pipeline-check.mjs    Qualitäts-Gate (ERGEBNIS: PASS)
    level-guards.mts      Struktur-Guards (SUMME: 0 WARN, 4 INFO)
```

## Zustands-/Render-Fluss (grob)
`engine.update` → `player.handleInput(input)` (setzt velX/velY; Dash-Override am Ende) → `physics.moveEntity` (Position) → `engine_internal/render.ts` (Hintergrund → Bodenband/Tiles → Entities → Signs → Player(+Afterimage) → HUD/Boot-Intro).

## Player-Sprite-System (zentrale Erkenntnis)
- Spieler = **12 Artwork-Frames** (0 stand · 2 runA · 4 runB · 6 absprung · 8 luft · 10 landung + Blends) + Duck-Sprite.
- Renderer-Felder `fionaFrames`(12)/`leaFrames`(8)/`beraterFrames`(12) + `*DuckArr`. Geladen via `loadFrame(url,arr,idx)` — **Base64-Data-URLs funktionieren als `img.src`** (→ autark).
- `drawPlayerSprite`: `useBerater = currentTheme==='bluefield'` wählt das Set; `pickPlayerFrame`+`walkBlend` liefern Frame+Überblendung; **pro-Bild-Aspect** (Z.509), feet-anchored, squash/tilt/leg-hop.
- Richtung: Default-Orientierung RECHTS; `if (direction<0) ctx.scale(-1,1)` spiegelt. Berater-Uploads waren LINKS → beim Einbetten horizontal geflippt.

## Welt-13-Geometrie (bluefield.ts)
- Hügel: 8–22, 40–58, 108–134(peak 3.6). Lücken: 76–78, 87–89, 99–101. Checkpoint 73, Flagge 137.
- Q-Blöcke: heart@6, fire@14(g-6), cape@50(g-6), shield@74, shield@106, super@124(g-8).
- specialCoins/Proben: 24/52/88. Signs: 4/26/34/62/69/82/92/104. Gegner: GOOMBA 18/27/60/87/93/116, KOOPA 44, BOMB_OMB 82.

## Wichtige Lektionen (teuer gelernt)
1. **groundRowOf-Falle:** in Welten mit Untergrund-Räumen liefert `groundRowOf` height-2 (nicht die echte Lauf-Oberfläche). Guards/Audits, die das ignorieren, produzieren massenhaft Fehlalarme. Für Hügel/Kopf-Checks IMMER `smoothGroundY` je Spalte nutzen — und keinen verrauschten Guard ausliefern.
2. **Kopf-Hänger über Hügeln:** Blöcke auf fester Höhe (row 8/9) können über einem Hügel auf Kopfhöhe geraten → Figur bleibt beim Durchrennen hängen. Fix: Blöcke relativ zur Hügel-Oberfläche anheben (Ziel: `row ≤ surf-3.5` für Kopf-Freiheit, `row ≥ surf-4.4` für Sprung-Erreichbarkeit).
3. **Gras/Shimmer:** Halme aus EINER Quelle (Bodenband, Ebene==Hügel identisch), Sampling auf festes Welt-Raster (`Math.ceil(x/6)*6`) — sonst Flimmern bei schneller Bewegung.
4. **Inline-Styles schlagen CSS-Klassen:** Hover-Effekte auf Elementen mit Inline-`boxShadow` über `transform`/`filter` lösen (nicht box-shadow), sonst greift die Klassenregel nicht.
5. **Additive Animationen:** zwei CSS-Animationen auf demselben Element gehen nur, wenn sie verschiedene Properties animieren (z. B. `background-position` + `transform`). Für Laufbewegung (translateX) + Hüpfer (translateY) → Wrapper-Struktur.
6. **Autarkie:** externe Asset-Dateien brechen die Standalone-HTML. Große Bilder als Base64-Data-URLs in ein TS-Modul einbetten (immer inline). Autarkie-Check muss 0 bleiben.
7. **tsx-Tests oft falsch-positiv:** vor Bug-Meldung Einzelfall-Debug (falsche Spawn-y, falsche Test-Ebene, unvollständiger Mock).
8. **`grep -c` = Exit 1 bei 0 Treffern:** Pipeline-Befehle mit `;` statt `&&` trennen.

## Bluefield-Design-Sprache
Terminal/Labor: `// code-kommentar`, Boot-Sequenz, „Schleuse/Zutritt", „Proben unter Glas". Navy + #1E48D6 + Status-Akzente (grün live · amber build · cyan plan). 💡 Ideen / 💣 schlechte Ideen.
