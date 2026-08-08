import type { Renderer } from '../renderer.ts';
import { TILE_SIZE } from '../constants.ts';
import { getGlowDisc, stampGlow } from '../gfx/glow.ts';

function drawGroundTile(this: Renderer, ctx: CanvasRenderingContext2D, top: boolean, left: boolean, right: boolean, _bottom: boolean) {
  const S = TILE_SIZE;
  const soilStart = top ? Math.floor(S * 0.28) : 0;
  // Bluefield: „blaue Wiese" — Stahl-/Schieferblauer Untergrund + leuchtend
  // blaue Grasnarbe in Markenfarbe (#1E48D6) statt Walderde/Grün.
  const blue = this.currentTheme === 'bluefield';

  // Erd-Füllung. WICHTIG (Naht-Fix): Nicht-Top-Kacheln (Innen/Stapel) werden
  // in EINEM einheitlichen Erd-Ton gefüllt — kein pro-Kachel Hell→Dunkel-
  // Verlauf mehr, der beim Stapeln an jeder Grenze eine harte Streifen-Naht
  // erzeugt hat. Die Top-Kachel behält einen kurzen Verlauf direkt unter der
  // Grasnarbe, der GENAU auf denselben Füll-Ton ausläuft → nahtloser Übergang
  // von Oberflächen- zu Füllkachel. Plastik/Tiefe liefern Kanten-Schattierung
  // (Seiten/Unterseite) und die Kiesel-/Wurzel-Textur.
  const fillTone = blue ? '#25439a' : '#513320';
  if (top) {
    const soilGrad = ctx.createLinearGradient(0, soilStart, 0, S);
    if (blue) {
      soilGrad.addColorStop(0, '#2d52c4');
      soilGrad.addColorStop(0.5, '#2a4cb6');
      soilGrad.addColorStop(1, fillTone);
    } else {
      soilGrad.addColorStop(0, '#6b4226');
      soilGrad.addColorStop(0.5, '#5e3822');
      soilGrad.addColorStop(1, fillTone);
    }
    ctx.fillStyle = soilGrad;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  } else {
    ctx.fillStyle = fillTone;
    ctx.fillRect(0, soilStart, S, S - soilStart);
  }

  if (top) {
    const grassGrad = ctx.createLinearGradient(0, 0, 0, soilStart + 2);
    if (blue) {
      grassGrad.addColorStop(0, '#6b9bf5');
      grassGrad.addColorStop(0.3, '#4a7be0');
      grassGrad.addColorStop(0.6, '#375fd2');
      grassGrad.addColorStop(0.85, '#2d4fbe');
      grassGrad.addColorStop(1, '#2a3a5a');
    } else {
      // Grasnarbe EXAKT auf die Hügel-Palette (renderTerrainHills PAL.jungle)
      // ausgerichtet, damit erhöhte Blöcke/Moos dieselbe Wiese tragen wie der
      // geschwungene Boden — vorher zwei leicht verschiedene Grüns ("Farbe anders").
      grassGrad.addColorStop(0, '#83db66');   // hi
      grassGrad.addColorStop(0.3, '#54b441'); // mid
      grassGrad.addColorStop(0.6, '#3d8a30'); // base
      grassGrad.addColorStop(0.85, '#2c6a22'); // deep
      grassGrad.addColorStop(1, fillTone);     // nahtlos in den Erd-Füllton
    }
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, 0, S, soilStart + 2);
  }

  // (Horizontale Erd-Schichtlinien entfernt — sie summierten sich bei tiefem
  // Untergrund zu unschönen „geraden Schichten". Gradient + Kiesel geben
  // weiterhin Textur, aber ohne die parallelen Linien.)

  const pebbleData = [
    { x: 5, y: 0.35, r: 1.8, c: '#8a7a6a', cb: '#4a5a7e' }, { x: 14, y: 0.55, r: 1.5, c: '#7a6a5a', cb: '#3e4e6e' },
    { x: 22, y: 0.7, r: 2, c: '#6a5a4a', cb: '#556595' }, { x: 28, y: 0.4, r: 1.3, c: '#9a8a7a', cb: '#5e6e96' },
    { x: 8, y: 0.8, r: 1.6, c: '#7a6a5a', cb: '#42527a' }, { x: 18, y: 0.9, r: 1.4, c: '#8a7a6a', cb: '#4e5e86' },
  ];
  if (!blue) for (const p of pebbleData) {
    const py = soilStart + (S - soilStart) * p.y;
    if (py < soilStart + 2 || py > S - 2) continue;
    ctx.fillStyle = blue ? p.cb : p.c;
    ctx.beginPath();
    ctx.ellipse(p.x, py, p.r, p.r * 0.7, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(p.x - 0.3, py - 0.3, p.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = blue ? 'rgba(0,0,0,0)' : 'rgba(50, 30, 10, 0.18)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(3, soilStart + 4);
  ctx.quadraticCurveTo(5, soilStart + 8, 2, soilStart + 15);
  ctx.quadraticCurveTo(4, soilStart + 20, 6, soilStart + 26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(S - 4, soilStart + 6);
  ctx.quadraticCurveTo(S - 7, soilStart + 12, S - 3, soilStart + 20);
  ctx.quadraticCurveTo(S - 5, soilStart + 24, S - 2, soilStart + 28);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(15, soilStart + 2);
  ctx.quadraticCurveTo(13, soilStart + 7, 16, soilStart + 12);
  ctx.stroke();

  if (top) {
    const topLine = ctx.createLinearGradient(0, 0, 0, 2);
    topLine.addColorStop(0, blue ? '#8fb8ff' : '#8aef75');
    topLine.addColorStop(1, blue ? '#4a7be0' : '#60c84a');
    ctx.fillStyle = topLine;
    ctx.fillRect(0, 0, S, 2);

    for (let i = 0; i < 20; i++) {
      const gx = (i * 1.7 + 0.5) % S;
      const gh = 3 + ((i * 7 + 3) % 6);
      const bend = ((i * 13 + 5) % 7 - 3) * 0.6;
      const hue = 105 + ((i * 17) % 30);
      const sat = 50 + ((i * 11) % 25);
      const lit = 25 + ((i * 7) % 18);
      ctx.strokeStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
      ctx.lineWidth = 1 + ((i % 3) * 0.3);
      ctx.beginPath();
      ctx.moveTo(gx, soilStart - 1);
      ctx.quadraticCurveTo(gx + bend * 0.5, soilStart - gh * 0.5, gx + bend, soilStart - gh);
      ctx.stroke();
    }

    for (let i = 0; i < 7; i++) {
      const lx = 1 + ((i * 5 + 2) % (S - 4));
      const ly = soilStart - 2 - (i % 3);
      const lw = 3 + (i % 2);
      const lh = 1.5 + (i % 2) * 0.5;
      ctx.fillStyle = `hsla(${115 + (i % 3) * 12}, 55%, ${28 + (i % 3) * 5}%, 0.65)`;
      ctx.beginPath();
      ctx.ellipse(lx, ly, lw, lh, (i % 2 === 0 ? 0.2 : -0.2), 0, Math.PI * 2);
      ctx.fill();
    }

    const mushroomX = 22;
    ctx.fillStyle = '#8B6543';
    ctx.fillRect(mushroomX, soilStart - 2, 1, 3);
    ctx.fillStyle = '#cc3333';
    ctx.beginPath();
    ctx.ellipse(mushroomX + 0.5, soilStart - 2, 2.5, 1.8, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(mushroomX - 0.5, soilStart - 3, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mushroomX + 1.5, soilStart - 3.5, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (left) {
    const lg = ctx.createLinearGradient(0, 0, 8, 0);
    lg.addColorStop(0, 'rgba(0,0,0,0.3)');
    lg.addColorStop(0.4, 'rgba(0,0,0,0.1)');
    lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, 8, S);
  }
  if (right) {
    const rg = ctx.createLinearGradient(S - 8, 0, S, 0);
    rg.addColorStop(0, 'rgba(0,0,0,0)');
    rg.addColorStop(0.6, 'rgba(0,0,0,0.1)');
    rg.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = rg;
    ctx.fillRect(S - 8, 0, 8, S);
  }

  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let x = 0; x < S; x += 2) {
    for (let y = 0; y < S; y += 2) {
      if ((x + y) % 4 === 0) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let x = 1; x < S; x += 2) {
    for (let y = 1; y < S; y += 2) {
      if ((x + y) % 6 === 0) ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawPlatformTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const plankW = S / 2;

  for (let p = 0; p < 2; p++) {
    const px = p * plankW;
    const toneShift = p === 0 ? 0 : 8;
    const grad = ctx.createLinearGradient(0, 0, 0, S);
    grad.addColorStop(0, `rgb(${155 + toneShift}, ${125 + toneShift}, ${90 + toneShift})`);
    grad.addColorStop(0.08, `rgb(${165 + toneShift}, ${135 + toneShift}, ${100 + toneShift})`);
    grad.addColorStop(0.5, `rgb(${140 + toneShift}, ${110 + toneShift}, ${75 + toneShift})`);
    grad.addColorStop(0.85, `rgb(${125 + toneShift}, ${95 + toneShift}, ${65 + toneShift})`);
    grad.addColorStop(1, `rgb(${115 + toneShift}, ${88 + toneShift}, ${58 + toneShift})`);
    ctx.fillStyle = grad;
    ctx.fillRect(px, 0, plankW, S);

    ctx.strokeStyle = 'rgba(90,60,30,0.12)';
    ctx.lineWidth = 0.6;
    for (let g = 0; g < 4; g++) {
      const gy = 4 + g * 7 + p * 2;
      ctx.beginPath();
      ctx.moveTo(px + 1, gy);
      for (let gx = px + 1; gx < px + plankW - 1; gx += 3) {
        ctx.lineTo(gx, gy + Math.sin(gx * 0.15 + g) * 1.5);
      }
      ctx.stroke();
    }
  }

  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(plankW - 0.5, 2, 1, S - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(plankW + 0.5, 2, 0.5, S - 2);

  const topHighlight = ctx.createLinearGradient(0, 0, 0, 3);
  topHighlight.addColorStop(0, 'rgba(255,240,210,0.45)');
  topHighlight.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = topHighlight;
  ctx.fillRect(0, 0, S, 3);

  const botShadow = ctx.createLinearGradient(0, S - 3, 0, S);
  botShadow.addColorStop(0, 'rgba(0,0,0,0)');
  botShadow.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = botShadow;
  ctx.fillRect(0, S - 3, S, 3);

  const nails = [[3, 3], [S - 4, 3], [3, S - 4], [S - 4, S - 4], [plankW - 1, 3], [plankW + 1, S - 4]];
  for (const [nx, ny] of nails) {
    ctx.fillStyle = '#4a4a4a';
    ctx.beginPath();
    ctx.arc(nx, ny, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    ctx.arc(nx - 0.3, ny - 0.3, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawQuestionBlock(this: Renderer, ctx: CanvasRenderingContext2D, used: boolean) {
  const S = TILE_SIZE;
  // Drachenhöhle: statt des Fragezeichen-Blocks ein Fossil-Stein (Bernstein-
  // Ammonit im Fels), der genauso Superkraft/Bonbon freigibt.
  if (this.currentTheme === 'dragon' && !used) {
    stampGlow(ctx, getGlowDisc(48, 255, 190, 90, 0.26), S / 2, S / 2, 1.0);
    // Steinblock mit Verlauf + Kante.
    const rock = ctx.createLinearGradient(0, 0, S, S);
    rock.addColorStop(0, '#6f6a5a'); rock.addColorStop(0.5, '#585244'); rock.addColorStop(1, '#403a30');
    ctx.fillStyle = rock; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(2, 1, S - 4, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(0, S - 2, S, 2); ctx.fillRect(S - 2, 0, 2, S);
    // Bernstein-Ammonit (Spirale) mittig, warm leuchtend.
    const cx = S / 2, cy = S / 2;
    const amber = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, S * 0.42);
    amber.addColorStop(0, '#ffe9a0'); amber.addColorStop(0.5, '#ffbf4a'); amber.addColorStop(1, '#c8790f');
    ctx.fillStyle = amber;
    ctx.beginPath(); ctx.arc(cx, cy, S * 0.30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(90,50,10,0.7)'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.25) {
      const r = 1.5 + a * (S * 0.030);
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // Rippen der Ammonit-Schale.
    ctx.strokeStyle = 'rgba(120,70,15,0.5)'; ctx.lineWidth = 0.8;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * S * 0.10, cy + Math.sin(a) * S * 0.10);
      ctx.lineTo(cx + Math.cos(a) * S * 0.28, cy + Math.sin(a) * S * 0.28);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,240,0.6)';
    ctx.beginPath(); ctx.arc(cx - S * 0.12, cy - S * 0.12, 1.6, 0, Math.PI * 2); ctx.fill();
    return;
  }
  if (!used) {
    // W2.1 · dezenter Glow um aktive Q-Blöcke (gebackene additive Disc).
    stampGlow(ctx, getGlowDisc(48, 255, 216, 120, 0.28), S / 2, S / 2, 1.0);
  }
  if (used) {
    const usedGrad = ctx.createLinearGradient(0, 0, S, S);
    usedGrad.addColorStop(0, '#6a5d50');
    usedGrad.addColorStop(0.5, '#5a4d40');
    usedGrad.addColorStop(1, '#4a3d30');
    ctx.fillStyle = usedGrad;
    ctx.fillRect(0, 0, S, S);

    ctx.fillStyle = '#504535';
    ctx.fillRect(2, 2, S - 4, S - 4);

    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(1, 1, S - 2, S - 2);

    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(5, 8);
    ctx.quadraticCurveTo(S * 0.4, S * 0.35, S * 0.7, S * 0.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(S - 8, 5);
    ctx.lineTo(S * 0.3, S * 0.8);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(0, S - 2, S, 2);
    ctx.fillRect(S - 2, 0, 2, S);
    return;
  }

  const bgGrad = ctx.createLinearGradient(0, 0, S, S);
  bgGrad.addColorStop(0, '#ffe85c');
  bgGrad.addColorStop(0.2, '#ffd230');
  bgGrad.addColorStop(0.5, '#f0b820');
  bgGrad.addColorStop(0.8, '#d9a010');
  bgGrad.addColorStop(1, '#b88508');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, S, S);

  const sheen = ctx.createRadialGradient(S * 0.3, S * 0.3, 0, S * 0.3, S * 0.3, S * 0.6);
  sheen.addColorStop(0, 'rgba(255,255,240,0.35)');
  sheen.addColorStop(0.5, 'rgba(255,255,200,0.1)');
  sheen.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, S, S);

  ctx.fillStyle = '#ffe680';
  ctx.fillRect(2, 0, S - 4, 2);
  ctx.fillRect(0, 2, 2, S - 4);
  ctx.fillStyle = '#ffd44d';
  ctx.fillRect(2, 2, S - 4, 1);
  ctx.fillRect(2, 2, 1, S - 4);

  ctx.fillStyle = '#8a6a10';
  ctx.fillRect(2, S - 2, S - 2, 2);
  ctx.fillRect(S - 2, 2, 2, S - 2);
  ctx.fillStyle = '#a07a15';
  ctx.fillRect(3, S - 3, S - 5, 1);
  ctx.fillRect(S - 3, 3, 1, S - 5);

  ctx.fillStyle = '#6a5008';
  ctx.fillRect(0, 0, 2, 2);
  ctx.fillRect(S - 2, 0, 2, 2);
  ctx.fillRect(0, S - 2, 2, 2);
  ctx.fillRect(S - 2, S - 2, 2, 2);

  const rivets = [[4, 4], [S - 5, 4], [4, S - 5], [S - 5, S - 5]];
  for (const [rx, ry] of rivets) {
    ctx.fillStyle = '#b89020';
    ctx.beginPath();
    ctx.arc(rx, ry, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,220,0.5)';
    ctx.beginPath();
    ctx.arc(rx - 0.3, ry - 0.3, 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', S / 2 + 1.5, S / 2 + 1.5);

  const qGrad = ctx.createLinearGradient(S / 2 - 5, S / 2 - 8, S / 2 + 5, S / 2 + 8);
  qGrad.addColorStop(0, '#ffffff');
  qGrad.addColorStop(0.4, '#fff8e0');
  qGrad.addColorStop(1, '#ffe8a0');
  ctx.fillStyle = qGrad;
  ctx.fillText('?', S / 2, S / 2);

  const sparkles = [[8, 10], [S - 7, 8], [12, S - 9]];
  for (const [sx, sy] of sparkles) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(sx, sy, 1, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(sx - 1, sy, 1, 1);
    ctx.fillRect(sx + 1, sy, 1, 1);
    ctx.fillRect(sx, sy - 1, 1, 1);
    ctx.fillRect(sx, sy + 1, 1, 1);
  }
}

function drawBrickTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const brickH = S / 4;
  const brickW = S / 2;

  ctx.fillStyle = '#4a3018';
  ctx.fillRect(0, 0, S, S);

  const brickTones = [
    ['#c07830', '#a86828', '#904820'],
    ['#b87028', '#a06020', '#884018'],
    ['#c88038', '#b07030', '#985028'],
  ];

  for (let row = 0; row < 4; row++) {
    const offset = (row % 2 === 0) ? 0 : brickW / 2;
    for (let col = -1; col < 3; col++) {
      const bx = col * brickW + offset;
      if (bx + brickW <= 0 || bx >= S) continue;
      const toneIdx = (row + col + 3) % 3;
      const [top, mid, bot] = brickTones[toneIdx];
      const by = row * brickH;

      const bGrad = ctx.createLinearGradient(0, by + 1, 0, by + brickH - 1);
      bGrad.addColorStop(0, top);
      bGrad.addColorStop(0.4, mid);
      bGrad.addColorStop(1, bot);
      ctx.fillStyle = bGrad;
      ctx.fillRect(bx + 1, by + 1, brickW - 2, brickH - 2);

      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let sx = bx + 2; sx < bx + brickW - 2; sx += 2) {
        for (let sy = by + 2; sy < by + brickH - 2; sy += 2) {
          if ((sx + sy + row) % 5 === 0) ctx.fillRect(sx, sy, 1, 1);
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let sx = bx + 3; sx < bx + brickW - 2; sx += 3) {
        for (let sy = by + 1; sy < by + brickH - 1; sy += 3) {
          if ((sx + sy) % 7 === 0) ctx.fillRect(sx, sy, 1, 1);
        }
      }

      ctx.fillStyle = 'rgba(255,230,180,0.12)';
      ctx.fillRect(bx + 1, by + 1, brickW - 2, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(bx + 1, by + brickH - 2, brickW - 2, 1);
    }
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 2);
  topHL.addColorStop(0, 'rgba(255,220,170,0.3)');
  topHL.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 2);

  const botSH = ctx.createLinearGradient(0, S - 2, 0, S);
  botSH.addColorStop(0, 'rgba(0,0,0,0)');
  botSH.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = botSH;
  ctx.fillRect(0, S - 2, S, 2);
}

// Metall-Lüftungsschacht für Innenraum-Welten (Schule/Superfly) — ersetzt die
// grüne Mario-Röhre durch grauen Stahl-Schacht mit Sicken/Nieten + dunkler
// Öffnung. Gleiche Tile-Teile (top/body · left/right), damit die Warp-Mechanik
// unverändert bleibt (v397).
function drawSchoolPipeTile(this: Renderer, ctx: CanvasRenderingContext2D, part: string) {
  const S = TILE_SIZE;
  const isTop = part.includes('top');
  const isLeft = part.includes('left');
  const bodyGrad = ctx.createLinearGradient(0, 0, S, 0);
  if (isLeft) {
    bodyGrad.addColorStop(0, '#454d55');
    bodyGrad.addColorStop(0.2, '#727a82');
    bodyGrad.addColorStop(0.45, '#aeb6be');
    bodyGrad.addColorStop(0.62, '#c6ced6');
    bodyGrad.addColorStop(0.82, '#868e96');
    bodyGrad.addColorStop(1, '#646c74');
  } else {
    bodyGrad.addColorStop(0, '#646c74');
    bodyGrad.addColorStop(0.2, '#868e96');
    bodyGrad.addColorStop(0.4, '#c6ced6');
    bodyGrad.addColorStop(0.58, '#aeb6be');
    bodyGrad.addColorStop(0.82, '#727a82');
    bodyGrad.addColorStop(1, '#454d55');
  }
  const top = isTop ? 6 : 0;
  const inset = isTop ? 0 : (isLeft ? 3 : 0);
  const w = isTop ? S : S - 3;
  ctx.fillStyle = bodyGrad;
  ctx.fillRect(inset, top, w, S - top);

  // Horizontale Stahl-Sicken (Segment-Rillen) mit Licht/Schatten.
  for (let sy = (isTop ? 13 : 4); sy < S; sy += 9) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(inset, sy, w, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(inset, sy + 1, w, 1);
  }
  // Nieten an der Kante.
  ctx.fillStyle = 'rgba(38,44,50,0.7)';
  for (let ry = (isTop ? 11 : 3); ry < S; ry += 9) {
    ctx.beginPath();
    ctx.arc(isLeft ? inset + 3 : inset + w - 3, ry, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isTop) {
    // Breiter Metall-Kragen (Rand des Schachts).
    const lip = ctx.createLinearGradient(0, 0, 0, 6);
    lip.addColorStop(0, '#dae2ea');
    lip.addColorStop(0.5, '#9aa2aa');
    lip.addColorStop(1, '#565e66');
    ctx.fillStyle = lip;
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 1);
    // Dunkle Öffnung direkt unter dem Kragen (man springt hinein).
    ctx.fillStyle = 'rgba(8,12,18,0.6)';
    ctx.fillRect(inset + 2, 6, w - 4, 4);
  }
}

function drawPipeTile(this: Renderer, ctx: CanvasRenderingContext2D, part: string) {
  const S = TILE_SIZE;
  const isTop = part.includes('top');
  const isLeft = part.includes('left');

  if (isTop) {
    const bodyGrad = ctx.createLinearGradient(isLeft ? 0 : 0, 0, S, 0);
    if (isLeft) {
      bodyGrad.addColorStop(0, '#0e4a1a');
      bodyGrad.addColorStop(0.15, '#1a6b2a');
      bodyGrad.addColorStop(0.35, '#30a848');
      bodyGrad.addColorStop(0.5, '#45c860');
      bodyGrad.addColorStop(0.7, '#35b050');
      bodyGrad.addColorStop(0.9, '#28903c');
      bodyGrad.addColorStop(1, '#20803a');
    } else {
      bodyGrad.addColorStop(0, '#20803a');
      bodyGrad.addColorStop(0.1, '#28903c');
      bodyGrad.addColorStop(0.3, '#35b050');
      bodyGrad.addColorStop(0.5, '#45c860');
      bodyGrad.addColorStop(0.65, '#30a848');
      bodyGrad.addColorStop(0.85, '#1a6b2a');
      bodyGrad.addColorStop(1, '#0e4a1a');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(0, 4, S, S - 4);

    const lipGrad = ctx.createLinearGradient(0, 0, 0, 5);
    lipGrad.addColorStop(0, '#55e070');
    lipGrad.addColorStop(0.3, '#40c858');
    lipGrad.addColorStop(0.7, '#2da044');
    lipGrad.addColorStop(1, '#1a7830');
    ctx.fillStyle = lipGrad;
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 5);

    ctx.fillStyle = 'rgba(180,255,200,0.3)';
    ctx.fillRect(isLeft ? -2 : 0, 0, S + 2, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(isLeft ? -2 : 0, 4, S + 2, 1);

    const aoGrad = ctx.createLinearGradient(0, 5, 0, 10);
    aoGrad.addColorStop(0, 'rgba(0,0,0,0.15)');
    aoGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aoGrad;
    ctx.fillRect(0, 5, S, 5);

    const highlightX = isLeft ? S * 0.35 : S * 0.35;
    ctx.fillStyle = 'rgba(150,255,180,0.12)';
    ctx.fillRect(highlightX, 6, 2, S - 8);

    ctx.fillStyle = 'rgba(60,100,60,0.1)';
    for (let my = 10; my < S; my += 8) {
      ctx.beginPath();
      ctx.ellipse(isLeft ? 5 : S - 5, my, 3, 2, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const inset = isLeft ? 4 : 0;
    const w = S - 4;
    const bodyGrad = ctx.createLinearGradient(inset, 0, inset + w, 0);
    if (isLeft) {
      bodyGrad.addColorStop(0, '#0e4a1a');
      bodyGrad.addColorStop(0.15, '#1a6b2a');
      bodyGrad.addColorStop(0.3, '#2a9a40');
      bodyGrad.addColorStop(0.45, '#3dba55');
      bodyGrad.addColorStop(0.65, '#30a848');
      bodyGrad.addColorStop(0.85, '#20803a');
      bodyGrad.addColorStop(1, '#30a848');
    } else {
      bodyGrad.addColorStop(0, '#30a848');
      bodyGrad.addColorStop(0.15, '#20803a');
      bodyGrad.addColorStop(0.35, '#30a848');
      bodyGrad.addColorStop(0.55, '#3dba55');
      bodyGrad.addColorStop(0.7, '#2a9a40');
      bodyGrad.addColorStop(0.85, '#1a6b2a');
      bodyGrad.addColorStop(1, '#0e4a1a');
    }
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(inset, 0, w, S);

    const reflectX = inset + w * 0.3;
    ctx.fillStyle = 'rgba(150,255,180,0.15)';
    ctx.fillRect(reflectX, 0, 1.5, S);
    ctx.fillStyle = 'rgba(200,255,220,0.08)';
    ctx.fillRect(reflectX + 1.5, 0, 1, S);

    const rivets = [
      [inset + w * 0.5, S * 0.25],
      [inset + w * 0.5, S * 0.75],
    ];
    for (const [rx, ry] of rivets) {
      ctx.fillStyle = '#1a5a28';
      ctx.beginPath();
      ctx.arc(rx, ry, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(150,255,180,0.3)';
      ctx.beginPath();
      ctx.arc(rx - 0.4, ry - 0.4, 0.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(40,80,40,0.12)';
    ctx.beginPath();
    ctx.ellipse(inset + w * 0.7, S * 0.4, 4, 2.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(inset + w * 0.2, S * 0.8, 3, 2, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStoneTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;

  const baseGrad = ctx.createLinearGradient(0, 0, S, S);
  baseGrad.addColorStop(0, '#9a9590');
  baseGrad.addColorStop(0.3, '#8a8580');
  baseGrad.addColorStop(0.6, '#7a7570');
  baseGrad.addColorStop(1, '#6a6560');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, S, S);

  ctx.fillStyle = 'rgba(120,110,100,0.15)';
  ctx.fillRect(3, 5, 10, 8);
  ctx.fillStyle = 'rgba(100,95,88,0.12)';
  ctx.fillRect(18, 15, 12, 10);
  ctx.fillStyle = 'rgba(110,105,95,0.1)';
  ctx.fillRect(6, 20, 8, 9);

  ctx.fillStyle = 'rgba(0,0,0,0.05)';
  for (let x = 0; x < S; x += 2) {
    for (let y = 0; y < S; y += 2) {
      if ((x * 7 + y * 13) % 11 < 3) ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let x = 1; x < S; x += 2) {
    for (let y = 1; y < S; y += 2) {
      if ((x * 11 + y * 7) % 13 < 3) ctx.fillRect(x, y, 1, 1);
    }
  }

  ctx.strokeStyle = 'rgba(40,35,30,0.25)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(6, 3);
  ctx.quadraticCurveTo(10, 8, 8, 14);
  ctx.quadraticCurveTo(12, 18, 15, 22);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(S - 5, 8);
  ctx.quadraticCurveTo(S - 10, 14, S - 6, 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(12, S - 4);
  ctx.quadraticCurveTo(18, S - 10, 24, S - 6);
  ctx.stroke();

  ctx.fillStyle = 'rgba(80,140,60,0.35)';
  ctx.beginPath();
  ctx.ellipse(9, 14, 2.5, 1.5, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,120,50,0.3)';
  ctx.beginPath();
  ctx.ellipse(S - 8, 20, 2, 1.2, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(100,160,70,0.25)';
  ctx.beginPath();
  ctx.ellipse(18, S - 7, 1.8, 1, 0.5, 0, Math.PI * 2);
  ctx.fill();

  const topHL = ctx.createLinearGradient(0, 0, 0, 3);
  topHL.addColorStop(0, 'rgba(255,255,250,0.2)');
  topHL.addColorStop(1, 'rgba(255,255,250,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 3);

  const leftHL = ctx.createLinearGradient(0, 0, 3, 0);
  leftHL.addColorStop(0, 'rgba(255,255,250,0.12)');
  leftHL.addColorStop(1, 'rgba(255,255,250,0)');
  ctx.fillStyle = leftHL;
  ctx.fillRect(0, 0, 3, S);

  const botSH = ctx.createLinearGradient(0, S - 3, 0, S);
  botSH.addColorStop(0, 'rgba(0,0,0,0)');
  botSH.addColorStop(1, 'rgba(0,0,0,0.2)');
  ctx.fillStyle = botSH;
  ctx.fillRect(0, S - 3, S, 3);

  const rightSH = ctx.createLinearGradient(S - 3, 0, S, 0);
  rightSH.addColorStop(0, 'rgba(0,0,0,0)');
  rightSH.addColorStop(1, 'rgba(0,0,0,0.15)');
  ctx.fillStyle = rightSH;
  ctx.fillRect(S - 3, 0, 3, S);
}

function drawWoodPlatform(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const plankW = S / 2;

  for (let p = 0; p < 2; p++) {
    const px = p * plankW;
    const toneShift = p === 0 ? 0 : -10;
    const grad = ctx.createLinearGradient(px, 0, px + plankW, 0);
    grad.addColorStop(0, `rgb(${130 + toneShift}, ${95 + toneShift}, ${60 + toneShift})`);
    grad.addColorStop(0.3, `rgb(${155 + toneShift}, ${115 + toneShift}, ${78 + toneShift})`);
    grad.addColorStop(0.7, `rgb(${150 + toneShift}, ${110 + toneShift}, ${72 + toneShift})`);
    grad.addColorStop(1, `rgb(${125 + toneShift}, ${90 + toneShift}, ${55 + toneShift})`);
    ctx.fillStyle = grad;
    ctx.fillRect(px, 0, plankW, S);

    ctx.strokeStyle = `rgba(${80 + toneShift},${55 + toneShift},${30 + toneShift},0.15)`;
    ctx.lineWidth = 0.7;
    for (let g = 0; g < 5; g++) {
      const baseY = 3 + g * 6 + p * 3;
      ctx.beginPath();
      ctx.moveTo(px + 1, baseY);
      for (let gx = px + 1; gx < px + plankW - 1; gx += 2) {
        ctx.lineTo(gx, baseY + Math.sin(gx * 0.2 + g * 1.5 + p) * 1.8);
      }
      ctx.stroke();
    }

    const knotX = px + (p === 0 ? 10 : 8);
    const knotY = p === 0 ? 12 : 20;
    ctx.fillStyle = `rgba(${90 + toneShift},${60 + toneShift},${30 + toneShift},0.5)`;
    ctx.beginPath();
    ctx.ellipse(knotX, knotY, 2.5, 1.8, p * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(${70 + toneShift},${45 + toneShift},${20 + toneShift},0.3)`;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(knotX, knotY, 3.5, 2.5, p * 0.3, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(plankW - 0.5, 0, 1, S);

  const nails = [[2, 2], [plankW - 3, 2], [plankW + 2, 2], [S - 3, 2], [2, S - 3], [S - 3, S - 3]];
  for (const [nx, ny] of nails) {
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.arc(nx, ny, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,200,210,0.4)';
    ctx.beginPath();
    ctx.arc(nx - 0.3, ny - 0.3, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const topHL = ctx.createLinearGradient(0, 0, 0, 2);
  topHL.addColorStop(0, 'rgba(255,240,210,0.4)');
  topHL.addColorStop(1, 'rgba(255,240,210,0)');
  ctx.fillStyle = topHL;
  ctx.fillRect(0, 0, S, 2);
}

function drawMossGround(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  this.drawGroundTile(ctx, true, false, false, false);

  const mossPatches = [
    { x: 3, y: 4, w: 8, h: 5, hue: 120 },
    { x: 14, y: 3, w: 10, h: 6, hue: 110 },
    { x: 25, y: 5, w: 6, h: 4, hue: 130 },
    { x: 8, y: 8, w: 7, h: 4, hue: 95 },
    { x: 20, y: 7, w: 9, h: 5, hue: 115 },
  ];
  for (const mp of mossPatches) {
    const sat = 50 + (mp.hue % 20);
    const lit = 30 + (mp.hue % 15);
    ctx.fillStyle = `hsla(${mp.hue}, ${sat}%, ${lit}%, 0.45)`;
    ctx.beginPath();
    ctx.ellipse(mp.x + mp.w / 2, mp.y + mp.h / 2, mp.w / 2, mp.h / 2, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const tendrilPositions = [4, 11, 18, 26];
  for (const tx of tendrilPositions) {
    const th = 6 + (tx * 3) % 5;
    const hue = 110 + (tx * 7) % 25;
    ctx.strokeStyle = `hsla(${hue}, 55%, 32%, 0.5)`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tx, Math.floor(S * 0.28));
    ctx.quadraticCurveTo(tx + 1, Math.floor(S * 0.28) + th * 0.5, tx - 1, Math.floor(S * 0.28) + th);
    ctx.stroke();
  }

  const mossColors = ['rgba(60,150,40,0.5)', 'rgba(80,180,50,0.4)', 'rgba(140,180,40,0.35)'];
  for (let i = 0; i < 8; i++) {
    const mx = (i * 4 + 1) % S;
    const my = 2 + (i * 3) % 7;
    ctx.fillStyle = mossColors[i % mossColors.length];
    ctx.beginPath();
    ctx.ellipse(mx, my, 2 + i % 2, 1.5, (i * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(200,60,60,0.6)';
  ctx.beginPath();
  ctx.arc(9, 6, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(8.7, 5.5, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(220,180,60,0.5)';
  ctx.beginPath();
  ctx.arc(24, 8, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(180,140,40,0.6)';
  ctx.fillRect(23.5, 8, 1, 2);
}

// Kletterseil: geflochtenes Seil mit Schräg-Wicklung + heller Kante, mittig.
function drawRopeTile(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const cx = S / 2;
  const halfW = 4;
  // Kern-Verlauf (rund wirkend).
  const g = ctx.createLinearGradient(cx - halfW, 0, cx + halfW, 0);
  g.addColorStop(0, '#8a6636');
  g.addColorStop(0.5, '#c79a5a');
  g.addColorStop(1, '#7a5628');
  ctx.fillStyle = g;
  ctx.fillRect(cx - halfW, 0, halfW * 2, S);
  // Schräge Wicklungen (geflochten).
  ctx.strokeStyle = 'rgba(90,62,30,0.7)';
  ctx.lineWidth = 1.4;
  for (let y = -4; y < S; y += 5) {
    ctx.beginPath();
    ctx.moveTo(cx - halfW, y);
    ctx.lineTo(cx + halfW, y + 4);
    ctx.stroke();
  }
  // Helle Glanzkante links.
  ctx.strokeStyle = 'rgba(255,238,200,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cx - halfW + 1, 0); ctx.lineTo(cx - halfW + 1, S); ctx.stroke();
}

function drawVine(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const cx = S / 2;

  ctx.strokeStyle = 'rgba(30,60,20,0.2)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(cx + 1, 0);
  for (let y = 0; y <= S; y += 1) {
    ctx.lineTo(cx + Math.sin(y * 0.25) * 4.5 + 1, y + 1);
  }
  ctx.stroke();

  const vineGrad = ctx.createLinearGradient(cx - 4, 0, cx + 4, 0);
  vineGrad.addColorStop(0, '#2a5a20');
  vineGrad.addColorStop(0.3, '#3d7a30');
  vineGrad.addColorStop(0.5, '#4a8a3a');
  vineGrad.addColorStop(0.7, '#3d7a30');
  vineGrad.addColorStop(1, '#2a5a20');
  ctx.strokeStyle = vineGrad;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(cx, 0);
  for (let y = 0; y <= S; y += 1) {
    ctx.lineTo(cx + Math.sin(y * 0.25) * 4.5, y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(60,100,40,0.15)';
  ctx.lineWidth = 0.5;
  for (let by = 0; by < S; by += 3) {
    const bx = cx + Math.sin(by * 0.25) * 4.5;
    ctx.beginPath();
    ctx.moveTo(bx - 1.5, by);
    ctx.lineTo(bx + 1.5, by);
    ctx.stroke();
  }

  const leaves = [
    { y: 5, side: 1, hue: 120, size: 1 },
    { y: 14, side: -1, hue: 110, size: 1.2 },
    { y: 23, side: 1, hue: 130, size: 0.9 },
  ];
  for (const leaf of leaves) {
    const lx = cx + Math.sin(leaf.y * 0.25) * 4.5;
    const leafX = lx + leaf.side * 7;
    const leafY = leaf.y;
    const sz = leaf.size;

    ctx.fillStyle = `hsla(${leaf.hue}, 55%, 30%, 0.3)`;
    ctx.beginPath();
    ctx.moveTo(lx + leaf.side * 2, leafY + 1);
    ctx.quadraticCurveTo(leafX + 1, leafY + 3, leafX + leaf.side * 3 * sz, leafY + 1);
    ctx.quadraticCurveTo(leafX + 1, leafY - 1, lx + leaf.side * 2, leafY + 1);
    ctx.fill();

    const leafGrad = ctx.createRadialGradient(leafX, leafY, 0, leafX, leafY, 5 * sz);
    leafGrad.addColorStop(0, `hsla(${leaf.hue}, 60%, 40%, 0.9)`);
    leafGrad.addColorStop(0.5, `hsla(${leaf.hue}, 55%, 35%, 0.85)`);
    leafGrad.addColorStop(1, `hsla(${leaf.hue}, 50%, 28%, 0.8)`);
    ctx.fillStyle = leafGrad;
    ctx.beginPath();
    ctx.moveTo(lx + leaf.side * 2, leafY);
    ctx.quadraticCurveTo(leafX, leafY + 3 * sz, leafX + leaf.side * 3 * sz, leafY);
    ctx.quadraticCurveTo(leafX, leafY - 2.5 * sz, lx + leaf.side * 2, leafY);
    ctx.fill();

    ctx.strokeStyle = `hsla(${leaf.hue}, 50%, 25%, 0.4)`;
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(lx + leaf.side * 2, leafY);
    ctx.lineTo(leafX + leaf.side * 2 * sz, leafY);
    ctx.stroke();
  }

  const tendrils = [{ y: 10, side: -1 }, { y: 28, side: 1 }];
  for (const t of tendrils) {
    const tx = cx + Math.sin(t.y * 0.25) * 4.5;
    ctx.strokeStyle = 'rgba(60,120,40,0.5)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(tx + t.side * 2, t.y);
    ctx.quadraticCurveTo(tx + t.side * 6, t.y + 2, tx + t.side * 5, t.y + 5);
    ctx.quadraticCurveTo(tx + t.side * 3, t.y + 7, tx + t.side * 5, t.y + 6);
    ctx.stroke();
  }
}

function drawFlower(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;
  const stemBaseX = S / 2;
  const flowerCX = S / 2 + 1;
  const flowerCY = S * 0.3;

  ctx.strokeStyle = 'rgba(30,70,20,0.2)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(stemBaseX + 1, S + 1);
  ctx.quadraticCurveTo(stemBaseX - 2, S * 0.65, flowerCX + 1, flowerCY + 5);
  ctx.stroke();

  const stemGrad = ctx.createLinearGradient(stemBaseX - 2, 0, stemBaseX + 2, 0);
  stemGrad.addColorStop(0, '#2a6a25');
  stemGrad.addColorStop(0.5, '#3a8a35');
  stemGrad.addColorStop(1, '#2a6a25');
  ctx.strokeStyle = stemGrad;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(stemBaseX, S);
  ctx.quadraticCurveTo(stemBaseX - 3, S * 0.65, flowerCX, flowerCY + 4);
  ctx.stroke();

  const stemLeaves = [
    { y: S * 0.75, side: -1, hue: 125 },
    { y: S * 0.55, side: 1, hue: 115 },
  ];
  for (const sl of stemLeaves) {
    const slx = stemBaseX + Math.sin((S - sl.y) * 0.08) * -2;
    ctx.fillStyle = `hsla(${sl.hue}, 55%, 32%, 0.85)`;
    ctx.beginPath();
    ctx.moveTo(slx, sl.y);
    ctx.quadraticCurveTo(slx + sl.side * 5, sl.y - 2, slx + sl.side * 7, sl.y - 4);
    ctx.quadraticCurveTo(slx + sl.side * 4, sl.y + 1, slx, sl.y);
    ctx.fill();
  }

  const petalData = [
    { angle: -0.4, hue: 15, sat: 90, lit: 55 },
    { angle: 0.85, hue: 340, sat: 80, lit: 50 },
    { angle: 2.1, hue: 280, sat: 60, lit: 45 },
    { angle: 3.3, hue: 10, sat: 85, lit: 58 },
    { angle: 4.5, hue: 350, sat: 75, lit: 48 },
    { angle: 5.5, hue: 25, sat: 88, lit: 60 },
  ];

  for (const petal of petalData) {
    const pr = 6;
    const px = flowerCX + Math.cos(petal.angle) * pr;
    const py = flowerCY + Math.sin(petal.angle) * pr;

    ctx.fillStyle = `hsla(${petal.hue}, ${petal.sat - 20}%, ${petal.lit - 15}%, 0.3)`;
    ctx.beginPath();
    ctx.ellipse(px + 0.5, py + 0.8, 4.5, 3, petal.angle, 0, Math.PI * 2);
    ctx.fill();

    const pGrad = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, 5);
    pGrad.addColorStop(0, `hsla(${petal.hue}, ${petal.sat}%, ${petal.lit + 10}%, 0.95)`);
    pGrad.addColorStop(0.5, `hsla(${petal.hue}, ${petal.sat}%, ${petal.lit}%, 0.9)`);
    pGrad.addColorStop(1, `hsla(${petal.hue}, ${petal.sat - 10}%, ${petal.lit - 10}%, 0.85)`);
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.ellipse(px, py, 4.5, 3, petal.angle, 0, Math.PI * 2);
    ctx.fill();
  }

  const centerGrad = ctx.createRadialGradient(flowerCX, flowerCY, 0, flowerCX, flowerCY, 3.5);
  centerGrad.addColorStop(0, '#ffee55');
  centerGrad.addColorStop(0.3, '#ffcc22');
  centerGrad.addColorStop(0.6, '#e6aa10');
  centerGrad.addColorStop(1, '#cc8800');
  ctx.fillStyle = centerGrad;
  ctx.beginPath();
  ctx.arc(flowerCX, flowerCY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(180,120,0,0.3)';
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  ctx.arc(flowerCX, flowerCY, 2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(flowerCX, flowerCY, 1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255,255,200,0.5)';
  ctx.beginPath();
  ctx.arc(flowerCX - 1, flowerCY - 1, 0.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawWater(this: Renderer, ctx: CanvasRenderingContext2D, isTop: boolean, hazard = false) {
  const S = TILE_SIZE;

  const depthGrad = ctx.createLinearGradient(0, 0, 0, S);
  if (hazard) {
    // Gefahren-Wasser (Billabongs/Teiche außerhalb des Schwimm-Levels): tiefes,
    // dunkles Wasser mit fast schwarzem Grund — liest sich als "hier nicht
    // reinfallen" statt als seichte Pfütze. Klare helle Oberflächenlinie bleibt.
    if (isTop) {
      depthGrad.addColorStop(0, 'rgba(26, 104, 140, 0.82)');
      depthGrad.addColorStop(0.35, 'rgba(18, 74, 116, 0.9)');
      depthGrad.addColorStop(0.7, 'rgba(12, 52, 92, 0.95)');
      depthGrad.addColorStop(1, 'rgba(8, 34, 68, 0.98)');
    } else {
      depthGrad.addColorStop(0, 'rgba(9, 38, 72, 0.97)');
      depthGrad.addColorStop(0.4, 'rgba(7, 28, 58, 0.98)');
      depthGrad.addColorStop(0.75, 'rgba(5, 20, 44, 0.99)');
      depthGrad.addColorStop(1, 'rgba(3, 12, 30, 1)');
    }
  } else if (isTop) {
    depthGrad.addColorStop(0, 'rgba(40, 180, 200, 0.45)');
    depthGrad.addColorStop(0.3, 'rgba(30, 150, 190, 0.55)');
    depthGrad.addColorStop(0.6, 'rgba(20, 120, 170, 0.65)');
    depthGrad.addColorStop(1, 'rgba(15, 90, 150, 0.75)');
  } else {
    depthGrad.addColorStop(0, 'rgba(15, 90, 150, 0.75)');
    depthGrad.addColorStop(0.3, 'rgba(12, 70, 130, 0.8)');
    depthGrad.addColorStop(0.7, 'rgba(10, 55, 110, 0.85)');
    depthGrad.addColorStop(1, 'rgba(8, 40, 90, 0.9)');
  }
  ctx.fillStyle = depthGrad;
  ctx.fillRect(0, 0, S, S);

  ctx.strokeStyle = 'rgba(100,200,230,0.12)';
  ctx.lineWidth = 0.6;
  for (let ry = 4; ry < S; ry += 5) {
    ctx.beginPath();
    ctx.moveTo(0, ry);
    for (let rx = 0; rx <= S; rx += 3) {
      ctx.lineTo(rx, ry + Math.sin(rx * 0.3 + ry * 0.5) * 1.2);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(150,230,255,0.08)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const cy = 6 + i * 7;
    const cx = 5 + i * 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + 4, cy - 2, cx + 8, cy + 1);
    ctx.quadraticCurveTo(cx + 12, cy + 3, cx + 15, cy);
    ctx.stroke();
  }

  const bubbles = isTop
    ? [{ x: 8, y: 12, r: 1.5 }, { x: 22, y: 18, r: 1 }, { x: 15, y: 8, r: 1.2 }]
    : [{ x: 12, y: 10, r: 1 }, { x: 25, y: 22, r: 1.3 }];
  for (const b of bubbles) {
    ctx.strokeStyle = 'rgba(180,220,255,0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(220,240,255,0.2)';
    ctx.beginPath();
    ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isTop) {
    const waveColors = [
      { color: 'rgba(60,180,220,0.5)', amp: 3, freq: 0.2, phase: 0, yOff: 4 },
      { color: 'rgba(40,160,200,0.4)', amp: 2.5, freq: 0.25, phase: 1.5, yOff: 3 },
      { color: 'rgba(80,200,240,0.35)', amp: 2, freq: 0.3, phase: 3, yOff: 5 },
    ];
    for (const wave of waveColors) {
      ctx.fillStyle = wave.color;
      ctx.beginPath();
      ctx.moveTo(0, S);
      for (let wx = 0; wx <= S; wx += 1) {
        const wy = wave.yOff + Math.sin(wx * wave.freq + wave.phase) * wave.amp;
        ctx.lineTo(wx, wy);
      }
      ctx.lineTo(S, S);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let fx = 0; fx < S; fx += 1) {
      const fy = 3 + Math.sin(fx * 0.25) * 2.5;
      const foamH = Math.max(0, 1.5 - Math.abs(Math.sin(fx * 0.4)) * 1.5);
      if (foamH > 0.3) {
        ctx.fillRect(fx, fy - foamH, 1, foamH);
      }
    }

    // Kräftige, klar sichtbare Wasserlinie an der Oberfläche (v393): lässt den
    // Pool auf Distanz als Wasser lesen statt als flacher blauer Block.
    ctx.strokeStyle = 'rgba(215,246,255,0.62)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let sx = 0; sx <= S; sx += 1) {
      const sy = 2.6 + Math.sin(sx * 0.25) * 1.5;
      if (sx === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
  }
}

// Wooden sign post — a small "this way!" tutorial post.
// The actual instruction text is rendered separately by drawSignText() so
// that level designers can place arbitrary text without invalidating the
// tile cache. This tile only paints the post + tiny board pictogram.
function drawSign(this: Renderer, ctx: CanvasRenderingContext2D) {
  const S = TILE_SIZE;

  // Soft drop shadow on the ground behind the post.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(S / 2 + 2, S - 2, 9, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wooden post (vertical stake driven into the ground).
  const postW = 4;
  const postX = (S - postW) / 2;
  const postGrad = ctx.createLinearGradient(postX, 0, postX + postW, 0);
  postGrad.addColorStop(0, '#5a3a1c');
  postGrad.addColorStop(0.5, '#8b5a28');
  postGrad.addColorStop(1, '#4a2e16');
  ctx.fillStyle = postGrad;
  ctx.fillRect(postX, S * 0.45, postW, S * 0.55);

  // Wood grain on the post.
  ctx.strokeStyle = 'rgba(40, 22, 8, 0.55)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(postX + 1, S * 0.5); ctx.lineTo(postX + 1, S - 1);
  ctx.moveTo(postX + postW - 1, S * 0.55); ctx.lineTo(postX + postW - 1, S - 2);
  ctx.stroke();

  // Wooden board (horizontal plank nailed to the top of the post).
  const boardW = S - 4;
  const boardH = 12;
  const boardX = 2;
  const boardY = 4;
  const boardGrad = ctx.createLinearGradient(0, boardY, 0, boardY + boardH);
  boardGrad.addColorStop(0, '#c98a4a');
  boardGrad.addColorStop(0.5, '#a8683a');
  boardGrad.addColorStop(1, '#7a4a26');
  ctx.fillStyle = boardGrad;
  ctx.fillRect(boardX, boardY, boardW, boardH);

  // Plank seam line.
  ctx.strokeStyle = 'rgba(70, 40, 18, 0.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(boardX, boardY + boardH / 2);
  ctx.lineTo(boardX + boardW, boardY + boardH / 2);
  ctx.stroke();

  // Wood grain on the board.
  ctx.strokeStyle = 'rgba(70, 40, 18, 0.35)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 3; i++) {
    const gy = boardY + 2 + i * 4;
    ctx.beginPath();
    ctx.moveTo(boardX + 2, gy);
    ctx.bezierCurveTo(
      boardX + 8, gy - 0.5,
      boardX + 16, gy + 0.5,
      boardX + boardW - 2, gy,
    );
    ctx.stroke();
  }

  // Two iron nails at the corners.
  ctx.fillStyle = '#3a3a40';
  ctx.beginPath();
  ctx.arc(boardX + 2, boardY + 2, 1.2, 0, Math.PI * 2);
  ctx.arc(boardX + boardW - 2, boardY + 2, 1.2, 0, Math.PI * 2);
  ctx.arc(boardX + 2, boardY + boardH - 2, 1.2, 0, Math.PI * 2);
  ctx.arc(boardX + boardW - 2, boardY + boardH - 2, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(boardX + 2 - 0.4, boardY + 2 - 0.4, 0.4, 0, Math.PI * 2);
  ctx.arc(boardX + boardW - 2 - 0.4, boardY + 2 - 0.4, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Tiny exclamation-mark pictogram so even a passive glance reads as "info".
  ctx.fillStyle = '#fff5d8';
  ctx.fillRect(S / 2 - 1, boardY + 3, 2, 4);
  ctx.fillRect(S / 2 - 1, boardY + 8, 2, 2);
  ctx.fillStyle = 'rgba(120, 70, 20, 0.6)';
  ctx.fillRect(S / 2, boardY + 3, 1, 7);

  // Subtle outline so the sign reads against any background.
  ctx.strokeStyle = 'rgba(40, 22, 8, 0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(boardX + 0.5, boardY + 0.5, boardW - 1, boardH - 1);
}

function drawSlopeTile(this: Renderer, ctx: CanvasRenderingContext2D, dir: 1 | -1) {
  // dir = 1 → rises to the right (SLOPE_RIGHT_45); dir = -1 → rises to the left.
  const S = TILE_SIZE;
  ctx.clearRect(0, 0, S, S);
  const wedge = () => {
    ctx.beginPath();
    if (dir === 1) { ctx.moveTo(0, S); ctx.lineTo(S, 0); ctx.lineTo(S, S); }
    else { ctx.moveTo(0, 0); ctx.lineTo(S, S); ctx.lineTo(0, S); }
    ctx.closePath();
  };
  // Earthy body.
  wedge();
  const grad = ctx.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, '#7a4a24');
  grad.addColorStop(1, '#5b3417');
  ctx.fillStyle = grad;
  ctx.fill();
  // Grass band hugging the diagonal surface, clipped to the solid wedge.
  ctx.save();
  wedge();
  ctx.clip();
  ctx.strokeStyle = '#4caf3f';
  ctx.lineWidth = 8;
  ctx.beginPath();
  if (dir === 1) { ctx.moveTo(0, S); ctx.lineTo(S, 0); }
  else { ctx.moveTo(0, 0); ctx.lineTo(S, S); }
  ctx.stroke();
  ctx.restore();
  // Crisp surface line on top of the grass.
  ctx.strokeStyle = '#3c8a32';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (dir === 1) { ctx.moveTo(0, S); ctx.lineTo(S, 0); }
  else { ctx.moveTo(0, 0); ctx.lineTo(S, S); }
  ctx.stroke();
}

export const tilesJungleMethods = {
  drawGroundTile,
  drawPlatformTile,
  drawSlopeTile,
  drawQuestionBlock,
  drawBrickTile,
  drawPipeTile,
  drawSchoolPipeTile,
  drawStoneTile,
  drawWoodPlatform,
  drawMossGround,
  drawVine,
  drawRopeTile,
  drawFlower,
  drawWater,
  drawSign,
};
