// Les personnages du film ne sont vus que par leurs mains, en plongée.
// Repère local : millimètres, poignet en (0, 0), doigts vers −y. Main droite (pouce à gauche, dos visible) ;
// une main gauche est la même main retournée (`left: true`).
import { el, g, n } from './util.js';
import { path, circle, curve, poly, rect, shadow } from './draw.js';

export const SKINS = {
  child: { base: '#5C3826', shade: '#45291B', light: '#7A4E36', nail: '#C79A86' },
  parent: { base: '#6A4330', shade: '#4F3123', light: '#8A5E45', nail: '#D2A792' },
  maths: { base: '#4E2F20', shade: '#3A2217', light: '#6E4835', nail: '#BE917C' },
  physics: { base: '#6E4A35', shade: '#543726', light: '#8E674F', nail: '#D7B19E' },
  english: { base: '#7B5038', shade: '#5E3B29', light: '#9C6E52', nail: '#E0B6A2' },
  english2: { base: '#3F261A', shade: '#2E1B12', light: '#5C3B2A', nail: '#B48A76' },
};

// Manches : couleur unie ou motif, poignet (manchette), accessoires.
export const SLEEVES = {
  child: { fill: '#C4AE7E', cuff: '#B39C6B', fold: '#A38D5E' }, // tenue scolaire kaki
  parent: { fill: 'url(#waxParent)', cuff: '#E2762B', fold: 'rgba(0,0,0,0.25)' },
  maths: { fill: '#3E64A8', cuff: '#F2F4F8', fold: '#30518C', watch: true },
  physics: { fill: '#7C838F', cuff: '#6A717D', fold: '#646B76', ring: true },
  english: { fill: 'url(#waxTutorEn)', cuff: '#F2B134', fold: 'rgba(0,0,0,0.25)', bracelets: true },
  english2: { fill: '#E07B39', cuff: '#C9682C', fold: '#B85E27' },
};

const W = { index: 17, middle: 18, ring: 16.5, pinky: 14.5, thumb: 19.5 };

// Un doigt : chaîne de points, effilé de la base au bout, reflet, plis, ongle.
function finger(pts, w, sk, { nail = true, curled = false } = {}) {
  let s = '';
  const d = curve(pts);
  const n0 = pts.length - 1;
  // base large, puis segments plus fins : les bouts ronds des traits se fondent
  s += path(d, { fill: 'none', stroke: sk.base, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  if (n0 >= 2) {
    const tipD = curve(pts.slice(-2));
    s += path(tipD, { fill: 'none', stroke: sk.base, 'stroke-width': w * 0.86, 'stroke-linecap': 'round' });
  }
  // reflet côté lumière
  s += g({ transform: 'translate(-1.4 -1.2)' }, path(d, { fill: 'none', stroke: sk.light, 'stroke-width': w * 0.34, 'stroke-linecap': 'round', opacity: 0.5 }));
  // plis des articulations
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], [px, py] = pts[i - 1];
    const a = Math.atan2(y - py, x - px) + Math.PI / 2;
    const dx = Math.cos(a) * w * 0.26, dy = Math.sin(a) * w * 0.26;
    s += path(`M${n(x - dx)} ${n(y - dy)}Q${n(x + (x - px) * 0.05)} ${n(y + (y - py) * 0.05)} ${n(x + dx)} ${n(y + dy)}`, { fill: 'none', stroke: sk.shade, 'stroke-width': 0.8, opacity: 0.55, 'stroke-linecap': 'round' });
  }
  if (nail && !curled) {
    const a = pts.at(-1), b = pts.at(-2);
    const ang = Math.atan2(a[1] - b[1], a[0] - b[0]) * 180 / Math.PI;
    s += g({ transform: `translate(${n(a[0])} ${n(a[1])}) rotate(${n(ang)})` },
      el('ellipse', { cx: -w * 0.16, cy: 0, rx: w * 0.3, ry: w * 0.26, fill: sk.nail, opacity: 0.85 }) +
      el('ellipse', { cx: -w * 0.1, cy: -w * 0.07, rx: w * 0.16, ry: w * 0.08, fill: '#FFFFFF', opacity: 0.3 }));
  }
  return s;
}

function backOfHand(pts, sk) {
  let s = path(curve(pts, true), { fill: sk.base });
  // tendons, très discrets
  return s;
}

function knuckle(x, y, sk, r = 5) {
  return el('ellipse', { cx: n(x - 1), cy: n(y - 1), rx: r, ry: r * 0.7, fill: sk.light, opacity: 0.45 });
}

