/**
 * Deterministic pseudo-random helper used everywhere we need stable
 * decoration jitter (cloud positions, cave specks, jungle leaf sway, …).
 *
 * It's the standard glibc-style LCG step `(n * 1103515245 + 12345)` masked
 * to a positive 31-bit integer and normalised to `[0, 1)`. Cheap, branch-
 * free, deterministic, and the same seed always returns the same value —
 * which is what every caller actually wants (so a redrawn frame doesn't
 * make the same cloud jitter to a new spot).
 *
 * Always pass a seed (often `i * <large prime>`) so adjacent decorations
 * don't all get the same value.
 */
export function pseudoRandom(n: number): number {
  return ((n * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}
