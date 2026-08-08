import type { Renderer } from '../renderer.ts';
import { TILE_SIZE } from '../constants.ts';

// Cache rendered text-boards by their content so we don't re-paint the
// rounded panel + glyphs every frame. Keyed by the joined lines.
const signTextCache = new Map<string, HTMLCanvasElement>();

const PADDING_X = 10;
const PADDING_Y = 8;
const LINE_HEIGHT = 14;
const FONT = '11px ui-sans-serif, system-ui, "Segoe UI", sans-serif';
const TITLE_FONT = 'bold 11px ui-sans-serif, system-ui, "Segoe UI", sans-serif';
// Width of the wooden text-board, in CSS pixels. Wide enough to fit the
// longest German hint line at the chosen font size without wrapping.
const BOARD_WIDTH = 196;

function buildBoard(lines: string[]): HTMLCanvasElement {
  const c = document.createElement('canvas');
  // Breite an die längste Zeile anpassen (mind. BOARD_WIDTH), damit lange
  // Hinweiszeilen nicht am Board-/Canvas-Rand abgeschnitten werden (v440).
  const mctx = c.getContext('2d')!;
  let longest = 0;
  for (let i = 0; i < lines.length; i++) {
    mctx.font = i === 0 ? TITLE_FONT : FONT;
    longest = Math.max(longest, mctx.measureText(lines[i]).width);
  }
  const w = Math.max(BOARD_WIDTH, Math.ceil(longest) + PADDING_X * 2 + 8);
  const h = PADDING_Y * 2 + lines.length * LINE_HEIGHT;
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  // Drop shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  roundRect(ctx, 2, 3, w - 4, h - 4, 6);
  ctx.fill();

  // Wooden plank background.
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#d8a060');
  grad.addColorStop(0.5, '#b67838');
  grad.addColorStop(1, '#8a5520');
  ctx.fillStyle = grad;
  roundRect(ctx, 1, 1, w - 4, h - 4, 5);
  ctx.fill();

  // Inner cream panel where the text sits, for legibility.
  const innerX = 5;
  const innerY = 5;
  const innerW = w - 12;
  const innerH = h - 12;
  ctx.fillStyle = 'rgba(255, 248, 224, 0.92)';
  roundRect(ctx, innerX, innerY, innerW, innerH, 3);
  ctx.fill();

  // Wood-grain hint along the top & bottom of the plank frame.
  ctx.strokeStyle = 'rgba(70, 40, 18, 0.4)';
  ctx.lineWidth = 0.7;
  for (let i = 0; i < 2; i++) {
    const y = i === 0 ? 3 : h - 6;
    ctx.beginPath();
    ctx.moveTo(8, y);
    ctx.bezierCurveTo(w * 0.3, y - 0.6, w * 0.6, y + 0.6, w - 8, y);
    ctx.stroke();
  }

  // Iron nails at corners.
  const nailPositions = [
    { x: 4, y: 4 },
    { x: w - 6, y: 4 },
    { x: 4, y: h - 6 },
    { x: w - 6, y: h - 6 },
  ];
  for (const n of nailPositions) {
    ctx.fillStyle = '#3a3a40';
    ctx.beginPath();
    ctx.arc(n.x, n.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(n.x - 0.4, n.y - 0.4, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Text — first line bold (acts as a title), rest regular.
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  for (let i = 0; i < lines.length; i++) {
    ctx.font = i === 0 ? TITLE_FONT : FONT;
    ctx.fillStyle = i === 0 ? '#5a2a08' : '#3a1f08';
    ctx.fillText(lines[i], w / 2, PADDING_Y + i * LINE_HEIGHT);
  }

  // Subtle outline.
  ctx.strokeStyle = 'rgba(60, 30, 10, 0.7)';
  ctx.lineWidth = 1;
  roundRect(ctx, 1.5, 1.5, w - 5, h - 5, 5);
  ctx.stroke();

  return c;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Draw the wooden text-board for a sign. The board floats just above the
 * sign-post tile, centered horizontally on it, with a tiny pointer at the
 * bottom so it visually belongs to the post.
 *
 * @param postScreenX Screen-space X of the sign tile's left edge.
 * @param postScreenY Screen-space Y of the sign tile's top edge.
 * @param lines       Lines of text. Line 0 is rendered as a bold title.
 */
// Bluefield: Schild als Terminal-Panel (Navy, Mono, blaue Schrift, // Header).
function drawTerminalSign(this: Renderer, postScreenX: number, postScreenY: number, lines: string[]) {
  const ctx = this.ctx;
  ctx.save();
  // v399: Lesbarkeit — voll deckendes Panel, hellerer Text, höher gesetzt
  // (klar über dem Figurenkopf) und auch vertikal ins Bild geklemmt, damit die
  // Erklärung nie hinter Figur/Deko verschwindet.
  const pad = 9, lineH = 16;
  ctx.font = 'bold 12px monospace';
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
  const w = Math.ceil(maxW) + pad * 2 + 6; // +6 Sicherheitsrand (Pfeil-Glyphen etc.)
  const h = lines.length * lineH + pad * 2 - 3;
  const cx = postScreenX + TILE_SIZE / 2;
  let x = Math.round(cx - w / 2);
  x = Math.max(4, Math.min(this.viewportW - w - 4, x));
  // Höher über den Post/Figurenkopf heben und vertikal ins Bild klemmen.
  let y = Math.round(postScreenY - h - 26);
  y = Math.max(4, Math.min(this.viewportH - h - 30, y));
  const prevA = ctx.globalAlpha;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 10;
  ctx.fillStyle = 'rgba(8,15,38,0.99)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(110,160,255,0.95)'; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 5); ctx.stroke();
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < lines.length; i++) {
    ctx.font = i === 0 ? 'bold 12px monospace' : '12px monospace';
    ctx.fillStyle = i === 0 ? '#9cc0ff' : 'rgba(236,244,255,0.97)';
    ctx.fillText(lines[i], x + pad, y + pad + 11 + i * lineH);
  }
  // Sprechblasen-Spitze nur zeichnen, wenn das Panel direkt über dem Post sitzt
  // (nicht bei vertikaler Klemmung), sonst zeigt sie ins Leere.
  const tipY = postScreenY - h - 26;
  if (Math.abs(tipY - y) < 2) {
    ctx.fillStyle = 'rgba(8,15,38,0.99)';
    ctx.beginPath();
    ctx.moveTo(cx - 5, y + h - 1); ctx.lineTo(cx + 5, y + h - 1); ctx.lineTo(cx, y + h + 6);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = prevA;
  ctx.restore();
}

function drawSignText(
  this: Renderer,
  postScreenX: number,
  postScreenY: number,
  lines: string[],
) {
  if (!lines.length) return;

  // Bluefield: Schilder im Terminal-/Code-Kommentar-Stil (Website-Sprache).
  if (this.currentTheme === 'bluefield') {
    drawTerminalSign.call(this, postScreenX, postScreenY, lines);
    return;
  }

  const key = lines.join('\n');
  let board = signTextCache.get(key);
  if (!board) {
    board = buildBoard(lines);
    signTextCache.set(key, board);
  }

  // Center the board on the post and float it above the sign tile, with a
  // small gap so the pointer triangle doesn't overlap the post graphic.
  const postCenterX = postScreenX + TILE_SIZE / 2;
  const boardX = Math.round(postCenterX - board.width / 2);
  const boardY = Math.round(postScreenY - board.height - 4);

  // Clamp horizontally to the viewport so the board stays readable when the
  // sign is near the screen edge.
  const clampedX = Math.max(
    4,
    Math.min(this.viewportW - board.width - 4, boardX),
  );

  // Schilder im Spielverlauf dezent halbtransparent, damit sie nicht vom
  // Geschehen ablenken, aber noch gut lesbar bleiben.
  const prevAlpha = this.ctx.globalAlpha;
  this.ctx.globalAlpha = prevAlpha * 0.62;

  this.ctx.drawImage(board, clampedX, boardY);

  // Little pointer triangle linking the board to the sign post.
  const tipX = postCenterX;
  const tipY = boardY + board.height + 4;
  this.ctx.fillStyle = '#8a5520';
  this.ctx.strokeStyle = 'rgba(40, 20, 8, 0.7)';
  this.ctx.lineWidth = 1;
  this.ctx.beginPath();
  this.ctx.moveTo(tipX - 5, boardY + board.height - 1);
  this.ctx.lineTo(tipX + 5, boardY + board.height - 1);
  this.ctx.lineTo(tipX, tipY);
  this.ctx.closePath();
  this.ctx.fill();
  this.ctx.stroke();
  this.ctx.globalAlpha = prevAlpha;
}

export const signsMethods = {
  drawSignText,
};
