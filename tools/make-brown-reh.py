#!/usr/bin/env python3
"""Braunes Reh: 7 Frames (1024², WEISSER Hintergrund) -> Hintergrund per
Flood-Fill freistellen, gemeinsame Alpha-Bbox, auf H=200 skaliert,
pngquant-komprimiert, als Base64 data-URLs in rehBrownSprites.ts.
Ergebnis-Layout identisch zur Eisreh-Pipeline (rehSprites.ts)."""
import base64, io, subprocess, os, tempfile
import numpy as np
from scipy import ndimage
from PIL import Image

SRC = "/tmp/brownreh"
FRAMES = [
    "01_STAND.png", "02_WALK_STEP_A.png", "03_WALK_STEP_B.png",
    "04_RUN_STEP.png", "05_LEAP_A.png", "06_LEAP_B.png", "07_STAND_RECOVERY.png",
]
TARGET_H = 200
WHITE = 240  # Schwelle: Pixel mit allen Kanaelen >= WHITE gelten als Hintergrund-Kandidat


def key_out_white(im: Image.Image) -> Image.Image:
    """Weissen, vom Rand zusammenhaengenden Hintergrund transparent machen.
    Innen liegende weisse Flaechen (z.B. Fellzeichnung) bleiben erhalten."""
    arr = np.array(im.convert("RGBA"))
    rgb = arr[:, :, :3].astype(np.int16)
    whiteish = np.all(rgb >= WHITE, axis=2)
    # Zusammenhangskomponenten der weissen Maske
    lbl, n = ndimage.label(whiteish)
    # Labels, die den Bildrand beruehren = Hintergrund
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    bg = np.isin(lbl, list(border))
    alpha = arr[:, :, 3].copy()
    alpha[bg] = 0
    # Weiche Kante: 1px Rand des Motivs leicht ausduennen, damit kein harter
    # weisser Saum bleibt. Erodiere die Vordergrund-Maske um 1px und feathere.
    fg = alpha > 0
    fg_er = ndimage.binary_erosion(fg, iterations=1)
    edge = fg & ~fg_er
    # Kanten-Pixel, die sehr hell sind, in der Deckkraft reduzieren (Anti-Halo).
    bright = np.all(rgb >= 235, axis=2)
    soft = edge & bright
    alpha[soft] = (alpha[soft].astype(np.int16) * 90 // 255).astype(np.uint8)
    arr[:, :, 3] = alpha
    return Image.fromarray(arr, "RGBA")


imgs = [key_out_white(Image.open(os.path.join(SRC, f))) for f in FRAMES]

# Gemeinsame Bounding-Box ueber alle freigestellten Frames.
union = None
for im in imgs:
    bb = im.getbbox()
    if bb is None:
        continue
    if union is None:
        union = list(bb)
    else:
        union[0] = min(union[0], bb[0]); union[1] = min(union[1], bb[1])
        union[2] = max(union[2], bb[2]); union[3] = max(union[3], bb[3])
l, t, r, b = union
print("Union-Bbox:", union, "->", (r - l), "x", (b - t))

scale = TARGET_H / (b - t)
target_w = round((r - l) * scale)
if target_w % 2:
    target_w += 1
print("Ziel:", target_w, "x", TARGET_H)

urls = []
total = 0
for f, im in zip(FRAMES, imgs):
    crop = im.crop((l, t, r, b)).resize((target_w, TARGET_H), Image.LANCZOS)
    raw = io.BytesIO(); crop.save(raw, "PNG"); raw = raw.getvalue()
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        tf.write(raw); tmp = tf.name
    try:
        subprocess.run(["pngquant", "--force", "--quality=60-90", "--speed", "1",
                        "--output", tmp, tmp], capture_output=True)
        with open(tmp, "rb") as fh: comp = fh.read()
    finally:
        os.unlink(tmp)
    use = comp if len(comp) < len(raw) else raw
    total += len(use)
    urls.append(f'  "data:image/png;base64,{base64.b64encode(use).decode()}",')
    print(f"  {f}: {len(use)//1024} KB")

print("Gesamt:", total // 1024, "KB")

header = (
    "// Braunes Reh (Wald-Gegner) — 7 Einzelbilder (Stand, Walk A/B, Run, Leap A/B, Recovery).\n"
    "// Frames nach links blickend, Fuesse unten-mittig (gemeinsame Grundlinie), Weiss freigestellt.\n"
    "// Index: 0 stand · 1-2 walk · 3 run · 4-5 leap · 6 recovery.\n"
    f"export const REH_BROWN_FRAME_W = {target_w};\n"
    f"export const REH_BROWN_FRAME_H = {TARGET_H};\n"
    "export const REH_BROWN_FRAME_URLS: string[] = [\n"
)
out_path = "client/src/game/assets/rehBrownSprites.ts"
with open(out_path, "w") as fh:
    fh.write(header + "\n".join(urls) + "\n];\n")
print("geschrieben:", out_path, os.path.getsize(out_path) // 1024, "KB")

# Vorschau-PNG (Kontaktbogen) zur visuellen Kontrolle
sheet_h = TARGET_H
sheet = Image.new("RGBA", (target_w * 7, sheet_h), (30, 30, 40, 255))
for i, im in enumerate(imgs):
    crop = im.crop((l, t, r, b)).resize((target_w, TARGET_H), Image.LANCZOS)
    sheet.alpha_composite(crop, (i * target_w, 0))
sheet.convert("RGB").save("/tmp/brown_reh_preview.png")
print("Vorschau: /tmp/brown_reh_preview.png")
