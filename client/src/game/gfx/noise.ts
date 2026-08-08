// Grafik-Umbau W1.5 · Grain/Dither gegen Banding.
//
// Ein einmal gebackenes Noise-Tile (128×128), das pro Frame als wiederholtes
// Pattern mit sehr niedrigem Alpha über das Bild gelegt wird. Bricht sichtbare
// Verlaufskanten (Himmel, Vignette, Glow) und gibt einen dezenten filmischen
// Look. Safari-sicher: kein Blur/Filter, nur ein Pattern-fillRect.

let pattern: CanvasPattern | null = null;

export function getNoisePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (pattern) return pattern;
  if (typeof document === 'undefined') return null;
  const size = 128;
  const tile = document.createElement('canvas');
  tile.width = size; tile.height = size;
  const tctx = tile.getContext('2d');
  if (!tctx) return null;
  const img = tctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + Math.random() * 76; // Graustufen um die Mitte (neutral)
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  pattern = ctx.createPattern(tile, 'repeat');
  return pattern;
}
