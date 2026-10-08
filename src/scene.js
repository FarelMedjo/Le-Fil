// Les huit plans du film, rendus en SVG pour un instant t (secondes).
// Un seul fil lime traverse tout le film : chaque plan reprend la ligne là où le précédent l'a laissée.
import {
  clamp, lerp, prog, ease, easeInOut, easeIn, cubicBezier, anim, keys,
  spline, arc, polyline, Fil, d, el, g, esc, measure, rand,
} from './util.js';
import { COLORS as C, W, H } from './timeline.js';
import { LABELS } from './texts.js';
import { bust, pencilHand, eraser, phone, corners, avatar, SKIN } from './figures.js';

const LIME = C.lime;
const INK = C.ink;
const ROUND = { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
const hesitant = cubicBezier(0.25, 0.1, 0.2, 1);

export const DEFS = `<defs>
<filter id="glow" filterUnits="userSpaceOnUse" x="-4000" y="-8000" width="12000" height="16000"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="blur" filterUnits="userSpaceOnUse" x="-4000" y="-8000" width="12000" height="16000"><feGaussianBlur stdDeviation="16"/></filter>
<pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="#DFE5EE" stroke-width="2"/></pattern>
<pattern id="blueprint" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M60 0H0V60" fill="none" stroke="#B9CBF0" stroke-opacity="0.07" stroke-width="2"/></pattern>
<radialGradient id="lampPool" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFE6AE" stop-opacity="0.75"/><stop offset="1" stop-color="#FFE6AE" stop-opacity="0"/></radialGradient>
<radialGradient id="warm" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FFF3D6"/><stop offset="1" stop-color="#F6E7C8"/></radialGradient>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cream}"/><stop offset="1" stop-color="#EFE7DA"/></linearGradient>
<radialGradient id="halo" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${LIME}" stop-opacity="0.55"/><stop offset="1" stop-color="${LIME}" stop-opacity="0"/></radialGradient>
</defs>`;

// ---------- le fil ----------

function stroke(pts, { w = 9, op = 1, dark = false, glow = 1, dash } = {}) {
  if (!pts || pts.length < 2 || op <= 0.001) return '';
  const dd = d(pts);
  let s = '';
  if (!dark) s += el('path', { d: dd, ...ROUND, stroke: INK, 'stroke-opacity': 0.14 * op, 'stroke-width': w + 4 });
  if (glow > 0) {
    s += el('path', {
      d: dd, ...ROUND, stroke: LIME, filter: 'url(#glow)',
      'stroke-opacity': Math.min(1, (dark ? 0.8 : 0.7) * op * glow), 'stroke-width': w * (dark ? 3.2 : 2.6),
    });
  }
  s += el('path', { d: dd, ...ROUND, stroke: LIME, 'stroke-opacity': op, 'stroke-width': w, 'stroke-dasharray': dash });
  return s;
}

function tip(p, { w = 9, op = 1, pulse = 0 } = {}) {
  if (!p || op <= 0) return '';
  return el('circle', { cx: p[0], cy: p[1], r: w * (2.2 + pulse * 4), fill: LIME, 'fill-opacity': 0.45 * op, filter: 'url(#glow)' }) +
    el('circle', { cx: p[0], cy: p[1], r: w * 0.8, fill: LIME, 'fill-opacity': op });
}

// Un segment de fil tracé entre t0 et t1.
function trace(fil, t, t0, t1, opts = {}, fn = ease) {
  const k = fn(prog(t, t0, t1));
  if (k <= 0) return '';
  let s = stroke(fil.slice(0, k), opts);
  if (k < 1 && opts.head !== false) s += tip(fil.at(k), opts);
  return s;
}

const cam = (cx, cy, z) => `translate(${W / 2} ${H / 2}) scale(${z}) translate(${-cx} ${-cy})`;
const toScreen = ([x, y], [cx, cy, z]) => [(x - cx) * z + W / 2, (y - cy) * z + H / 2];

// ---------- textes posés dans l'image ----------

const FONT = { inter: 'Inter', mono: 'JetBrains Mono', grotesk: 'Space Grotesk' };

function chip(text, x, y, { size = 40, op = 1, anchor = 'start', family = FONT.inter, weight = 600, opt }) {
  if (!opt.text || op <= 0) return '';
  const tw = measure(text, `${weight} ${size}px "${family}"`);
  const pad = size * 0.62, h = size * 1.86, w = tw + pad * 2;
  const x0 = anchor === 'middle' ? x - w / 2 : x;
  return g({ transform: `translate(${x0} ${y})`, opacity: op },
    el('rect', { x: 0, y: 0, width: w, height: h, rx: h / 2, fill: '#FFFFFF', stroke: INK, 'stroke-width': 3 }) +
    el('circle', { cx: pad * 0.62, cy: h / 2, r: 6, fill: LIME, stroke: INK, 'stroke-width': 2 }) +
    el('text', { x: pad + 6, y: h / 2 + size * 0.36, 'font-family': family, 'font-weight': weight, 'font-size': size, fill: INK }, esc(text)));
}

function label(text, x, y, { size = 38, op = 1, family = FONT.inter, weight = 600, fill = INK, spacing = 0, opt, anchor = 'start' }) {
  if (!opt.text || op <= 0) return '';
  return el('text', {
    x, y, opacity: op, 'font-family': family, 'font-weight': weight, 'font-size': size, fill,
    'letter-spacing': spacing || undefined, 'text-anchor': anchor,
  }, esc(text));
}

// ---------- plan 0 : la page de cahier ----------

const RISE = new Fil(spline([[196, 1530], [238, 1452], [300, 1336], [370, 1212], [440, 1104], [502, 1016], [560, 960]], 16));
const DROOP = new Fil(spline([[560, 960], [588, 970], [610, 1002], [624, 1052]], 12));
const R0F = 0.6; // la gomme efface la ligne à partir d'ici
const S0 = [560, 960]; // point de blocage (mi-hauteur)
const ERASE = new Fil(polyline(RISE.slice(R0F, 1), DROOP.pts));
const CRUMBS = (() => { const r = rand(7); return Array.from({ length: 9 }, () => [r(), r() * 40 - 20, r() * 40 - 20, 4 + r() * 5]); })();

function pageBackground() {
  return el('rect', { x: 0, y: 0, width: W, height: H, fill: C.paper }) +
    el('rect', { x: 0, y: 0, width: W, height: H, fill: 'url(#grid)' }) +
    el('path', { d: 'M150 0V1920', stroke: '#E8C2BC', 'stroke-width': 3 });
}

// État de la ligne du plan 0 (après 0:04 : état final, ligne à moitié effacée).
function firstLine(t, { live = true } = {}) {
  const rise = hesitant(prog(t, 0.3, 1.875));
  const droop = ease(prog(t, 2.1, 2.42));
  const ghost = keys(t, [[2.5, 1], [2.95, 0.5], [3.125, 0.5], [3.55, 0.2]]);
  let s = '';
  s += stroke(RISE.slice(0, Math.min(rise, R0F)));
  if (rise > R0F) s += stroke(RISE.slice(R0F, rise), { op: ghost, glow: ghost });
  if (droop > 0) s += stroke(DROOP.slice(0, droop), { op: ghost, glow: ghost });
  if (live) {
    if (t > 0.3 && t < 1.875) s += tip(RISE.at(rise));
    if (t >= 1.875 && t < 2.1) s += tip(S0, { op: 0.7 });
    if (t >= 2.1 && t < 2.42) s += tip(DROOP.at(droop));
  }
  // miettes de gomme
  const crumbs = prog(t, 2.6, 3.0);
  if (crumbs > 0) {
    for (const [f, dx, dy, r] of CRUMBS) {
      const p = ERASE.at(f);
      s += el('ellipse', { cx: p[0] + dx + 30, cy: p[1] + dy + 10, rx: r, ry: r * 0.6, fill: '#C9CED8', opacity: crumbs * 0.9 });
    }
  }
  return s;
}

function plan0Props(t) {
  let s = '';
  // main de l'élève
  const rise = hesitant(prog(t, 0.3, 1.875));
  const droop = ease(prog(t, 2.1, 2.42));
  let p = t < 1.875 ? RISE.at(rise) : t < 2.1 ? S0 : DROOP.at(droop);
  const away = easeIn(prog(t, 2.42, 2.85));
  if (away < 1) {
    s += pencilHand({ x: p[0] + away * 520, y: p[1] + away * 760, angle: 56, skin: SKIN[3], sleeve: '#A9BEDA' });
  }
  // gomme
  if (t > 2.35 && t < 3.95) {
    const inK = ease(prog(t, 2.35, 2.5));
    const pass = t < 2.95 ? 1 - ease(prog(t, 2.5, 2.95)) : t < 3.125 ? 0 : ease(prog(t, 3.125, 3.55));
    const out = easeIn(prog(t, 3.6, 3.95));
    const q = ERASE.at(pass);
    s += eraser({ x: q[0] + 40 + (1 - inK) * 600 + out * 700, y: q[1] + 6 + (1 - inK) * 300 + out * 200, angle: -24 + pass * 10 });
  }
  return s;
}

// ---------- calque A : table du soir, cadrage, spécialistes, maison (0:00 → 0:30) ----------

const N = { x: 96, y: 1150, w: 400 };
N.s = N.w / W;
N.h = H * N.s;
const toN = ([x, y]) => [N.x + x * N.s, N.y + y * N.s];

const PH = { x: 560, y: 1000, w: 230, h: 430 };
const BUB = { x: 602, y: 1182, w: 150, h: 82, r: 24 };
const bubblePath = () => {
  const { x, y, w, h, r } = BUB;
  return polyline(
    [[x + 14, y + h + 22], [x + 6, y + h]],
    arc(x + r, y + h - r, r, Math.PI * 0.5, Math.PI, 8),
    arc(x + r, y + r, r, Math.PI, Math.PI * 1.5, 8),
    arc(x + w - r, y + r, r, Math.PI * 1.5, Math.PI * 2, 8),
    arc(x + w - r, y + h - r, r, 0, Math.PI * 0.5, 8),
    [[x + 34, y + h], [x + 14, y + h + 22]],
  );
};

// Coordonnées-monde : plan 2 au-dessus de la table, plan 3 au-dessus du plan 2, maison à droite du plan 3.
const P2 = -1920, P3 = -3840, HX = 1080;
const CIRCLE = { x: 400, y: 900 + P2, r: 220 };
const TUTORS = [261, 540, 820];
const TUT_Y = 1090 + P3;
const SPLIT = [540, 1600 + P3];

const A1 = new Fil(spline([toN(RISE.at(R0F)), [330, 1600], [450, 1612], [540, 1560], [616, 1480], [660, 1432]], 14));
const A2 = new Fil(polyline([[660, 1432], [652, 1400], [622, 1330]], bubblePath()));
const A3 = new Fil(polyline(
  spline([[677, BUB.y], [677, 1100], [677, 1010], [760, 962], [880, 930], [950, 790], [952, 420], [952, 0], [950, -300], [900, 1450 + P2], [700, 1310 + P2], [520, 1150 + P2], [CIRCLE.x, CIRCLE.y + CIRCLE.r]], 16),
));
const A4 = new Fil(arc(CIRCLE.x, CIRCLE.y, CIRCLE.r, Math.PI * 0.5, Math.PI * 2.5, 120));
const A5 = new Fil(spline([[CIRCLE.x, CIRCLE.y + CIRCLE.r], [560, 1112 + P2], [700, 990 + P2], [770, 700 + P2], [782, 300 + P2], [780, -100 + P2], [740, 1760 + P3], [640, 1660 + P3], SPLIT], 16));
const THREADS = [
  new Fil(spline([SPLIT, [430, 1540 + P3], [300, 1430 + P3], [262, 1300 + P3], [261, 1182 + P3]], 16)),
  new Fil(spline([SPLIT, [566, 1470 + P3], [522, 1330 + P3], [540, 1182 + P3]], 16)),
  new Fil(spline([SPLIT, [650, 1540 + P3], [780, 1430 + P3], [818, 1300 + P3], [820, 1182 + P3]], 16)),
];
const THREAD_T = [18.125, 18.75, 19.375];
const THREAD_STYLE = [{ w: 8 }, { w: 9, dash: '22 5' }, { w: 11 }]; // crayon, craie, feutre
const HOUSE = new Fil(polyline(
  spline([[905, 1140 + P3], [990, 1230 + P3], [1060, 1330 + P3]], 10),
  [[HX - 40 + 80, 1330 + P3], [HX + 280, 1330 + P3], [HX + 280, 930 + P3], [HX + 540, 650 + P3], [HX + 800, 930 + P3], [HX + 800, 1330 + P3],
    [HX + 610, 1330 + P3], [HX + 610, 1110 + P3], [HX + 470, 1110 + P3], [HX + 470, 1330 + P3]],
));
const DOOR = { x: HX + 470, y: 1110 + P3, w: 140, h: 220 };
const DOOR_C = [DOOR.x + DOOR.w / 2, DOOR.y + DOOR.h / 2];

function cameraA(t) {
  const z0 = 1 / N.s;
  const c0 = [N.x + N.w / 2, N.y + N.h / 2];
  if (t < 3.75) return [...c0, z0];
  if (t < 9.45) {
    const k = easeInOut(prog(t, 3.75, 6.5));
    const z = Math.exp(lerp(Math.log(z0), 0, k));
    // le centre suit le zoom pour que la page reste ancrée pendant le recul
    const m = (z0 - z) / (z0 - 1);
    return [lerp(c0[0], 540, m), lerp(c0[1], 960, m), z];
  }
  if (t < 16.3) return [540, keys(t, [[9.45, 960], [10.75, 960 + P2]]), 1];
  if (t < 26.875) return [540, keys(t, [[16.3, 960 + P2], [17.55, 960 + P3]]), 1];
  if (t < 28.15) return [keys(t, [[26.875, 540], [28.05, 540 + HX]]), 960 + P3, 1];
  // zoom vers la porte, arrêt pendant les coups, puis entrée
  const zA = keys(t, [[28.15, 1], [28.7, 2.3], [29.375, 2.3], [29.95, 16, easeIn]]);
  const cy = keys(t, [[28.15, 960 + P3], [28.7, DOOR_C[1] - 140], [29.375, DOOR_C[1] - 140], [29.95, DOOR_C[1], easeIn]]);
  const cx = keys(t, [[28.15, 540 + HX], [28.7, DOOR_C[0]]]);
  return [cx, cy, zA];
}

function tableScene(t, opt) {
  let s = '';
  s += el('rect', { x: -400, y: -300, width: 1880, height: 1160, fill: 'url(#wall)' });
  // lampe
  s += el('path', { d: 'M196 1000 L150 830 L262 718', fill: 'none', stroke: '#1F2638', 'stroke-width': 13, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  // parent
  s += bust({ x: 676, y: 990, s: 1.02, skin: SKIN[1], top: '#45506A', hair: 'wrap', collar: '#E9EDF5' });
  // table
  s += el('rect', { x: -400, y: 860, width: 1880, height: 1300, fill: '#E2CDAA' });
  s += el('rect', { x: -400, y: 860, width: 1880, height: 16, fill: '#CDB28A' });
  for (const [y, a] of [[960, 0.5], [1130, 0.35], [1390, 0.45], [1660, 0.35], [1830, 0.4]]) {
    s += el('path', { d: `M-400 ${y} C 200 ${y - 30}, 600 ${y + 30}, 1480 ${y - 10}`, fill: 'none', stroke: '#D3BA92', 'stroke-width': 3, 'stroke-opacity': a });
  }
  s += el('ellipse', { cx: 300, cy: 1420, rx: 560, ry: 520, fill: 'url(#lampPool)' });
  s += el('ellipse', { cx: 196, cy: 1004, rx: 74, ry: 24, fill: '#1F2638' });
  s += el('path', { d: 'M222 700 L330 668 L372 790 Q300 836 214 812 Z', fill: '#1F2638' });
  s += el('ellipse', { cx: 296, cy: 806, rx: 40, ry: 12, fill: '#FFE6AE' });
  // cahier : ombre, couverture, page
  s += el('rect', { x: N.x + 10, y: N.y + 16, width: N.w, height: N.h, rx: 8, fill: 'rgba(11,14,26,0.18)', filter: 'url(#blur)' });
  s += el('rect', { x: N.x - 8, y: N.y - 6, width: N.w + 16, height: N.h + 12, rx: 10, fill: '#2B3245' });
  s += g({ transform: `translate(${N.x} ${N.y}) scale(${N.s})` }, pageBackground() + firstLine(t, { live: t < 3 }) + (t < 4 ? plan0Props(t) : ''));
  // téléphone
  const sent = prog(t, 7.5, 8.1);
  let screen = '';
  screen += el('rect', { x: PH.x + 24, y: PH.y + 58, width: PH.w - 48, height: 16, rx: 8, fill: '#E3E7EF' });
  screen += el('rect', { x: PH.x + 26, y: PH.y + 96, width: 118, height: 44, rx: 18, fill: '#E3E7EF' });
  screen += el('rect', { x: PH.x + 26, y: PH.y + 150, width: 84, height: 40, rx: 18, fill: '#E3E7EF' });
  const filled = prog(t, 6.2, 6.5);
  if (filled > 0) screen += el('rect', { x: BUB.x, y: BUB.y, width: BUB.w, height: BUB.h, rx: BUB.r, fill: '#FFFFFF', opacity: filled });
  if (sent > 0 && sent < 1) {
    const k = ease(sent);
    screen += g({ opacity: 1 - k, transform: `translate(0 ${-150 * k})` },
      el('rect', { x: BUB.x, y: BUB.y, width: BUB.w, height: BUB.h, rx: BUB.r, fill: '#FFFFFF', stroke: LIME, 'stroke-width': 7 }));
  }
  if (t > 7.6) {
    const k = ease(prog(t, 7.6, 7.9));
    screen += el('path', { d: `M${BUB.x + BUB.w - 46} ${BUB.y + BUB.h + 30}l10 10l20 -22`, fill: 'none', stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: k });
  }
  s += phone({ ...PH, inner: screen });
  // bras et mains du parent
  s += el('path', { d: 'M572 800 Q520 960 572 1158', fill: 'none', stroke: '#45506A', 'stroke-width': 66, 'stroke-linecap': 'round' });
  s += el('path', { d: 'M780 800 Q832 960 780 1158', fill: 'none', stroke: '#3B455C', 'stroke-width': 66, 'stroke-linecap': 'round' });
  s += el('ellipse', { cx: 566, cy: 1196, rx: 30, ry: 48, fill: SKIN[1] });
  s += el('ellipse', { cx: 786, cy: 1196, rx: 30, ry: 48, fill: SKIN[1] });
  return s;
}

function plan2Scene(t, opt) {
  let s = '';
  const k = ease(prog(t, 10.05, 10.6));
  if (k > 0) {
    s += el('text', {
      x: CIRCLE.x, y: CIRCLE.y + 44, 'text-anchor': 'middle', 'font-family': FONT.mono, 'font-weight': 700, 'font-size': 128,
      fill: INK, opacity: opt.text ? k : 0, transform: `translate(${CIRCLE.x} ${CIRCLE.y}) scale(${0.9 + 0.1 * k}) translate(${-CIRCLE.x} ${-CIRCLE.y})`,
    }, '48 h');
  }
  // étiquettes T2b : une par temps
  const labels = LABELS.T2b[opt.lang];
  const times = [13.125, 13.75, 14.375, 15.0];
  const fade = 1 - prog(t, 16.0, 16.25);
  const pos = [[108, 1190], [null, 1190], [108, 1300], [null, 1300]];
  let x = 108;
  labels.forEach((lab, i) => {
    const font = `600 40px "${FONT.inter}"`;
    const w = measure(lab, font) + 40 * 0.62 * 2 + 12;
    if (i % 2 === 0) x = 108;
    const k2 = ease(prog(t, times[i] - 0.06, times[i] + 0.32));
    if (k2 > 0) s += chip(lab, x, pos[i][1] + P2 - 70 * (1 - k2), { op: Math.min(1, k2 * 2) * fade, opt });
    x += w + 22;
  });
  return s;
}

function plan3Scene(t, opt) {
  let s = '';
  const looks = [
    { skin: SKIN[3], top: '#3E4A63', hair: 'short', glasses: false, collar: '#F5F7FC' },
    { skin: SKIN[1], top: '#8A6248', hair: 'bun', glasses: true, collar: '#F3E7DA' },
    { skin: SKIN[2], top: '#55624A', hair: 'grey', glasses: true, collar: '#EEF1E6' },
  ];
  TUTORS.forEach((x, i) => {
    const k = ease(prog(t, 16.95 + i * 0.15, 17.5 + i * 0.15));
    if (k > 0) s += bust({ x, y: TUT_Y + 30 * (1 - k), s: 0.86, op: k, ...looks[i] });
  });
  // fils vers chaque répétiteur
  THREADS.forEach((f, i) => { s += trace(f, t, 17.5, THREAD_T[i], THREAD_STYLE[i], ease); });
  // étiquettes T3b
  const labs = LABELS.T3b[opt.lang];
  const out = 1 - prog(t, 26.55, 26.8);
  labs.forEach((lab, i) => {
    const k = ease(prog(t, THREAD_T[i] - 0.05, THREAD_T[i] + 0.3));
    if (k > 0) s += chip(lab, TUTORS[i], TUT_Y + 12 + 20 * (1 - k), { size: 36, anchor: 'middle', op: k * out, opt });
  });
  return s;
}

function houseScene(t) {
  let s = '';
  const doorOpen = ease(prog(t, 29.375, 29.75));
  const knock = Math.max(Math.exp(-(((t - 28.75) * 30) ** 2)), Math.exp(-(((t - 29.06) * 30) ** 2)));
  const shadow = ease(prog(t, 28.6, 28.95));
  const { x, y, w, h } = DOOR;
  // lumière chaude derrière la porte
  s += el('rect', { x, y, width: w, height: h, fill: 'url(#warm)' });
  // battant (charnière à gauche)
  const pw = w * (1 - 0.85 * doorOpen);
  s += g({ transform: `translate(${knock * 2.5} 0)` },
    el('rect', { x, y, width: pw, height: h, fill: '#F1EDE4' }) +
    el('rect', { x: x + pw * 0.2, y: y + 30, width: pw * 0.6, height: 70, rx: 6, fill: '#DCE3EE' }) +
    el('ellipse', { cx: x + pw * 0.5, cy: y + 80, rx: pw * 0.18, ry: 34, fill: INK, opacity: 0.4 * shadow * (1 - doorOpen) }) +
    el('circle', { cx: x + pw - 18, cy: y + 130, r: 7, fill: INK }));
  return s;
}

function layerA(t, opt) {
  const camera = cameraA(t);
  let world = '';
  world += el('rect', { x: -4000, y: -8000, width: 12000, height: 16000, fill: C.cream });
  if (t < 11) world += tableScene(t, opt);
  if (t > 9 && t < 17.8) world += plan2Scene(t, opt);
  if (t > 16 && t < 29) world += plan3Scene(t, opt);
  if (t > 26.5) world += houseScene(t);
  // le fil
  const head = t < 26.875 ? {} : { head: false };
  world += trace(A1, t, 4.375, 5.625, {}, easeInOut);
  world += trace(A2, t, 5.625, 6.25, {}, easeInOut);
  world += trace(A3, t, 9.375, 10.35, {}, easeInOut);
  world += trace(A4, t, 10.35, 11.25, {}, easeInOut);
  world += trace(A5, t, 16.25, 17.5, head, easeInOut);
  if (t > 26.875) world += trace(HOUSE, t, 26.875, 28.1, {}, easeInOut);
  // coins de cadrage autour de la maison
  if (t > 28.0 && t < 29.4) world += corners({ x: HX + 230, y: 600 + P3, w: 620, h: 780, op: ease(prog(t, 28.1, 28.5)) * (1 - prog(t, 29.2, 29.4)) });
  return { svg: g({ transform: cam(...camera) }, world), camera };
}

// ---------- calque C : intérieur (0:29,4 → 0:31,2) ----------

function layerC(t, camA) {
  const open = prog(t, 29.375, 29.7);
  if (open <= 0 || t > 31.3) return '';
  // clip = la porte vue par la caméra du calque A, puis tout l'écran
  const a = toScreen([DOOR.x, DOOR.y], camA), b = toScreen([DOOR.x + DOOR.w, DOOR.y + DOOR.h], camA);
  const clip = `<clipPath id="doorClip"><rect x="${a[0]}" y="${a[1]}" width="${b[0] - a[0]}" height="${b[1] - a[1]}"/></clipPath>`;
  const settle = ease(prog(t, 29.6, 30.25));
  const dive = easeIn(prog(t, 30.55, 31.25));
  const z = lerp(1.25, 1, ease(prog(t, 29.375, 30.2))) * Math.exp(dive * Math.log(4.2));
  const cx = 540, cy = lerp(1000, 1326, dive);
  let s = '';
  s += el('rect', { x: -2000, y: -2000, width: 5000, height: 6000, fill: '#F3ECE0' });
  s += el('rect', { x: 110, y: 560, width: 250, height: 300, rx: 8, fill: '#FFF4DA', stroke: '#D9CBB2', 'stroke-width': 10 });
  s += el('path', { d: 'M235 560V860M110 710H360', stroke: '#D9CBB2', 'stroke-width': 8 });
  // enfant (s'installe) et répétiteur
  s += bust({ x: lerp(120, 340, settle), y: 1330, s: 1.15, skin: SKIN[0], top: '#CDB98F', hair: 'short', collar: '#E6DCC2' });
  s += bust({ x: 745, y: 1330, s: 1.36, skin: SKIN[2], top: '#55624A', hair: 'grey', glasses: true, collar: '#EEF1E6' });
  // table et cahier
  s += el('rect', { x: -400, y: 1292, width: 1880, height: 900, fill: '#E2CDAA' });
  s += el('rect', { x: -400, y: 1292, width: 1880, height: 18, fill: '#CDB28A' });
  s += el('polygon', { points: '400,1302 680,1302 716,1350 364,1350', fill: C.paper, stroke: '#2B3245', 'stroke-width': 4 });
  s += el('path', { d: 'M424 1342 Q474 1326 540 1320', ...ROUND, stroke: LIME, 'stroke-width': 4 });
  return clip + g({ 'clip-path': t < 30.0 ? 'url(#doorClip)' : undefined, opacity: 1 - prog(t, 31.0, 31.3) },
    g({ transform: cam(cx, cy, z) }, s));
}

// ---------- calque B : la page de l'enfant, le suivi, le paiement (0:30,9 → 0:50) ----------

const P5 = -1920, PX = 1080;
// Le crayon de l'enfant reprend la ligne là où la gomme l'avait laissée, retrouve le point de blocage, puis le franchit.
const B_APPROACH = new Fil(RISE.slice(R0F, 1));
const B_CROSS = new Fil(spline([S0, [636, 868], [736, 768], [838, 656], [916, 524], [950, 380], [956, 120], [954, -300], [948, 1350 + P5], [934, 1180 + P5], [930, 900 + P5], [930, 560 + P5]], 16));
const CAL = { x: 150, y: 520 + P5, w: 780, h: 640 };
const SHEET = { x: 170, y: 500 + P5, w: 740, h: 650 };
const ATTACH = [540, SHEET.y + SHEET.h];
const AV_Y = [1262, 1356, 1450].map((y) => y + P5);
const AV_X = 200;
const avThread = (y) => new Fil(spline([[AV_X + 40, y], [360, y - 6], [470, y - 40], [ATTACH[0], ATTACH[1] + 8]], 16));
const AV_THREADS = AV_Y.map(avThread);
const B_PHONE = new Fil(spline([[SHEET.x + SHEET.w, 880 + P5], [1000, 930 + P5], [PX + 140, 990 + P5], [PX + 300, 1000 + P5], [PX + 420, 1000 + P5]], 16));
const BPH = { x: PX + 270, y: 560 + P5, w: 540, h: 1060, r: 70 };
const CHECK = { x: PX + 540, y: 1000 + P5, r: 112 };

function cameraB(t) {
  if (t < 34.375) return [540, 960, 1];
  if (t < 43.75) return [540, keys(t, [[34.375, 960], [35.05, 960 + P5]]), 1];
  return [keys(t, [[43.75, 540], [44.9, 540 + PX]]), 960 + P5, 1];
}

function childHand(t) {
  const draw = prog(t, 31.25, 32.5);
  let p;
  if (t < 32.5) p = B_APPROACH.at(approachEase(draw));
  else p = B_CROSS.at(crossK(t));
  const enter = ease(prog(t, 30.9, 31.25));
  const leave = easeIn(prog(t, 33.6, 34.2));
  if (leave >= 1) return '';
  return pencilHand({ x: p[0] + (1 - enter) * 300 + leave * 600, y: p[1] + (1 - enter) * 500 + leave * 800, angle: 54, skin: SKIN[0], sleeve: '#CDB98F' });
}
const approachEase = (k) => 1 - (1 - k) ** 1.6; // ralentit à l'approche du blocage
const crossK = (t) => keys(t, [[32.5, 0], [34.375, 0.42, ease], [35.05, 1, easeInOut]]);

function calendar(t, opt) {
  const dim = ease(prog(t, 37.5, 37.9));
  let s = '';
  const { x, y, w, h } = CAL;
  s += el('rect', { x: x + 8, y: y + 18, width: w, height: h, rx: 28, fill: 'rgba(11,14,26,0.14)', filter: 'url(#blur)' });
  s += el('rect', { x, y, width: w, height: h, rx: 28, fill: '#FFFFFF', stroke: '#E1E5EC', 'stroke-width': 2 });
  s += el('path', { d: `M${x} ${y + 120}V${y + 28}Q${x} ${y} ${x + 28} ${y}H${x + w - 28}Q${x + w} ${y} ${x + w} ${y + 28}V${y + 120}Z`, fill: INK });
  for (const cx of [x + 180, x + w - 180]) s += el('rect', { x: cx - 9, y: y - 26, width: 18, height: 56, rx: 9, fill: '#5B6272' });
  s += el('rect', { x: x + 50, y: y + 48, width: 170, height: 22, rx: 11, fill: '#2B3245' });
  const rows = 4, cols = 7, top = y + 150, rowH = (h - 170) / rows, colW = (w - 80) / cols;
  const weekT = [35.0, 35.625, 36.25, 36.875];
  for (let r = 0; r < rows; r++) {
    const k = ease(prog(t, weekT[r], weekT[r] + 0.3));
    for (let c = 0; c < cols; c++) {
      const cx = x + 40 + colW * (c + 0.5), cy = top + rowH * (r + 0.42);
      const active = c === 1 || c === 3 || c === 5;
      s += el('circle', { cx, cy, r: 13, fill: active && k * cols > c ? INK : '#DCE1E9' });
    }
    if (k > 0) {
      const y0 = top + rowH * (r + 0.82);
      s += stroke([[x + 50, y0], [x + 50 + (w - 100) * k, y0 - 4]], { w: 7, glow: 0.6 });
    }
  }
  return g({ opacity: 1 - 0.65 * dim, transform: `translate(540 ${y + h / 2}) scale(${1 - 0.05 * dim}) translate(-540 ${-(y + h / 2)})` }, s);
}

function sheet(t, opt) {
  const k = ease(prog(t, 37.5, 37.98));
  if (k <= 0) return '';
  const { x, y, w, h } = SHEET;
  let s = '';
  s += el('rect', { x: x + 10, y: y + 22, width: w, height: h, rx: 22, fill: 'rgba(11,14,26,0.18)', filter: 'url(#blur)' });
  s += el('rect', { x, y, width: w, height: h, rx: 22, fill: '#FFFFFF', stroke: '#E1E5EC', 'stroke-width': 2 });
  s += label(LABELS.sheet[opt.lang], x + 60, y + 92, { size: 36, family: FONT.mono, weight: 700, spacing: 5, opt });
  s += el('rect', { x: x + 60, y: y + 122, width: w - 120, height: 3, fill: '#E1E5EC' });
  const labs = LABELS.T5[opt.lang];
  labs.forEach((lab, i) => {
    const ry = y + 200 + i * 140;
    const kl = ease(prog(t, 37.62 + i * 0.16, 37.95 + i * 0.16));
    s += label(lab, x + 60, ry, { size: 38, op: kl, opt });
    const kp = ease(prog(t, 37.8 + i * 0.18, 38.4 + i * 0.18));
    const rr = rand(31 + i);
    const pts = Array.from({ length: 7 }, (_, j) => [x + 60 + j * ((w - 220) / 6), ry + 70 - j * (6 + i * 2) - rr() * 14]);
    const f = new Fil(spline(pts, 10));
    s += stroke(f.slice(0, kp), { w: 6, glow: 0.4 });
    pts.forEach((p, j) => { if (kp * 6 >= j) s += el('circle', { cx: p[0], cy: p[1], r: 7, fill: INK }); });
  });
  // tampon
  const st = prog(t, 38.7, 38.82);
  if (st > 0) {
    const sc = lerp(1.6, 1, ease(st));
    const cx = x + w - 130, cy = y + h - 120;
    s += g({ transform: `translate(${cx} ${cy}) rotate(-14) scale(${sc})`, opacity: 0.88 * st },
      el('circle', { r: 74, fill: 'none', stroke: INK, 'stroke-width': 8, 'stroke-dasharray': '120 6 60 4 200 5' }) +
      el('circle', { r: 58, fill: 'none', stroke: INK, 'stroke-width': 3 }) +
      el('path', { d: 'M-28 2 L-8 22 L30 -22', fill: 'none', stroke: INK, 'stroke-width': 11, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
  }
  s += corners({ x: x - 24, y: y - 24, w: w + 48, h: h + 48, op: ease(prog(t, 38.0, 38.4)) });
  const slide = 1 - k;
  return g({ transform: `translate(${180 * slide} ${420 * slide}) rotate(${6 * slide} ${x + w / 2} ${y + h / 2})`, opacity: Math.min(1, k * 1.5) }, s);
}

function followUp(t) {
  let s = '';
  const show = ease(prog(t, 37.7, 38.1));
  if (show <= 0) return '';
  const fade = keys(t, [[40.0, 1], [40.6, 0.12]]);
  AV_THREADS.forEach((f, i) => {
    const op = i === 1 ? fade : 1;
    s += trace(f, t, 37.75, 38.35, { w: 7, op, glow: op, head: false });
    s += avatar({ x: AV_X, y: AV_Y[i], op: show * (i === 1 ? lerp(0.25, 1, fade) : 1) });
  });
  // nouveau fil, raccordé au même point
  const kn = prog(t, 41.4, 41.875);
  if (kn > 0) {
    s += avatar({ x: AV_X, y: AV_Y[1], variant: 1, op: ease(prog(t, 41.3, 41.55)) });
    s += trace(AV_THREADS[1], t, 41.45, 41.875, { w: 7 }, easeInOut);
  }
  const staple = ease(prog(t, 41.85, 41.95));
  if (staple > 0) {
    s += g({ transform: `translate(${ATTACH[0]} ${ATTACH[1] + 18}) scale(${lerp(1.4, 1, staple)})`, opacity: staple },
      el('path', { d: 'M-22 8 V-6 H22 V8', fill: 'none', stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }));
  }
  return s;
}

function paymentPhone(t) {
  let s = '';
  let screen = '';
  const { x, y, w, h } = BPH;
  screen += el('rect', { x: x + 170, y: y + 110, width: 200, height: 18, rx: 9, fill: '#E3E7EF' });
  const kc = ease(prog(t, 46.25, 46.6));
  screen += el('circle', { cx: CHECK.x, cy: CHECK.y, r: CHECK.r, fill: C.ok, 'fill-opacity': 0.16 * kc });
  screen += el('circle', { cx: CHECK.x, cy: CHECK.y, r: CHECK.r, fill: 'none', stroke: C.ok, 'stroke-width': 9, 'stroke-opacity': kc });
  const chk = new Fil([[CHECK.x - 48, CHECK.y + 4], [CHECK.x - 12, CHECK.y + 40], [CHECK.x + 52, CHECK.y - 34]]);
  if (kc > 0) screen += el('path', { d: d(chk.slice(0, kc)), ...ROUND, stroke: C.ok, 'stroke-width': 18 });
  const ring = prog(t, 46.875, 47.6);
  if (ring > 0 && ring < 1) screen += el('circle', { cx: CHECK.x, cy: CHECK.y, r: CHECK.r + 70 * ease(ring), fill: 'none', stroke: C.ok, 'stroke-width': 6, 'stroke-opacity': 1 - ring });
  for (const [yy, ww] of [[1210, 320], [1270, 240], [1330, 280]]) screen += el('rect', { x: CHECK.x - ww / 2, y: yy + P5, width: ww, height: 22, rx: 11, fill: '#E3E7EF' });
  screen += el('rect', { x: x + 70, y: y + h - 190, width: w - 140, height: 84, rx: 42, fill: 'rgba(11,14,26,0.08)' });
  s += phone({ x, y, w, h, r: BPH.r, inner: screen });
  s += corners({ x: x - 40, y: y - 40, w: w + 80, h: h + 80, op: ease(prog(t, 45.2, 45.6)) * (1 - prog(t, 49.2, 49.4)) });
  return s;
}

function layerB(t, opt) {
  const camera = cameraB(t);
  let world = '';
  world += el('rect', { x: -4000, y: -8000, width: 12000, height: 16000, fill: C.cream });
  if (t < 35.2) {
    world += pageBackground();
    world += firstLine(10, { live: false });
    // retour sur la ligne : elle s'amincit à l'approche du blocage
    const draw = prog(t, 31.25, 32.5);
    const thin = keys(t, [[32.3, 9], [32.48, 5.5], [32.5, 12, ease], [33.2, 10]]);
    if (draw > 0) {
      world += stroke(B_APPROACH.slice(0, approachEase(draw)), { w: t < 32.5 ? thin : 9 });
      if (t < 32.5) world += tip(B_APPROACH.at(approachEase(draw)), { w: thin });
    }
  }
  if (t >= 32.5) {
    const k = crossK(t);
    const thin = keys(t, [[32.5, 12, ease], [33.2, 10]]);
    world += stroke(B_CROSS.slice(0, k), { w: thin, glow: 1 + 0.8 * Math.exp(-(t - 32.5) * 2.2) });
    if (k < 1) world += tip(B_CROSS.at(k), { w: thin });
    // franchissement : halo
    const burst = prog(t, 32.5, 33.4);
    if (burst > 0 && burst < 1) {
      world += el('circle', { cx: S0[0], cy: S0[1], r: 40 + 260 * ease(burst), fill: 'none', stroke: LIME, 'stroke-width': 10 * (1 - burst), 'stroke-opacity': 1 - burst, filter: 'url(#glow)' });
      world += el('circle', { cx: S0[0], cy: S0[1], r: 140 * (1 - burst * 0.5), fill: 'url(#halo)', opacity: 1 - burst });
    }
  }
  if (t < 34.3) world += childHand(t);
  if (t > 34.3 && t < 45.2) {
    world += calendar(t, opt);
    world += followUp(t);
    world += sheet(t, opt);
  }
  if (t > 43.7) {
    world += trace(B_PHONE, t, 43.75, 45.0, { w: 9 }, easeInOut);
    world += paymentPhone(t);
  }
  return g({ transform: cam(...camera) }, world);
}

// ---------- calque sombre : la Trajectoire (0:50 → 1:00) ----------

const TRAJ = new Fil(spline([[110, 1236], [240, 1200], [370, 1126], [490, 1024], [610, 914], [740, 816], [900, 736], [1120, 684]], 22));
const PAST_F = [0.1, 0.28, 0.46, 0.64, 0.82];
const PAST_T = [50.625, 50.94, 51.25, 51.56, 51.875];
const trajK = (t) => keys(t, [[50.3, 0], [50.625, 0.1], [50.94, 0.28], [51.25, 0.46], [51.56, 0.64], [51.875, 0.82], [52.45, 1, ease]], (k) => k);
// Trois fils (crayon, craie, feutre) qui montent du bas et se tressent en un seul avant la Trajectoire.
const BRAID = [0, 1, 2].map((i) => {
  const pts = [];
  for (let j = 0; j <= 60; j++) {
    const u = j / 60;
    const x = lerp(-60, 110, u) + 150 * Math.sin(u * Math.PI);
    const y = lerp(1700, 1236, ease(u));
    const amp = 60 * (1 - u) ** 1.1;
    pts.push([x + amp * Math.sin(u * 11 + i * (Math.PI * 2 / 3)), y]);
  }
  return new Fil(pts);
});

export function renderDark(t, opt) {
  if (t < 49.2) return '';
  const drift = 1 + 0.03 * prog(t, 50, 60);
  let s = '';
  // fond débordant largement le cadre 9:16 : l'adaptation 16:9 en montre les côtés
  s += el('rect', { x: -1500, y: 0, width: W + 3000, height: H, fill: C.deep });
  s += el('rect', { x: -1560, y: -60, width: W + 3120, height: H + 120, fill: 'url(#blueprint)' });
  let w = '';
  BRAID.forEach((f) => { w += trace(f, t, 49.95, 50.3, { dark: true, w: 7, op: 1 - 0.6 * prog(t, 50.6, 51.4) }, easeInOut); });
  const k = trajK(t);
  const res = 1 + 0.9 * Math.exp(-Math.max(0, t - 52.5) * 2.5) * (t >= 52.5 ? 1 : 0);
  if (k > 0) {
    w += stroke(TRAJ.slice(0, k), { dark: true, w: 9, glow: res });
    if (k < 1) w += tip(TRAJ.at(k), { w: 9 });
  }
  PAST_F.forEach((f, i) => {
    const p = TRAJ.at(f);
    const on = prog(t, PAST_T[i] - 0.02, PAST_T[i] + 0.12);
    const pre = ease(prog(t, 50.3, 50.6));
    if (pre <= 0) return;
    if (on > 0) w += el('circle', { cx: p[0], cy: p[1], r: 46 * (1 + 0.5 * (1 - on)), fill: 'url(#halo)', opacity: on });
    w += el('circle', { cx: p[0], cy: p[1], r: 17, fill: on > 0 ? LIME : C.deep, stroke: on > 0 ? LIME : '#4A5470', 'stroke-width': 4, opacity: pre });
    w += el('text', {
      x: p[0] - 26, y: p[1] + 70, 'font-family': FONT.mono, 'font-weight': 700, 'font-size': 36,
      fill: on > 0 ? '#E8ECF5' : '#4A5470', opacity: pre,
    }, `0${i + 1}`);
  });
  s += g({ transform: `translate(540 960) scale(${drift}) translate(-540 -960)` }, w);
  // coins du cadre 9:16 (en 16:9, le cadre de l'écran les porte : src/stage.js)
  if (opt.format !== '16:9') s += corners({ x: 60, y: 140, w: W - 120, h: H - 280, len: 54, width: 4, op: darkCorners(t) });
  return s;
}

export const darkCorners = (t) => 0.55 * ease(prog(t, 50.3, 51.0));

// ---------- adaptation 16:9 ----------

// L'image 16:9 est une fenêtre sur le cadre 9:16 : centre vertical cy et échelle s, plan par plan,
// pour garder l'action entière à droite de la colonne de texte.
export const WIDE = { s: 0.9, ax: 1440 }; // le point (540, cy) du cadre 9:16 tombe en (ax, 540) à l'écran
export function wideView(t) {
  const cy = keys(t, [
    [0, 1250], [3.75, 1250], [6.5, 1120], // page, puis recul jusqu'à la table
    [9.45, 1120], [10.75, 1040], // cercle des 48 h
    [16.3, 1040], [17.55, 1180], // trois répétiteurs
    [26.875, 1180], [28.05, 1000], [28.7, 1180], [29.375, 1180], [29.95, 960], // maison, porte
    [30.25, 1000], [30.55, 1000], [31.25, 1060], [32.5, 1000], [34.375, 700], // intérieur, page, franchissement
    [35.05, 1000], [43.75, 1000], [44.9, 1090], // suivi, téléphone
    [49.25, 1090], [50.0, 1150], // Trajectoire
  ]);
  const { s, ax } = WIDE;
  return { cy, s, viewBox: [540 - ax / s, cy - 540 / s, 1920 / s, 1080 / s] };
}

// ---------- assemblage du monde clair ----------

export function renderLight(t, opt) {
  let s = '';
  if (t < 31.3) {
    const A = layerA(t, opt);
    if (t < 30.0) s += A.svg;
    s += layerC(t, A.camera);
  }
  if (t >= 30.85) {
    const fadeIn = ease(prog(t, 30.85, 31.2));
    s += g({ opacity: fadeIn }, layerB(t, opt));
  }
  return s;
}
