# Player-Sprite Guidelines

The renderer's `loadPlayerSprite` (in `client/src/game/renderer.ts`) auto-cleans
and tight-crops every player PNG at load time so the character sits flush on the
ground regardless of how the source image was exported. To keep that pipeline
reliable when you swap a sprite, follow the rules below.

## What the loader does

1. **Alpha-halo cleanup** — if the PNG already has a real alpha channel, any
   pixel below 32/255 alpha is clamped to fully transparent. This removes the
   anti-aliasing halo most exports leave around the character.
2. **Background auto-detection** — every border pixel is sampled into a coarse
   RGB bucket. Buckets that cover ≥ 5 % of the border are treated as background
   colours, so the loader handles white, blue, green, etc. without per-image
   code changes.
3. **Safety-net heuristics** — near-black, near-white, pure red, pure yellow
   and chroma-key green are always considered background, even when they
   aren't the dominant border colour.
4. **Flood-fill from the borders** — every pixel reachable from the edges
   without crossing the character is erased to `alpha = 0`.
5. **Tight crop** — the character is then cropped to the smallest rectangle
   that still contains all opaque pixels.
6. **Dev warning** — in development builds, if the cropped bounding box still
   covers more than 90 % of the source image, a `console.warn` is logged with
   the file name and observed dimensions so the broken sprite is easy to spot.

## What a "clean" source PNG looks like

Any one of the following is fine — the loader handles all three paths:

- **Real transparent background.** Export the character with an alpha channel
  and a transparent background. The character itself should be fully opaque
  (alpha 255). Soft anti-aliasing edges are okay.
- **Single solid background colour.** A uniform white, black, green-screen,
  red, yellow or blue field around the character all work. Avoid gradients,
  drop shadows, or photographic backgrounds.
- **Combination.** A real alpha channel plus a uniform fallback colour also
  works and is the most robust option.

Additional recommendations:

- Keep the character roughly centered with a few pixels of padding on every
  side. Padding is harmless because the loader crops it away.
- Avoid colours inside the character that match the background bucket
  (e.g. pure white shoes on a white background) — those pixels would leak
  into the flood fill and be erased.
- The image does not need to be a specific size. The renderer scales the
  cropped sprite to the player's collision box at draw time.

## When the dev warning fires

If you see something like

```
[loadPlayerSprite] Suspicious crop for "/...png": bbox 1500×1000 of 1536×1024
(95.2% area). Background detection may have failed — check that the source
PNG has a uniform background colour or a real alpha channel.
```

the new sprite likely has a noisy background (gradient, multiple colours,
photo) or no consistent border. Re-export it with one of the layouts above
and reload.
