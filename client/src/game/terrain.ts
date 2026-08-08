import { TILE_SIZE } from './constants';

// Ein glatter, begehbarer Hügel: definiert über einen Spaltenbereich, der an
// beiden Rändern auf Boden-Niveau (baseRow) liegt und in der Mitte peakTiles
// Tiles hoch ansteigt. Höhe und Breite sind frei wählbar → unterschiedliche,
// sanfte Steigungen statt fester 45°-Rampen.
export interface HillSpec {
  startCol: number;  // erste Spalte (auf Boden-Niveau)
  endCol: number;    // letzte Spalte (auf Boden-Niveau)
  peakTiles: number; // Höhe der Spitze über dem Boden, in Tiles (darf float sein)
  baseRow: number;   // Boden-Bezugszeile (i.d.R. ground = height-2)
  skew?: number;     // -1..1: verschiebt die Spitze nach links/rechts (asymmetrisch)
}

// Glockenkurve: 0 an den Rändern, 1 am Scheitel, mit waagerechter Tangente an
// beiden Enden → fügt sich nahtlos und ohne Knick an den flachen Boden.
function bell(t: number, skew: number): number {
  if (t <= 0 || t >= 1) return 0;
  // skew verschiebt den Scheitel: warp t so, dass das Maximum bei 0.5+skew/2 liegt.
  const peak = 0.5 + Math.max(-0.45, Math.min(0.45, skew)) * 0.5;
  const u = t < peak ? (t / peak) * 0.5 : 0.5 + ((t - peak) / (1 - peak)) * 0.5;
  return 0.5 * (1 - Math.cos(2 * Math.PI * u));
}

// Glatte Boden-Oberkante (in Pixeln) an einer Welt-X-Position, oder null wenn
// X außerhalb aller Hügel liegt (dann gilt der normale Tile-Boden).
export function smoothGroundY(hills: HillSpec[] | undefined, worldX: number): number | null {
  if (!hills || hills.length === 0) return null;
  let best: number | null = null;
  for (const h of hills) {
    const x0 = h.startCol * TILE_SIZE;
    const x1 = (h.endCol + 1) * TILE_SIZE;
    if (worldX < x0 || worldX > x1) continue;
    const t = (worldX - x0) / (x1 - x0);
    const groundPx = h.baseRow * TILE_SIZE;
    const y = groundPx - h.peakTiles * TILE_SIZE * bell(t, h.skew ?? 0);
    if (best === null || y < best) best = y; // höchster Hügel gewinnt bei Überlappung
  }
  return best;
}

// True, wenn worldX innerhalb irgendeiner Hügel-Zone liegt.
export function isInHill(hills: HillSpec[] | undefined, worldX: number): boolean {
  if (!hills) return false;
  for (const h of hills) {
    if (worldX >= h.startCol * TILE_SIZE && worldX <= (h.endCol + 1) * TILE_SIZE) return true;
  }
  return false;
}
