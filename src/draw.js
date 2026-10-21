// Outils de dessin SVG partagés : définitions (filtres, motifs, dégradés), ombres portées, formes.
// Unités : millimètres du monde (la table), sauf mention contraire.
import { el, g, n } from './util.js';

export const INK = '#0B0E1A';
export const DEEP = '#05070F';
export const LIME = '#C8FF3E';
export const OK = '#4ADE80';
export const CREAM = '#FAFAF7';

// La lampe est en haut à gauche de la table : les ombres partent vers le bas à droite.
export const LIGHT = [0.42, 0.6];

const BLURS = [0.4, 0.9, 1.8, 3, 5, 8, 12];
export const blurId = (b) => {
  let best = 0;
  BLURS.forEach((v, i) => { if (Math.abs(v - b) < Math.abs(BLURS[best] - b)) best = i; });
  return `sh${best}`;
};

// Une ombre portée : la silhouette de `inner`, assombrie, floutée et décalée selon la hauteur (mm).
export function shadow(inner, h = 4, { op = 0.32, spread = 0 } = {}) {
  if (!inner) return '';
  const dx = LIGHT[0] * h, dy = LIGHT[1] * h;
  const b = 0.35 + h * 0.32 + spread;
  return g({ transform: `translate(${n(dx)} ${n(dy)})`, filter: `url(#${blurId(b)})`, opacity: n(op) }, inner);
}

// Objet posé : ombre + objet, transformés ensemble.
export function placed(inner, { x = 0, y = 0, r = 0, s = 1, h = 2, op = 1, shadowOp = 0.3 } = {}) {
  if (op <= 0.001) return '';
  const tf = `translate(${n(x)} ${n(y)}) rotate(${n(r)}) scale(${s})`;
  // l'ombre est calculée dans le repère de la table : elle ne tourne pas avec l'objet
  const dx = LIGHT[0] * h, dy = LIGHT[1] * h;
  const b = 0.35 + h * 0.32;
  return g({ opacity: op < 1 ? n(op) : undefined },
    g({ transform: `translate(${n(dx)} ${n(dy)})`, filter: `url(#${blurId(b)})`, opacity: n(shadowOp * Math.max(0.35, 1 - h / 160)) }, g({ transform: tf }, inner)) +
    g({ transform: tf }, inner));
}

export const rect = (x, y, w, h, o = {}) => el('rect', { x: n(x), y: n(y), width: n(w), height: n(h), ...o });
export const circle = (cx, cy, r, o = {}) => el('circle', { cx: n(cx), cy: n(cy), r: n(r), ...o });
export const path = (d, o = {}) => el('path', { d, ...o });
export const poly = (pts, o = {}) => el('polygon', { points: pts.map((p) => `${n(p[0])},${n(p[1])}`).join(' '), ...o });
export const line = (pts, o = {}) => el('polyline', { points: pts.map((p) => `${n(p[0])},${n(p[1])}`).join(' '), fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...o });

