import { TILE_SIZE } from '../constants';
import type { Renderer } from '../renderer.ts';

/**
 * Wald-Bodendeko (DECORATION_PROP im Theme 'forest'). Vier Varianten nach
 * Spalte (col % 4): Farn, Pilzgruppe, Beerenbusch, Gras-/Blütenbüschel.
 * Alles im 32×32-Tile, am Boden verwurzelt (wächst nach oben). Bewusst kräftige,
 * natürliche Farben — der globale Wald-Grade ist neutral, also kommen sie durch.
 */
function drawForestProp(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, col: number) {
  const S = TILE_SIZE;
  const v = ((col % 4) + 4) % 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (v === 0) {
    // ── Farn: mehrere geschwungene Wedel aus einem Wurzelpunkt ──
    const bx = S / 2, by = S - 2;
    const fronds = [-0.9, -0.45, 0, 0.45, 0.9];
    for (const a of fronds) {
      const tipX = bx + Math.sin(a) * 13;
      const tipY = by - 22 + Math.abs(a) * 5;
      ctx.strokeStyle = a === 0 ? '#3f7a3a' : '#4c8a42';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + Math.sin(a) * 7, by - 13, tipX, tipY);
      ctx.stroke();
      // kleine Fiederblättchen
      ctx.strokeStyle = '#5aa04e';
      ctx.lineWidth = 1.2;
      for (let s = 0.35; s < 1; s += 0.3) {
        const px = bx + (tipX - bx) * s;
        const py = by + (tipY - by) * s;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 3, py - 3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 3, py - 3); ctx.stroke();
      }
    }
  } else if (v === 1) {
    // ── Pilzgruppe: drei rotkappige Pilze mit hellem Stiel & weißen Punkten ──
    const caps: [number, number, number][] = [[12, S - 6, 6], [21, S - 4, 5], [16, S - 12, 4.5]];
    for (const [cx, cy, r] of caps) {
      // Stiel
      ctx.fillStyle = '#efe7d2';
      ctx.fillRect(cx - r * 0.32, cy - r, r * 0.64, r + 3);
      // Kappe
      ctx.fillStyle = '#c8402f';
      ctx.beginPath(); ctx.ellipse(cx, cy - r, r, r * 0.8, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#e0583f';
      ctx.beginPath(); ctx.ellipse(cx - r * 0.3, cy - r * 1.15, r * 0.4, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      // weiße Tupfen
      ctx.fillStyle = '#fdf4e6';
      ctx.beginPath(); ctx.arc(cx + r * 0.3, cy - r * 1.1, 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx - r * 0.45, cy - r * 0.75, 0.9, 0, Math.PI * 2); ctx.fill();
    }
  } else if (v === 2) {
    // ── Beerenbusch: dichtes dunkelgrünes Laub mit roten Beeren ──
    ctx.fillStyle = '#2f6b34';
    const blobs: [number, number, number][] = [[13, S - 8, 8], [21, S - 9, 7], [17, S - 14, 7]];
    for (const [cx, cy, r] of blobs) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#3c8442';
    for (const [cx, cy, r] of blobs) { ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#d83a4a';
    const berries: [number, number][] = [[11, S - 8], [17, S - 6], [22, S - 10], [15, S - 13], [20, S - 14]];
    for (const [bx, by] of berries) {
      ctx.beginPath(); ctx.arc(bx, by, 1.8, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f27a86'; ctx.beginPath(); ctx.arc(bx - 0.5, by - 0.5, 0.7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d83a4a';
    }
  } else {
    // ── Gras-/Blütenbüschel: hohe Halme mit einer kleinen Blüte ──
    const bx = S / 2, by = S - 2;
    ctx.strokeStyle = '#4f9a48';
    ctx.lineWidth = 1.8;
    for (const a of [-0.5, -0.2, 0.15, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(bx + a * 6, by);
      ctx.quadraticCurveTo(bx + a * 12, by - 14, bx + a * 20, by - 20 - Math.abs(a) * 4);
      ctx.stroke();
    }
    // Blüte auf mittlerem Halm
    const fx = bx + 2, fy = by - 20;
    ctx.fillStyle = '#f2b53a';
    for (let k = 0; k < 6; k++) {
      const ang = (k / 6) * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(fx + Math.cos(ang) * 3, fy + Math.sin(ang) * 3, 2.2, 1.4, ang, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#e26a9a';
    ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/**
 * Waldbach-Lichtreflexe: animierter Schimmer auf der Wasseroberfläche (nur
 * WATER_TOP im Wald). Läuft LIVE im World-Pass (nicht über den Tile-Cache),
 * daher mit `time`. Tags hell-cyan glitzernd, nachts kühl-silbrig (Mondlicht).
 * `dayF` (0..1) steuert Helligkeit; `col` variiert die Phase je Kachel.
 */
function drawForestWaterShimmer(this: Renderer, ctx: CanvasRenderingContext2D, x: number, y: number, time: number, col: number, dayF: number, vw: number) {
  const S = TILE_SIZE;
  const day = Math.max(0, Math.min(1, dayF));
  const night = 1 - day;
  const wob = Math.sin(time * 0.08 + col * 0.9) * 1.6;   // wackelnde Spiegelung
  ctx.save();

  // ── Gestauchte Spiegelung UNTER der Oberfläche ──
  // Tag: grünliche Baumkronen-Spiegelung (weicher Verlauf nach unten).
  if (day > 0.05) {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createLinearGradient(0, y, 0, y + S);
    g.addColorStop(0, `rgba(74,122,64,${(0.20 * day).toFixed(3)})`);
    g.addColorStop(0.5, `rgba(60,100,58,${(0.10 * day).toFixed(3)})`);
    g.addColorStop(1, 'rgba(60,100,58,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + wob * 0.5, y + 2, S, S - 2);
  }
  // Nacht: Mond-Glitzersäule — nur bei Kacheln nahe der Mond-Screen-x (vw*0.70).
  if (night > 0.05) {
    const moonX = vw * 0.70;
    const prox = 1 - Math.min(1, Math.abs((x + S / 2) - moonX) / (vw * 0.30));
    if (prox > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 4; r++) {
        const ry = y + 3 + r * 6;
        const rw = 5 + Math.abs(Math.sin(time * 0.1 + r + col)) * 4;
        ctx.globalAlpha = night * prox * 0.18 * (1 - r * 0.2);
        ctx.fillStyle = 'rgba(222,234,255,1)';
        ctx.beginPath(); ctx.ellipse(x + S / 2 + wob, ry, rw, 1.1, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  // ── Oberflächen-Glanz (über der Spiegelung) ──
  ctx.globalCompositeOperation = 'lighter';
  // Gleitende Glanzstreifen (wandern seitlich hin und her, blinken sanft).
  for (let k = 0; k < 3; k++) {
    const ph = time * 0.05 + col * 0.7 + k * 2.1;
    const gx = x + (0.5 + 0.42 * Math.sin(ph)) * S;
    const gy = y + 3 + k * 3.2;
    const blink = 0.4 + 0.6 * Math.abs(Math.sin(time * 0.06 + col + k));
    ctx.globalAlpha = (0.09 + 0.15 * day) * blink;
    ctx.fillStyle = day > 0.4 ? 'rgba(228,246,255,1)' : 'rgba(198,214,255,1)';
    ctx.beginPath(); ctx.ellipse(gx, gy, 4.6, 1.0, 0, 0, Math.PI * 2); ctx.fill();
  }
  // Vereinzelte, funkelnde Lichtpunkte.
  for (let k = 0; k < 2; k++) {
    const sp = time * 0.09 + col * 1.3 + k * 3.7;
    const sx = x + (Math.sin(sp) * 0.5 + 0.5) * S;
    const sy = y + 2 + k * 5;
    const tw = Math.sin(time * 0.11 + col * 2 + k * 2);
    if (tw < 0.4) continue;
    ctx.globalAlpha = (0.18 + 0.4 * day) * tw;
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.beginPath(); ctx.arc(sx, sy, 0.9, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export const tilesForestMethods = {
  drawForestProp,
  drawForestWaterShimmer,
};