// Avant-bras et manche, du poignet vers le bas (hors champ).
function sleeve(kind, sk, len = 700) {
  const sl = SLEEVES[kind];
  let s = '';
  // peau du poignet sous la manchette
  s += path(curve([[-25, -6], [-28, 30], [28, 30], [25, -6]], true), { fill: sk.base });
  const outline = [[-31, 12], [-38, 120], [-48, 300], [-58, len], [58, len], [48, 300], [38, 120], [31, 12]];
  s += path(curve(outline, true), { fill: sl.fill });
  if (sl.fill.startsWith('url')) s += path(curve(outline, true), { fill: 'rgba(10,14,30,0.12)' });
  // plis
  s += path('M-20 60 Q -4 70 18 56 M-26 150 Q 0 166 30 146 M-14 250 Q 8 262 34 240', { fill: 'none', stroke: sl.fold, 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.6 });
  // manchette
  s += path(curve([[-31, 4], [-33, 22], [0, 26], [33, 22], [31, 4], [0, 0]], true), { fill: sl.cuff });
  if (kind === 'maths') {
    s += circle(-20, 12, 1.3, { fill: '#C9CED8' });
  }
  return s;
}

function accessories(kind) {
  const sl = SLEEVES[kind];
  let s = '';
  if (sl.watch) {
    s += rect(-27, -8, 54, 10, { rx: 3, fill: '#2B2F3A' });
    s += circle(0, -3, 9.5, { fill: '#D9DDE5', stroke: '#2B2F3A', 'stroke-width': 2 });
    s += path('M0 -3V-9M0 -3H4', { stroke: '#2B2F3A', 'stroke-width': 1, 'stroke-linecap': 'round' });
  }
  if (sl.bracelets) {
    s += path('M-27 -6 Q 0 0 27 -6', { fill: 'none', stroke: '#E8B84A', 'stroke-width': 3.2 });
    s += path('M-26 -1 Q 0 5 26 -1', { fill: 'none', stroke: '#D46A2F', 'stroke-width': 2.6 });
  }
  return s;
}

// ---------- poses ----------

// Tenue du crayon (pince à trois doigts), vue de dessus. La mine est en TIP.
export const WRITE_TIP = [-52, -150];
function poseWrite(sk, kind, tool) {
  let s = '';
  s += backOfHand([[-24, 4], [-34, -36], [-33, -68], [-22, -90], [0, -98], [16, -95], [31, -86], [40, -60], [34, -24], [24, 4]], sk);
  // annulaire et auriculaire repliés sous la paume : on ne voit que leurs premières phalanges
  s += finger([[29, -84], [27, -97], [22, -103]], W.pinky, sk, { curled: true });
  s += finger([[13, -92], [10, -107], [4, -114]], W.ring, sk, { curled: true });
  // majeur, sous le crayon : son bout dépasse à droite de l'index
  s += finger([[-4, -94], [-15, -114], [-26, -128], [-31, -135]], W.middle * 0.95, sk);
  // l'outil, dans le creux entre pouce et index
  s += tool;
  // pouce, contre le crayon, côté gauche
  s += finger([[-30, -36], [-44, -62], [-51, -90], [-48, -111]], W.thumb, sk);
  // index couché sur le crayon
  s += finger([[-18, -90], [-27, -107], [-35, -121], [-40, -130]], W.index, sk);
  s += knuckle(-17, -92, sk) + knuckle(-2, -97, sk) + knuckle(13, -94, sk) + knuckle(29, -86, sk, 4.5);
  return s;
}

// Main à plat (posée, qui lisse, qui pousse).
function poseFlat(sk) {
  let s = '';
  s += backOfHand([[-26, 4], [-34, -40], [-30, -82], [-10, -98], [12, -98], [32, -88], [42, -60], [36, -24], [26, 4]], sk);
  s += finger([[34, -84], [44, -112], [50, -132], [53, -146]], W.pinky, sk);
  s += finger([[16, -94], [20, -128], [22, -152], [23, -168]], W.ring, sk);
  s += finger([[-3, -97], [-4, -134], [-5, -160], [-5, -177]], W.middle, sk);
  s += finger([[-22, -90], [-28, -124], [-32, -148], [-34, -164]], W.index, sk);
  s += finger([[-32, -36], [-54, -58], [-68, -78], [-76, -92]], W.thumb, sk);
  s += knuckle(-22, -92, sk) + knuckle(-3, -99, sk) + knuckle(16, -96, sk) + knuckle(34, -86, sk, 4.5);
  return s;
}

