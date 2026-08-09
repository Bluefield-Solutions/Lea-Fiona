// Grafik-Umbau W2.1 · Gebackene additive Glow-Discs.
//
// Safari-sicherer Ersatz für den Vollbild-Bloom: Statt das Canvas auf sich
// selbst zu zeichnen (iPhone-Falle → schwarzes Bild), werden hier einmalig
// Radial-Gradient-Discs in kleine Offscreen-Canvases gebacken und dann additiv
// (globalCompositeOperation='lighter') um Leuchtelemente gestempelt. Kein
// shadowBlur, kein ctx.filter, kein Self-Draw.

const cache = new Map<string, HTMLCanvasElement>();

// W2.1-Perf · Frame-Budget: begrenzt die Zahl der additiven Glow-Stempel pro
// Bild (verhindert Overdraw-Explosion, wenn viele Leuchtelemente sichtbar sind
// — vor allem auf dem Desktop mit größerem Sichtfeld). Wird zu Frame-Beginn
// zurückgesetzt.
let glowBudget = 999;
export function beginGlowFrame(max: number) { glowBudget = max; }

/** Liefert (gecacht) eine gebackene Glow-Disc der Größe `size` in der Farbe. */
export function getGlowDisc(size: number, r: number, g: number, b: number, coreAlpha: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = `${size}:${r},${g},${b}:${coreAlpha}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const cx = c.getContext('2d');
  if (!cx) return null;
  const grad = cx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${r},${g},${b},${coreAlpha})`);
  grad.addColorStop(0.45, `rgba(${r},${g},${b},${coreAlpha * 0.4})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  cx.fillStyle = grad;
  cx.fillRect(0, 0, size, size);
  cache.set(key, c);
  return c;
}

/** Wie getGlowDisc, aber mit FREIEN Farb-Stops (mehrfarbige/mehrstufige Glows,
 *  z. B. Vulkan-Krater gelb→orange→transparent oder Nebel hue→hue+20). Bei
 *  Referenz-Deckkraft (Kern-Alpha meist 1) backen und beim Blitten via
 *  drawGlowDisc(..., alpha, ...) pro Frame modulieren. `key` muss den Farbverlauf
 *  eindeutig kennzeichnen. */
export function getGlowDiscMulti(key: string, size: number, stops: [number, string][]): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const ck = `M:${key}:${size}`;
  const hit = cache.get(ck);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const cx = c.getContext('2d');
  if (!cx) return null;
  const grad = cx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) grad.addColorStop(o, col);
  cx.fillStyle = grad;
  cx.fillRect(0, 0, size, size);
  cache.set(ck, c);
  return c;
}

/** Stempelt eine Glow-Disc additiv, zentriert auf (cx, cy). Bewusst schlank
 *  gehalten (kein save/restore, kein imageSmoothing-Wechsel): bei vielen
 *  Stempeln pro Frame summieren sich Zustandswechsel spürbar. */
export function stampGlow(ctx: CanvasRenderingContext2D, disc: HTMLCanvasElement | null, cx: number, cy: number, scale = 1) {
  if (!disc || glowBudget <= 0) return;
  glowBudget--;
  const s = disc.width * scale;
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(disc, cx - s / 2, cy - s / 2, s, s);
  ctx.globalCompositeOperation = prev;
}

/** Perf-Paket 2 · Budget-freier Glow-Stempel mit RADIUS-Semantik (rx/ry statt
 *  Scale), per-Frame-Helligkeit `alpha` und wählbarem Blend. Ersetzt pro-Frame
 *  `createRadialGradient`-Allokationen (Höhlen-Deko: Lava, Glut, Augen, Fackeln):
 *  die Disc wird EINMAL gebacken und hier nur noch skaliert geblittet.
 *  - rx/ry erlauben elliptische Glows (z. B. flache Lava-Tümpel).
 *  - `alpha` moduliert das Flackern/Pulsieren (Disc mit Referenz-Alpha gebacken).
 *  - `additive`=true → 'lighter' (Vordergrund-Feuer), false → source-over
 *    (Hintergrund-Deko, exakt wie zuvor auf dunklem Fels). Nicht budgetiert,
 *    da die Höhlen-Atmosphäre bewusst gezeichnet wird (Dichte regelt `qf`). */
export function drawGlowDisc(
  ctx: CanvasRenderingContext2D, disc: HTMLCanvasElement | null,
  cx: number, cy: number, rx: number, ry = rx, alpha = 1, additive = false,
) {
  if (!disc || alpha <= 0.003) return;
  const pc = ctx.globalCompositeOperation;
  const pa = ctx.globalAlpha;
  if (additive) ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = pa * (alpha > 1 ? 1 : alpha);
  ctx.drawImage(disc, cx - rx, cy - ry, rx * 2, ry * 2);
  ctx.globalAlpha = pa;
  ctx.globalCompositeOperation = pc;
}
