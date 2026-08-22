#!/usr/bin/env python3
"""Generisches Sprite-Tool: transparente PNG-Frames (1024²) -> gemeinsame
Alpha-Bbox, auf H=200 skaliert, pngquant-komprimiert, als Base64 data-URLs in
eine TS-Datei. Nutzung:
  make-sprite.py <src_dir> <out_ts> <CONST_PREFIX> <Kommentar>
Frames werden alphabetisch (01_.. .. 10_..) einsortiert -> Index 0..N-1.
"""
import base64, io, subprocess, os, sys, tempfile
from PIL import Image

src, out_ts, prefix, comment = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
TARGET_H = 200
frames = sorted(f for f in os.listdir(src) if f.lower().endswith(".png"))
imgs = [Image.open(os.path.join(src, f)).convert("RGBA") for f in frames]

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
scale = TARGET_H / (b - t)
target_w = round((r - l) * scale)
if target_w % 2:
    target_w += 1
print(f"{prefix}: {len(frames)} Frames, Bbox {r-l}x{b-t} -> {target_w}x{TARGET_H}")

urls, total = [], 0
for f, im in zip(frames, imgs):
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
print(f"  Gesamt: {total//1024} KB")

header = (
    f"// {comment}\n"
    f"// Frames links blickend, Fuesse unten-mittig (gemeinsame Grundlinie).\n"
    f"// Reihenfolge = Datei-Reihenfolge (01..{len(frames):02d}), Index 0..{len(frames)-1}.\n"
    f"export const {prefix}_FRAME_W = {target_w};\n"
    f"export const {prefix}_FRAME_H = {TARGET_H};\n"
    f"export const {prefix}_FRAME_URLS: string[] = [\n"
)
with open(out_ts, "w") as fh:
    fh.write(header + "\n".join(urls) + "\n];\n")
print(f"  geschrieben: {out_ts} ({os.path.getsize(out_ts)//1024} KB)")

# Kontaktbogen zur Sichtkontrolle
sheet = Image.new("RGBA", (target_w * len(frames), TARGET_H), (28, 30, 42, 255))
for i, im in enumerate(imgs):
    sheet.alpha_composite(im.crop((l, t, r, b)).resize((target_w, TARGET_H), Image.LANCZOS), (i * target_w, 0))
prev = f"/tmp/{prefix.lower()}_preview.png"
sheet.convert("RGB").save(prev)
print(f"  Vorschau: {prev}")