// Main posée sur une autre, doigts serrés et un peu repliés (le geste du parent).
function poseCover(sk) {
  let s = '';
  s += backOfHand([[-26, 4], [-34, -40], [-30, -82], [-10, -98], [12, -98], [32, -88], [40, -60], [36, -24], [26, 4]], sk);
  s += finger([[31, -84], [36, -108], [37, -124], [36, -134]], W.pinky, sk);
  s += finger([[14, -94], [16, -124], [16, -144], [15, -156]], W.ring, sk);
  s += finger([[-3, -97], [-4, -130], [-5, -152], [-6, -165]], W.middle, sk);
  s += finger([[-21, -90], [-24, -120], [-26, -142], [-27, -154]], W.index, sk);
  s += finger([[-32, -36], [-50, -60], [-58, -82], [-58, -96]], W.thumb, sk);
  s += knuckle(-21, -92, sk) + knuckle(-3, -99, sk) + knuckle(14, -96, sk) + knuckle(31, -86, sk, 4.5);
  return s;
}

// Poing fermé (check des poings).
function poseFist(sk) {
  let s = '';
  s += backOfHand([[-26, 4], [-36, -36], [-36, -78], [-22, -100], [4, -106], [28, -100], [42, -78], [40, -30], [26, 4]], sk);
  // phalanges repliées : quatre bourrelets
  s += finger([[-26, -98], [-24, -112]], W.index + 2, sk, { curled: true });
  s += finger([[-6, -104], [-5, -118]], W.middle + 2, sk, { curled: true });
  s += finger([[13, -101], [13, -114]], W.ring + 2, sk, { curled: true });
  s += finger([[30, -92], [29, -104]], W.pinky + 2, sk, { curled: true });
  // pouce replié devant
  s += finger([[-34, -40], [-42, -70], [-30, -92], [-12, -96]], W.thumb, sk, { nail: true });
  s += knuckle(-24, -100, sk, 5.5) + knuckle(-5, -106, sk, 5.5) + knuckle(13, -103, sk, 5.5) + knuckle(29, -94, sk, 5);
  return s;
}

// Pince pouce-index (tenir une gomme, un bout de scotch, une fiche). La prise est en PINCH.
export const PINCH = [-30, -138];
function posePinch(sk, tool) {
  let s = '';
  s += backOfHand([[-24, 4], [-34, -38], [-31, -76], [-16, -94], [6, -98], [26, -90], [38, -64], [34, -24], [24, 4]], sk);
  s += finger([[28, -86], [27, -100], [22, -107]], W.pinky, sk, { curled: true });
  s += finger([[12, -94], [11, -110], [5, -118]], W.ring, sk, { curled: true });
  s += finger([[-4, -96], [-8, -116], [-13, -126]], W.middle, sk, { curled: true });
  s += tool;
  s += finger([[-30, -36], [-46, -68], [-47, -100], [-39, -126]], W.thumb, sk);
  s += finger([[-19, -90], [-25, -112], [-28, -128], [-28, -140]], W.index, sk);
  s += knuckle(-18, -92, sk) + knuckle(-3, -98, sk) + knuckle(12, -96, sk) + knuckle(28, -88, sk, 4.5);
  return s;
}

// ---------- outils tenus ----------

// Crayon à papier : mine en (0, 0), le crayon part selon l'angle `a` (degrés).
export function pencil({ a = 60, len = 175, color = '#F2C230', stripe = '#1F2433', worn = 0 } = {}) {
  const body = g({ transform: `rotate(${a})` },
    poly([[0, 0], [8, -2.6], [8, 2.6]], { fill: '#3A3F4B' }) +
    poly([[3.5, -1.2], [17, -3.6], [17, 3.6], [3.5, 1.2]], { fill: '#E9CFA4' }) +
    poly([[3.5, -1.2], [7.5, -1.9], [7.5, 1.9], [3.5, 1.2]], { fill: '#3A3F4B' }) +
    rect(17, -3.6, len - 34, 7.2, { fill: color }) +
    rect(17, -3.6, len - 34, 2.2, { fill: '#FFF', opacity: 0.25 }) +
    rect(17, 1.4, len - 34, 2.2, { fill: '#000', opacity: 0.12 }) +
    rect(len - 17, -3.8, 8, 7.6, { fill: '#B9BFCA' }) +
    rect(len - 9, -3.6, 9 - worn, 7.2, { rx: 2.4, fill: '#E59A92' }) +
    (stripe ? rect(len - 30, -3.6, 4, 7.2, { fill: stripe }) : ''));
  return body;
}