// Chemin lissé (Catmull-Rom → Bézier) passant par des points ; fermé si `close`.
export function curve(pts, close = false) {
  const P = close ? [pts.at(-1), ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts.at(-1)];
  let d = `M${n(P[1][0])} ${n(P[1][1])}`;
  for (let i = 1; i < P.length - 2; i++) {
    const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return close ? d + 'Z' : d;
}

// Rectangle aux coins arrondis en chemin (pour les découpes).
export const roundRect = (x, y, w, h, r) =>
  `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${n(r)} ${n(r)} 0 0 1 ${n(x + r)} ${n(y)}Z`;

// Textures précalculées (canvas), injectées une fois dans les définitions.
function noiseTile(size, seed, fn) {
  if (typeof document === 'undefined') return '';
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  let s = seed;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < size * size; i++) {
    const [R, G, B, A] = fn(r, i % size, Math.floor(i / size));
    img.data.set([R, G, B, A], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

let texCache = null;
function textures() {
  if (texCache) return texCache;
  texCache = {
    // fibres du papier : bruit clair et sombre très doux
    paper: noiseTile(256, 7, (r) => { const v = r(); return v > 0.5 ? [255, 255, 255, Math.round((v - 0.5) * 60)] : [90, 80, 60, Math.round((0.5 - v) * 34)]; }),
    // toile cirée : léger grain plastique
    cloth: noiseTile(128, 11, (r) => { const v = r(); return [255, 255, 255, Math.round(v * v * 26)]; }),
  };
  return texCache;
}

// Toile cirée à motifs wax : rosaces concentriques, feuilles et points, indigo, ocre et terracotta.
function waxTile() {
  const S = 140;
  let s = rect(0, 0, S, S, { fill: '#2B3A63' });
  const rosace = (cx, cy, k) => {
    let o = '';
    o += circle(cx, cy, 30 * k, { fill: '#3B4F86' });
    o += circle(cx, cy, 24 * k, { fill: '#C58B3C' });
    o += circle(cx, cy, 20 * k, { fill: '#2B3A63' });
    o += circle(cx, cy, 14 * k, { fill: '#A8533A' });
    o += circle(cx, cy, 9 * k, { fill: '#E8D7B0' });
    o += circle(cx, cy, 4.5 * k, { fill: '#2B3A63' });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      o += circle(cx + Math.cos(a) * 27 * k, cy + Math.sin(a) * 27 * k, 1.6 * k, { fill: '#E8D7B0' });
    }
    return o;
  };
  s += rosace(35, 35, 1) + rosace(105, 105, 1);
  // feuilles en diagonale
  const leaf = (cx, cy, a) => g({ transform: `translate(${cx} ${cy}) rotate(${a})` },
    path('M0 -16 C 9 -8 9 8 0 16 C -9 8 -9 -8 0 -16Z', { fill: '#3B4F86' }) +
    path('M0 -13 V13', { stroke: '#C58B3C', 'stroke-width': 1.4 }));
  s += leaf(105, 35, 45) + leaf(35, 105, -45) + leaf(0, 70, 0) + leaf(140, 70, 0) + leaf(70, 0, 90) + leaf(70, 140, 90);
  for (const [x, y] of [[70, 70], [0, 0], [140, 0], [0, 140], [140, 140]]) s += circle(x, y, 5, { fill: '#C58B3C' }) + circle(x, y, 2.2, { fill: '#2B3A63' });
  return `<pattern id="wax" width="${S}" height="${S}" patternUnits="userSpaceOnUse">${s}</pattern>`;
}

// Pagne wax des manches (plus petit, plus vif) : variantes par personnage.
function sleeveWax(id, base, a, b, c) {
  const S = 22;
  let s = rect(0, 0, S, S, { fill: base });
  s += circle(5.5, 5.5, 4.6, { fill: a }) + circle(5.5, 5.5, 2.6, { fill: c }) + circle(5.5, 5.5, 1.1, { fill: base });
  s += circle(16.5, 16.5, 4.6, { fill: b }) + circle(16.5, 16.5, 2.4, { fill: base }) + circle(16.5, 16.5, 1.1, { fill: a });
  s += path('M14 3 C 18 5 18 9 14 11 C 10 9 10 5 14 3Z', { fill: c, opacity: 0.85 });
  s += path('M3 14 C 7 16 7 20 3 22 C -1 20 -1 16 3 14Z', { fill: c, opacity: 0.85 });
  return `<pattern id="${id}" width="${S}" height="${S}" patternUnits="userSpaceOnUse" patternTransform="rotate(18)">${s}</pattern>`;
}

export function defs() {
  const T = textures();
  const blur = BLURS.map((b, i) => `<filter id="sh${i}" x="-22%" y="-22%" width="144%" height="144%" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0.02  0 0 0 0 0.03  0 0 0 0 0.07  0 0 0 1 0"/><feGaussianBlur stdDeviation="${b}"/></filter>`).join('');
  return `<defs>${blur}
<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.25"/></filter>
<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="smudge" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
${waxTile()}
${sleeveWax('waxParent', '#1F2D6B', '#E2762B', '#F2C14E', '#F4EBD8')}
${sleeveWax('waxTutorEn', '#7A1F3D', '#F2B134', '#2E8B7A', '#F7E8CF')}
${sleeveWax('waxTrousse', '#0E6B5C', '#F2C14E', '#D9502E', '#F7EBD3')}
<pattern id="seyesMain" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0H8" stroke="#8EA7D6" stroke-width="0.24"/><path d="M0 2H8M0 4H8M0 6H8M0 0V8" stroke="#BFCDE8" stroke-width="0.13"/></pattern>
<pattern id="grid5" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M5 0H0V5" fill="none" stroke="#C5CCDA" stroke-width="0.12"/></pattern>
<pattern id="blueprintPx" width="54" height="54" patternUnits="userSpaceOnUse"><path d="M54 0H0V54" fill="none" stroke="#B9CBF0" stroke-opacity="0.07" stroke-width="2"/></pattern>
<pattern id="blueprint" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#B9CBF0" stroke-opacity="0.07" stroke-width="0.25"/></pattern>
${T.paper ? `<pattern id="paperTex" width="40" height="40" patternUnits="userSpaceOnUse"><image href="${T.paper}" width="40" height="40"/></pattern>` : ''}
${T.cloth ? `<pattern id="clothTex" width="60" height="60" patternUnits="userSpaceOnUse"><image href="${T.cloth}" width="60" height="60"/></pattern>` : ''}
<linearGradient id="spineL" x1="1" x2="0" y1="0" y2="0"><stop offset="0" stop-color="#1A1F33" stop-opacity="0.28"/><stop offset="0.12" stop-color="#1A1F33" stop-opacity="0.08"/><stop offset="1" stop-color="#1A1F33" stop-opacity="0"/></linearGradient>
<linearGradient id="spineR" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#1A1F33" stop-opacity="0.28"/><stop offset="0.12" stop-color="#1A1F33" stop-opacity="0.08"/><stop offset="1" stop-color="#1A1F33" stop-opacity="0"/></linearGradient>
<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${LIME}" stop-opacity="0.6"/><stop offset="1" stop-color="${LIME}" stop-opacity="0"/></radialGradient>
<radialGradient id="screenGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#DDE7FF" stop-opacity="0.35"/><stop offset="1" stop-color="#DDE7FF" stop-opacity="0"/></radialGradient>
</defs>`;
}
