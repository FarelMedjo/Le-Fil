// Objets de la table, vus de dessus : lampe, verre, trousse, manuel, fiches des répétiteurs, bilan du mois,
// tampon, logo TutorLab vectorisé. Repères locaux en millimètres, centrés sur l'objet.
import { el, g, n, prog, ease, easeOut, clamp, lerp, esc } from './util.js';
import { rect, circle, path, poly, curve, roundRect } from './draw.js';
import { Writing } from './write.js';

const INK = '#0B0E1A';
const F = { inter: 'Inter', grotesk: 'Space Grotesk', mono: 'JetBrains Mono' };
const text = (str, x, y, { size = 3, weight = 500, fill = INK, anchor = 'start', family = F.inter, spacing, op = 1 } = {}) =>
  el('text', { x: n(x), y: n(y), 'font-family': family, 'font-weight': weight, 'font-size': size, fill, 'text-anchor': anchor, 'letter-spacing': spacing, opacity: op < 1 ? n(op) : undefined }, esc(str));

// ---------- logo TutorLab (pictogramme), relevé sur assets/brand/tutorlab-logo-horizontal-sombre.png ----------
// Unités : pixels du PNG (956 × 158). Livre ouvert et point lime cerclé.
export const LOGO = {
  left: [[20, 75], [67.5, 86], [67.5, 134], [20, 122]],
  right: [[80, 86], [127, 75], [127, 122], [80, 134]],
  dot: [74, 42], ring: 23, inner: 12.5,
  center: [73.5, 76.5],
  ringColor: '#3C4C1C', page: '#F5F7FF',
};
export function logoMark({ center = false, dot = 1 } = {}) {
  const tf = center ? `translate(${-LOGO.center[0]} ${-LOGO.center[1]})` : '';
  let s = poly(LOGO.left, { fill: LOGO.page }) + poly(LOGO.right, { fill: LOGO.page });
  s += path('M67.5 86V134M80 86V134', { stroke: '#989AA2', 'stroke-width': 1.2 });
  if (dot > 0) s += circle(...LOGO.dot, LOGO.ring * dot, { fill: LOGO.ringColor }) + circle(...LOGO.dot, LOGO.inner * dot, { fill: '#C8FF3E' });
  return g({ transform: tf }, s);
}

// ---------- décor ----------