// Stylo bille transparent, encre bleue.
export function bic({ a = 60, len = 150, ink = '#1F3FA8' } = {}) {
  return g({ transform: `rotate(${a})` },
    poly([[0, 0], [5, -1.4], [5, 1.4]], { fill: '#9AA0AA' }) +
    poly([[5, -1.6], [20, -3.6], [20, 3.6], [5, 1.6]], { fill: '#DDE3EC', stroke: '#B9C0CC', 'stroke-width': 0.4 }) +
    rect(20, -4, len - 32, 8, { fill: '#E8EEF6', opacity: 0.85, stroke: '#B9C0CC', 'stroke-width': 0.4 }) +
    rect(20, -1, len - 34, 2, { fill: ink }) +
    rect(len - 12, -4.4, 12, 8.8, { rx: 1.5, fill: ink }));
}

// Surligneur : corps encre, capuchon et pointe lime.
export function highlighter({ a = 60, len = 130 } = {}) {
  return g({ transform: `rotate(${a})` },
    poly([[0, -3.5], [7, -5], [7, 5], [0, 3.5]], { fill: '#C8FF3E' }) +
    poly([[7, -6], [18, -8.5], [18, 8.5], [7, 6]], { fill: '#2B3245' }) +
    rect(18, -8.5, len - 18, 17, { rx: 3, fill: '#0B0E1A' }) +
    rect(18, -8.5, len - 18, 5, { rx: 2, fill: '#FFF', opacity: 0.12 }) +
    rect(len - 28, -9.2, 26, 18.4, { rx: 3, fill: '#C8FF3E' }));
}

// Gomme blanche dans son étui.
export function eraserBlock({ a = 0 } = {}) {
  return g({ transform: `rotate(${a})` },
    rect(-22, -12, 44, 24, { rx: 3, fill: '#F7F6F2', stroke: '#D9D6CC', 'stroke-width': 0.6 }) +
    rect(-6, -12.6, 30, 25.2, { rx: 1.5, fill: '#2F6FD0' }) +
    rect(-6, -12.6, 30, 6, { fill: '#FFF', opacity: 0.18 }) +
    rect(-19, -9, 9, 18, { rx: 2, fill: '#000', opacity: 0.04 }));
}

// ---------- assemblage ----------

// Une main posée sur la table : `pose` (write, flat, fist, pinch), outil éventuel, hauteur pour l'ombre.
export function hand({ kind = 'child', pose = 'flat', x = 0, y = 0, r = 0, s = 1, left = false, tool = '', h = 26, op = 1, sleeveLen = 520 }) {
  if (op <= 0.001) return '';
  const sk = SKINS[kind];
  let body = sleeve(kind, sk, sleeveLen);
  if (pose === 'write') body += poseWrite(sk, kind, tool);
  else if (pose === 'fist') body += poseFist(sk);
  else if (pose === 'pinch') body += posePinch(sk, tool);
  else if (pose === 'cover') body += poseCover(sk);
  else body += poseFlat(sk);
  body += accessories(kind);
  if (SLEEVES[kind].ring && pose !== 'fist') body += el('ellipse', { cx: 21, cy: -112, rx: 9.5, ry: 4.5, fill: 'none', stroke: '#D9B45A', 'stroke-width': 2.6 });
  const tf = `translate(${n(x)} ${n(y)}) rotate(${n(r)}) scale(${left ? -s : s} ${s})`;
  const inner = g({ transform: tf }, body);
  return g({ opacity: op < 1 ? n(op) : undefined }, shadow(inner, h, { op: 0.38 }) + inner);
}

// Position (repère de la table) d'un point du repère de la main.
export function handPoint(local, { x = 0, y = 0, r = 0, s = 1, left = false }) {
  const lx = (left ? -local[0] : local[0]) * s, ly = local[1] * s;
  const a = (r * Math.PI) / 180, c = Math.cos(a), si = Math.sin(a);
  return [x + lx * c - ly * si, y + lx * si + ly * c];
}

// Place la main pour que son point `local` tombe sur `target`.
export function handAt(target, local, { r = 0, s = 1, left = false }) {
  const p = handPoint(local, { x: 0, y: 0, r, s, left });
  return { x: target[0] - p[0], y: target[1] - p[1], r, s, left };
}
