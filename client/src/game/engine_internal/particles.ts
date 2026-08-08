// Pure particle-spawn helpers extracted from engine.ts so the engine class
// stays focused on game-loop orchestration. Each function appends a fresh
// burst of particles to the `out` array, asking the caller-supplied
// `acquire` factory for each Particle so pooling is preserved.
//
// `acquire` matches GameEngine.acquireParticle's signature and is normally
// just `engine.acquireParticle.bind(engine)`.

import type { Particle, Entity } from '../entities';

export type AcquireParticle = (
  x: number, y: number,
  velX: number, velY: number,
  color: string,
  size?: number,
  lifetime?: number,
) => Particle;

export function spawnBlockParticles(
  out: Entity[], acquire: AcquireParticle, x: number, y: number,
) {
  const colors = ['#FFD700', '#FFA500', '#ffee88'];
  for (let i = 0; i < 6; i++) {
    out.push(acquire(
      x + (Math.random() - 0.5) * 10,
      y,
      (Math.random() - 0.5) * 3,
      -Math.random() * 4 - 1,
      colors[i % colors.length],
      2 + Math.random() * 2,
      30 + Math.random() * 20,
    ));
  }
}

export function spawnBrickParticles(
  out: Entity[], acquire: AcquireParticle, x: number, y: number,
) {
  const colors = ['#8B6914', '#A07818', '#6b5010'];
  for (let i = 0; i < 8; i++) {
    out.push(acquire(
      x + (Math.random() - 0.5) * 8,
      y + (Math.random() - 0.5) * 8,
      (Math.random() - 0.5) * 5,
      -Math.random() * 6 - 2,
      colors[i % colors.length],
      3 + Math.random() * 3,
      40 + Math.random() * 20,
    ));
  }
}

export function spawnCoinParticles(
  out: Entity[], acquire: AcquireParticle, x: number, y: number,
) {
  // Aufsteigender Glanz-Pop: goldene Funken streben nach oben, dazu ein
  // heller Kern-Blitz und zwei höher schießende Sternchen für das „Pling".
  const colors = ['#FFD700', '#FFC125', '#ffee88', '#fffae0'];
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2;
    out.push(acquire(
      x, y,
      Math.cos(angle) * 2.2,
      Math.sin(angle) * 1.6 - 1.8, // stärkerer Aufwärts-Bias
      colors[i % colors.length],
      1.8 + Math.random() * 1.8,
      22 + Math.random() * 12,
    ));
  }
  out.push(acquire(x, y, 0, -0.5, '#ffffff', 5, 12)); // heller Kern-Blitz
  for (let i = 0; i < 2; i++) {
    out.push(acquire(
      x + (Math.random() - 0.5) * 4, y,
      (Math.random() - 0.5) * 0.8, -2.6 - Math.random(),
      '#fffae0', 2.4, 28,
    ));
  }
}

export function spawnStarParticles(
  out: Entity[], acquire: AcquireParticle, x: number, y: number,
) {
  // Regenbogen-Burst mit Aufwärts-Drang + heller Kern-Blitz für den
  // „Power-up!"-Moment.
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const hue = (i * 26) % 360;
    out.push(acquire(
      x, y,
      Math.cos(angle) * 3.2,
      Math.sin(angle) * 2.6 - 1.8,
      `hsl(${hue}, 100%, 70%)`,
      2 + Math.random() * 2.4,
      40 + Math.random() * 12,
    ));
  }
  out.push(acquire(x, y, 0, -0.6, '#ffffff', 7, 14)); // Kern-Blitz
}

export function spawnHeartParticles(
  out: Entity[], acquire: AcquireParticle, x: number, y: number,
) {
  const colors = ['#ff2255', '#ff6b8a', '#ff88aa', '#ffaacc', '#fff'];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    out.push(acquire(
      x, y,
      Math.cos(angle) * 2.6,
      Math.sin(angle) * 2.2 - 2,
      colors[i % colors.length],
      3,
      35 + Math.random() * 12,
    ));
  }
  out.push(acquire(x, y, 0, -0.6, '#ffffff', 6, 14)); // Kern-Blitz
}

export function spawnStompParticles(
  out: Entity[], acquire: AcquireParticle, x: number, y: number,
) {
  // Kräftiger, radialer „Pop"-Burst in warmen + weißen Tönen — gibt dem
  // Besiegen jedes Gegners ein befriedigendes Treffer-Feedback.
  const colors = ['#ffffff', '#fff4c2', '#ffd966', '#ffe9a8'];
  const count = 11;
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const speed = 1.7 + Math.random() * 2.5;
    out.push(acquire(
      x + Math.cos(ang) * 2,
      y - 2,
      Math.cos(ang) * speed,
      Math.sin(ang) * speed - 1.2, // leichter Aufwärts-Bias
      colors[i % colors.length],
      2 + Math.random() * 2.4,
      18 + Math.random() * 14,
    ));
  }
  // Wenige größere, langsame „Schock"-Funken obendrauf für das Pop-Gefühl.
  for (let i = 0; i < 3; i++) {
    const ang = Math.random() * Math.PI * 2;
    out.push(acquire(
      x, y - 2,
      Math.cos(ang) * 0.9,
      -1.6 - Math.random() * 1.6,
      '#ffffff',
      3.4 + Math.random() * 1.6,
      24,
    ));
  }
  out.push(acquire(x, y - 2, 0, -0.4, '#ffffff', 5.5, 11)); // heller Kern-Blitz
}

// Mario-feel: small puff of greyish dust kicked horizontally in `dir`.
// Used for skid/slide/wall-jump push-offs.
export function spawnDust(
  out: Entity[], acquire: AcquireParticle,
  x: number, y: number, dir: number,
  colors: string[] = ['#ddd', '#ccc', '#bbb', '#e8e0d0'],
) {
  for (let i = 0; i < 5; i++) {
    out.push(acquire(
      x + (Math.random() - 0.5) * 6,
      y - Math.random() * 4,
      dir * (0.6 + Math.random() * 1.2),
      -Math.random() * 0.8,
      colors[i % colors.length],
      2 + Math.random() * 2,
      18,
    ));
  }
}

// Feinschliff: leichter, bodennaher Staub-Kick beim vollen Sprint. Bewusst
// dezenter als spawnDust (Skid/Landung) — nur 2 kleine, flache, schnell
// verwehende Wölkchen hinter den Füßen, damit der Renn-Trail lebendig wirkt,
// ohne die Szene zuzustauben.
export function spawnRunDust(
  out: Entity[], acquire: AcquireParticle,
  x: number, y: number, dir: number,
  colors: string[] = ['#e8e0d0', '#dddddd', '#cfc8ba'],
) {
  for (let i = 0; i < 2; i++) {
    out.push(acquire(
      x + (Math.random() - 0.5) * 4,
      y - Math.random() * 2,
      dir * (0.5 + Math.random() * 0.8),
      -0.15 - Math.random() * 0.5,
      colors[i % colors.length],
      1.3 + Math.random() * 1.1,
      12,
    ));
  }
}

// Mario-feel: gold sparks under the feet while the P-meter is charged.
export function spawnSparks(
  out: Entity[], acquire: AcquireParticle, x: number, y: number,
) {
  const colors = ['#ffd54a', '#ffeb88', '#ffaa22'];
  for (let i = 0; i < 3; i++) {
    out.push(acquire(
      x + (Math.random() - 0.5) * 14,
      y - 1,
      (Math.random() - 0.5) * 1.4,
      -0.4 - Math.random() * 1.0,
      colors[i % colors.length],
      1.5 + Math.random() * 1.4,
      14,
    ));
  }
}