export function lamp({ on = 1 } = {}) {
  let s = '';
  s += circle(0, 0, 46, { fill: '#1C2130' }) + circle(0, 0, 40, { fill: '#262C3D' }) + circle(-10, -10, 14, { fill: '#FFFFFF', opacity: 0.05 });
  s += circle(18, 10, 4, { fill: on > 0.5 ? '#C8FF3E' : '#3A4152' });
  // bras
  s += path('M0 0 L 120 70 L 230 60', { fill: 'none', stroke: '#1C2130', 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  s += circle(120, 70, 8, { fill: '#2C3346' });
  // abat-jour, vu du dessus
  s += g({ transform: 'translate(260 64) rotate(-10)' },
    el('ellipse', { cx: 0, cy: 0, rx: 62, ry: 50, fill: '#1A1F2D' }) +
    el('ellipse', { cx: -10, cy: -10, rx: 40, ry: 28, fill: '#FFFFFF', opacity: 0.06 }) +
    el('ellipse', { cx: 18, cy: 16, rx: 46, ry: 32, fill: '#FFD58A', opacity: n(0.22 * on) }));
  return s;
}

export function glass() {
  let s = '';
  s += circle(0, 0, 37, { fill: '#DDE6F0', opacity: 0.32 });
  s += circle(0, 0, 37, { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 2.2, opacity: 0.7 });
  s += circle(0, 0, 31, { fill: '#BFD3E8', opacity: 0.35 });
  s += circle(2, 3, 26, { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 0.8, opacity: 0.5 });
  s += path('M-24 -16 A 29 29 0 0 1 10 -28', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.85 });
  return s;
}

export function trousse() {
  let s = '';
  // crayons qui dépassent
  s += g({ transform: 'translate(70 -14) rotate(-8)' }, rect(0, -3.5, 60, 7, { fill: '#D9502E' }) + poly([[60, -3.5], [72, 0], [60, 3.5]], { fill: '#E9CFA4' }));
  s += g({ transform: 'translate(70 4) rotate(4)' }, rect(0, -3.5, 46, 7, { fill: '#2F6FD0' }) + poly([[46, -3.5], [56, 0], [46, 3.5]], { fill: '#E9CFA4' }));
  s += path(roundRect(-95, -32, 180, 64, 26), { fill: 'url(#waxTrousse)' });
  s += path(roundRect(-95, -32, 180, 64, 26), { fill: '#000', opacity: 0.12 });
  s += path('M-80 -6 H 70', { stroke: '#2B2F3A', 'stroke-width': 4 }) + path('M-80 -6 H 70', { stroke: '#9AA0AA', 'stroke-width': 1.5, 'stroke-dasharray': '1.2 1.2' });
  s += rect(66, -11, 14, 10, { rx: 2, fill: '#B9BFCA' });
  return s;
}

export function textbook(title = 'MATHS', level = '3e') {
  let s = '';
  s += rect(-95, -130, 190, 260, { rx: 3, fill: '#E8E2D2' });
  s += rect(-98, -133, 190, 260, { rx: 3, fill: '#2E7D6B' });
  s += rect(-98, -133, 14, 260, { fill: '#25685A' });
  s += poly([[-40, 40], [60, 40], [10, -50]], { fill: '#F2C14E', opacity: 0.9 });
  s += circle(40, -20, 30, { fill: '#F4EBD8', opacity: 0.85 });
  s += text(title, -70, -95, { size: 13, weight: 700, family: F.grotesk, fill: '#F4EBD8' });
  s += text(level, -70, -78, { size: 11, weight: 700, family: F.mono, fill: '#F2C14E' });
  return s;
}

// ---------- fiches des répétiteurs ----------

export const SUBJECT_COLORS = ['#3157A6', '#2F8A68', '#C65A36', '#C65A36'];

// Portrait illustré, sans ressemblance avec une personne réelle. Repère : centre du médaillon.
const LOOKS = [
  { skin: '#4E2F20', hair: 'short', top: '#3E64A8', bg: '#DCE6F7' }, // maths : jeune homme
  { skin: '#6E4A35', hair: 'grey', top: '#5D646F', bg: '#DDEFE6', glasses: true }, // physique-chimie : aîné
  { skin: '#7B5038', hair: 'wrap', top: '#7A1F3D', bg: '#F7E1D6', earrings: true }, // anglais
  { skin: '#3F261A', hair: 'puff', top: '#E07B39', bg: '#F7E1D6' }, // anglais, remplaçante
];
export function portrait(i, r = 20) {
  const L = LOOKS[i];
  const k = r / 20;
  let s = circle(0, 0, r, { fill: L.bg });
  let p = '';
  p += path('M-17 22 Q -16 9 -6 7 L 6 7 Q 16 9 17 22 Z', { fill: L.top });
  p += rect(-3.4, 1, 6.8, 7, { rx: 2, fill: L.skin });
  p += path('M-5 7 L0 11 L5 7', { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 0.9, opacity: 0.8 });
  if (L.hair === 'puff') p += circle(0, -14.5, 8.5, { fill: '#1B120D' });
  if (L.hair === 'wrap') p += path('M-9.5 -5 Q -12 -18 0 -19 Q 12 -18 9.5 -5 Q 6 -12 0 -12 Q -6 -12 -9.5 -5Z', { fill: '#7A1F3D' }) + circle(5, -17.5, 4.5, { fill: '#F2B134' });
  p += el('ellipse', { cx: 0, cy: -4.5, rx: 8, ry: 9.4, fill: L.skin });
  if (L.hair === 'short') p += path('M-8.2 -6 Q -9 -14.5 0 -14.6 Q 9 -14.5 8.2 -6 Q 6 -11 0 -11.2 Q -6 -11 -8.2 -6Z', { fill: '#17110D' });
  if (L.hair === 'grey') p += path('M-8.4 -5 Q -9 -14 0 -14.2 Q 9 -14 8.4 -5 Q 7.4 -9.8 4 -10.6 Q 0 -9.2 -4 -10.6 Q -7.4 -9.8 -8.4 -5Z', { fill: '#C9CCD2' });
  if (L.hair === 'puff') p += path('M-8.3 -6 Q -8.6 -13.4 0 -13.6 Q 8.6 -13.4 8.3 -6 Q 5 -10 0 -10.2 Q -5 -10 -8.3 -6Z', { fill: '#1B120D' });
  p += circle(-3, -4.6, 0.95, { fill: '#120D0A' }) + circle(3, -4.6, 0.95, { fill: '#120D0A' });
  p += path('M-2.6 -0.4 Q 0 1.5 2.6 -0.4', { fill: 'none', stroke: '#120D0A', 'stroke-width': 0.7, 'stroke-linecap': 'round' });
  if (L.glasses) p += rect(-6.2, -6.8, 5, 4.2, { rx: 1.2, fill: 'none', stroke: '#0B0E1A', 'stroke-width': 0.6 }) + rect(1.2, -6.8, 5, 4.2, { rx: 1.2, fill: 'none', stroke: '#0B0E1A', 'stroke-width': 0.6 });
  if (L.earrings) p += circle(-8.2, -2.4, 1.2, { fill: '#F2B134' }) + circle(8.2, -2.4, 1.2, { fill: '#F2B134' });
  s += `<clipPath id="pc${i}"><circle r="${r}"/></clipPath>`;
  s += g({ 'clip-path': `url(#pc${i})` }, g({ transform: `scale(${k})` }, p));
  return s;
}

// Tampon encreur « VÉRIFIÉ ».
export function stampMark(label, { k = 1, a = -12, ink = '#2B3FA0' } = {}) {
  if (k <= 0) return '';
  const sc = lerp(1.5, 1, ease(clamp(k * 1.4)));
  return g({ transform: `rotate(${a}) scale(${n(sc)})`, opacity: n(0.86 * clamp(k * 2)) },
    path(roundRect(-23, -7.5, 46, 15, 2.5), { fill: 'none', stroke: ink, 'stroke-width': 1.3, 'stroke-dasharray': '9 0.8 14 0.6 30 1' }) +
    path(roundRect(-21, -5.6, 42, 11.2, 1.6), { fill: 'none', stroke: ink, 'stroke-width': 0.45 }) +
    path('M-17.5 0.2l2.4 2.4 4.6-5', { fill: 'none', stroke: ink, 'stroke-width': 1.2, 'stroke-linecap': 'round' }) +
    text(label, 3, 2.2, { size: 5.6, weight: 700, family: F.mono, fill: ink, anchor: 'middle', spacing: 0.3 }));
}

// Une fiche de répétiteur (86 × 120 mm). `stamp` : avancement du tampon (0 → 1).
export function tutorCard(i, T, { stamp = 0, dim = 0, highlight = 0 } = {}) {
  const color = SUBJECT_COLORS[i];
  const subj = T.subjects[Math.min(i, 2)];
  let s = '';
  s += path(roundRect(-43, -60, 86, 120, 3.5), { fill: '#FFFEFA' });
  s += path(`M-43 -32V-56.5A3.5 3.5 0 0 1 -39.5 -60H39.5A3.5 3.5 0 0 1 43 -56.5V-32Z`, { fill: color });
  const size = subj.length > 13 ? 7.2 : 8.6;
  s += text(subj, 0, -42, { size, weight: 700, family: F.grotesk, fill: '#FFFFFF', anchor: 'middle' });
  s += g({ transform: 'translate(0 -6)' }, circle(0, 0, 21.5, { fill: '#FFFEFA' }) + portrait(i, 19.5));
  s += text(T.spec.toUpperCase(), 0, 23, { size: 3.2, weight: 700, family: F.mono, fill: color, anchor: 'middle', spacing: 0.6 });
  // ce que couvre le spécialiste, et le niveau
  s += text(T.topics[Math.min(i, 2)], 0, 31.5, { size: 3.6, weight: 600, fill: '#2B3040', anchor: 'middle' });
  s += text(T.cardLevel, 0, 37.5, { size: 3, weight: 500, fill: '#7A8194', anchor: 'middle' });
  if (highlight > 0) s += path(roundRect(-43, -60, 86, 120, 3.5), { fill: 'none', stroke: '#C8FF3E', 'stroke-width': 2.2, opacity: n(highlight) });
  s += g({ transform: 'translate(10 47)' }, stampMark(T.stamp, { k: stamp }));
  if (dim > 0) s += path(roundRect(-43, -60, 86, 120, 3.5), { fill: '#C7C9CF', opacity: n(0.65 * dim) });
  return s;
}

// ---------- bilan du mois (148 × 210 mm) ----------

const reportMemo = new Map();
function reportWriting(T, lang) {
  if (reportMemo.has(lang)) return reportMemo.get(lang);
  const w = new Writing(T.covered.map((ln, i) => ({ text: ln, x: -62, y: 22 + i * 9, font: 'print', xh: 2.6, wobble: 0.5, seed: 70 + i, at: [-9 + i, -8.5 + i] })));
  reportMemo.set(lang, w);
  return w;
}
export const REPORT_TICKS = [36.75, 37.5];
export function report(t, T, lang) {
  let s = '';
  s += rect(-74, -105, 148, 210, { fill: '#FFFFFF' });
  s += rect(-74, -105, 148, 210, { fill: 'url(#paperTex)', opacity: 0.5 });
  s += text(T.report, -62, -84, { size: 6.4, weight: 700, family: F.mono, spacing: 0.8 });
  s += g({ transform: 'translate(52 -88) scale(0.16)' }, circle(73.5, 76.5, 80, { fill: INK }) + logoMark());
  s += rect(-62, -76, 124, 0.5, { fill: INK });
  // séances réalisées : une coche par séance
  s += text(T.rows[0], -62, -62, { size: 3.6, weight: 600 });
  for (let i = 0; i < 8; i++) {
    const x = -62 + i * 14.5, y = -55;
    s += rect(x, y, 10, 10, { rx: 1.5, fill: 'none', stroke: '#9AA0AA', 'stroke-width': 0.5 });
    const k = ease(prog(t, REPORT_TICKS[0] + i * ((REPORT_TICKS[1] - REPORT_TICKS[0]) / 8), REPORT_TICKS[0] + (i + 1.4) * ((REPORT_TICKS[1] - REPORT_TICKS[0]) / 8)));
    if (k > 0) s += path(`M${x + 2} ${y + 5.2}l2.6 2.6 4.4-5.4`, { fill: 'none', stroke: '#2140A8', 'stroke-width': 1.3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': 11, 'stroke-dashoffset': n(11 * (1 - k)) });
  }
  // travail couvert
  s += text(T.rows[1], -62, -30, { size: 3.6, weight: 600 });
  const wr = reportWriting(T, lang);
  s += g({ transform: 'translate(0 -40)' }, path(wr.visible(99).map(({ pts }) => 'M' + pts.map((p) => `${n(p[0])} ${n(p[1])}`).join('L')).join(''), { fill: 'none', stroke: '#2140A8', 'stroke-width': 0.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  // progression : courbe dessinée, sans aucune note chiffrée
  s += text(T.rows[2], -62, 20, { size: 3.6, weight: 600 });
  s += path('M-58 80V30M-58 80H62', { stroke: '#9AA0AA', 'stroke-width': 0.5, fill: 'none' });
  const kc = ease(prog(t, 37.5, 38.0));
  const pts = [[-56, 74], [-36, 70], [-16, 62], [4, 58], [24, 46], [44, 40], [58, 32]];
  const d = curve(pts);
  s += path(d, { fill: 'none', stroke: '#C8FF3E', 'stroke-width': 5, opacity: 0.55, 'stroke-linecap': 'round', 'stroke-dasharray': 140, 'stroke-dashoffset': n(140 * (1 - kc)), style: 'mix-blend-mode:multiply' });
  s += path(d, { fill: 'none', stroke: INK, 'stroke-width': 0.9, 'stroke-linecap': 'round', 'stroke-dasharray': 140, 'stroke-dashoffset': n(140 * (1 - kc)) });
  s += g({ transform: 'translate(36 92)' }, stampMark('TUTORLAB', { k: prog(t, 38.0, 38.18), a: -8 }));
  return s;
}

// Trombone.
export function clip() {
  return path('M0 -14 V10 a4 4 0 0 0 8 0 V-10 a2.6 2.6 0 0 0 -5.2 0 V8', { fill: 'none', stroke: '#9AA3B2', 'stroke-width': 1.2, 'stroke-linecap': 'round' });
}
