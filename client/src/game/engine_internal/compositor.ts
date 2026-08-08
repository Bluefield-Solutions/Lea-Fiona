// ===========================================================================
// Render-Kompositor (AP 0.2)
// ---------------------------------------------------------------------------
// Dünne Kompositions-Schicht zwischen Spiellogik und konkretem Renderpfad.
// Die Spiellogik beschreibt WAS gezeichnet wird (die Layer unten); der
// Compositor entscheidet, WIE/WOHIN.
//
// Heute: reiner Pass-through — world → post direkt auf den sichtbaren
// 2D-Canvas. Kein Offscreen-Buffer, also NULL Performance-Overhead und kein
// sichtbarer Unterschied gegenüber dem bisherigen monolithischen runRender.
//
// Diese Naht existiert, damit Phase 2 (optionaler WebGL-Layer via PixiJS)
// einen GPU-Post-Pass einhängen kann, OHNE runRender oder die Layer-
// Funktionen anzufassen: Der Compositor würde dann den WORLD-Layer auf ein
// Offscreen-Render-Target zeichnen, den POST-Layer als Shader-Pass (Bloom,
// Displacement, …) darüber laufen lassen und das Ergebnis auf den sichtbaren
// Canvas presentieren. Die Layer-Reihenfolge und -Verträge bleiben dabei
// identisch.
// ===========================================================================
import type { GameEngine } from '../engine';

/** Die Render-Layer einer Frame, in Ausführungsreihenfolge. */
export interface RenderLayers {
  /** WORLD: Kamera-Shake, Parallax-Hintergrund, Tiles, Signs, Entities,
   *  Spieler, Partikel und Theme-Ambient — alles bis vor dem finalen Grade. */
  world: (engine: GameEngine) => void;
  /** POST: finaler Color-Grade (Tint + Vignette + Tilt-Shift). Phase 2 hängt
   *  hier GPU-Effekte (Bloom, Displacement) an. */
  post: (engine: GameEngine) => void;
}

export class Compositor {
  /**
   * Führt die Layer einer Frame in fester Reihenfolge aus. Frame-Setup
   * (Transform/Clear/Title) bleibt bewusst in runRender, da es vor jedem
   * Renderpfad identisch ist.
   */
  composite(engine: GameEngine, layers: RenderLayers): void {
    // ── Phase-2-Erweiterungspunkt ──────────────────────────────────────
    // Künftig (vereinfacht):
    //   this.bindOffscreen();      // WORLD auf Offscreen-Target
    //   layers.world(engine);
    //   this.runPostFX(engine);    // GPU-Bloom/Displacement statt nur Grade
    //   this.present();            // Offscreen → sichtbarer Canvas
    // Heute: direkter Durchstich auf den sichtbaren Canvas.
    layers.world(engine);
    layers.post(engine);
  }
}
