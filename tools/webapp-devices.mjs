// Gemeinsame Definitionen für die iPhone-Splash-Screens: Geräteliste, Dateinamen,
// Media-Queries und das Splash-SVG. Wird von tools/gen-splash.mjs (rendert die
// PNGs → brand-splash/) UND tools/build-webapp.mjs (verlinkt sie) genutzt, damit
// Dateinamen und <link>-media immer zusammenpassen.

export const DEVICES = [
  { cw: 375, ch: 667, dpr: 2 },  // SE 2/3, 8
  { cw: 414, ch: 896, dpr: 2 },  // XR, 11
  { cw: 375, ch: 812, dpr: 3 },  // X, XS, 11 Pro
  { cw: 414, ch: 896, dpr: 3 },  // XS Max, 11 Pro Max
  { cw: 390, ch: 844, dpr: 3 },  // 12, 13, 14
  { cw: 428, ch: 926, dpr: 3 },  // 12/13 Pro Max, 14 Plus
  { cw: 393, ch: 852, dpr: 3 },  // 14 Pro, 15, 16
  { cw: 430, ch: 932, dpr: 3 },  // 14/15 Pro Max, 15 Plus
  { cw: 360, ch: 780, dpr: 3 },  // 13 mini
];

export const ORIENTATIONS = ['portrait', 'landscape'];

export function splashFileName(d, orient) {
  return `splash/splash-${d.cw}x${d.ch}-${d.dpr}-${orient}.png`;
}

export function splashMedia(d, orient) {
  return `screen and (device-width: ${d.cw}px) and (device-height: ${d.ch}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: ${orient})`;
}

// Pixelmaße für eine Ausrichtung.
export function splashPixels(d, orient) {
  const pw = d.cw * d.dpr, ph = d.ch * d.dpr;
  return orient === 'portrait' ? [pw, ph] : [ph, pw];
}

// Startbild: Himmel + Titel + Stern, füllt jede Größe.
export function splashSvg(w, h) {
  const s = Math.min(w, h);
  const cx = w / 2, cy = h / 2;
  const star = s * 0.20;
  const titleSize = Math.round(s * 0.085);
  const subSize = Math.round(s * 0.045);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8ec9ff"/><stop offset="0.5" stop-color="#c9a7ff"/><stop offset="1" stop-color="#ffc2dd"/>
      </linearGradient>
      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fff3b0"/><stop offset="0.5" stop-color="#ffd23f"/><stop offset="1" stop-color="#f39c12"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <path d="M0 ${h * 0.82} Q${w * 0.28} ${h * 0.78} ${w * 0.55} ${h * 0.81} T${w} ${h * 0.80} V${h} H0 Z" fill="#8ad06a"/>
    <path d="M0 ${h * 0.88} Q${w * 0.32} ${h * 0.84} ${w * 0.60} ${h * 0.87} T${w} ${h * 0.86} V${h} H0 Z" fill="#6bbd52"/>
    <g transform="translate(${cx} ${cy - s * 0.10})">
      <path transform="scale(${star / 118})" d="M0,-118 L34,-38 L120,-38 L50,14 L78,98 L0,48 L-78,98 L-50,14 L-120,-38 L-34,-38 Z"
            fill="url(#g2)" stroke="#e08a10" stroke-width="7" stroke-linejoin="round"/>
    </g>
    <text x="${cx}" y="${cy + s * 0.16}" text-anchor="middle" font-family="Verdana,Geneva,sans-serif" font-weight="bold"
          font-size="${titleSize}" fill="#4a3570">Lea &amp; Fiona</text>
    <text x="${cx}" y="${cy + s * 0.16 + subSize * 1.5}" text-anchor="middle" font-family="Verdana,Geneva,sans-serif"
          font-size="${subSize}" fill="#6a5a86">im Abenteuerland</text>
  </svg>`;
}
