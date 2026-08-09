// Grafik-Umbau W1.4 · Welten-Farb-Grading.
//
// Pro Welt/Theme ein dezenter Farbstich, der als EIN Vollbild-Overlay mit
// globalCompositeOperation='multiply' gelegt wird. Die Farben sind bewusst
// HELL (nahe Weiß) → multiply verschiebt nur die Farbtemperatur und verdunkelt
// kaum. Alpha steuert die Stärke. Kein Self-Draw → Safari-sicher.

import type { ThemeName } from '../constants';

export interface Grade { r: number; g: number; b: number; a: number; ov?: { r: number; g: number; b: number; a: number }; }

export const WORLD_GRADE: Record<ThemeName, Grade> = {
  jungle:     { r: 240, g: 244, b: 214, a: 0.12, ov: { r: 74, g: 112, b: 48, a: 0.18 } },  // satt-grün
  cave:       { r: 198, g: 212, b: 242, a: 0.17, ov: { r: 50, g: 66, b: 104, a: 0.16 } },  // kühl-blau, tief
  sky:        { r: 255, g: 244, b: 220, a: 0.10, ov: { r: 92, g: 142, b: 202, a: 0.13 } },  // himmelblau
  beach:      { r: 255, g: 238, b: 202, a: 0.13, ov: { r: 72, g: 150, b: 150, a: 0.15 } },  // türkis-warm
  australia:  { r: 255, g: 222, b: 190, a: 0.15, ov: { r: 150, g: 88, b: 44, a: 0.17 } },   // rot-trocken
  volcano:    { r: 255, g: 214, b: 190, a: 0.15, ov: { r: 158, g: 64, b: 32, a: 0.18 } },   // glühend rot
  ice:        { r: 214, g: 236, b: 250, a: 0.15, ov: { r: 96, g: 150, b: 196, a: 0.16 } },  // kühl-cyan
  castle:     { r: 222, g: 218, b: 242, a: 0.15, ov: { r: 88, g: 76, b: 120, a: 0.16 } },   // düster-violett
  underwater: { r: 200, g: 232, b: 238, a: 0.17, ov: { r: 30, g: 116, b: 140, a: 0.18 } },  // tief blau-grün
  space:      { r: 206, g: 202, b: 234, a: 0.17, ov: { r: 66, g: 54, b: 128, a: 0.17 } },   // kosmisch-violett
  school:     { r: 253, g: 242, b: 224, a: 0.08, ov: { r: 120, g: 104, b: 78, a: 0.11 } },  // neutral-warm
  gym:        { r: 255, g: 246, b: 224, a: 0.09, ov: { r: 150, g: 118, b: 70, a: 0.12 } },   // helle Halle, warmes Tageslicht
  trampoline: { r: 244, g: 240, b: 250, a: 0.06, ov: { r: 124, g: 80, b: 140, a: 0.11 } },  // verspielt
  bluefield:  { r: 210, g: 226, b: 250, a: 0.12, ov: { r: 48, g: 88, b: 168, a: 0.12 } },   // technisch-kühl
  plush:      { r: 255, g: 240, b: 248, a: 0.12, ov: { r: 180, g: 130, b: 190, a: 0.12 } },  // weich-pastell, verträumt
  dragon:     { r: 214, g: 244, b: 220, a: 0.16, ov: { r: 30, g: 92, b: 46, a: 0.20 } },   // drachengrün, tief-höhlig
  forest:     { r: 248, g: 248, b: 242, a: 0.04, ov: { r: 96, g: 104, b: 84, a: 0.05 } },   // bewusst NAHEZU neutral — der Tag→Dämmerung→Nacht-Verlauf im Hintergrund trägt die komplette Farbstimmung; ein starker Grün-Stich würde Morgen-Blau & Abend-Gold zerstören
};
