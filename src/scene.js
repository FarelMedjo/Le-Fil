// Composition d'une image : la table vue par la caméra, la lumière, puis la signature finale.
// Tout est fonction de t (secondes du master) : aucune animation CSS, aucun état caché.
import { el, g, n, prog, ease, easeIn, easeOut, easeInOut, clamp, lerp, rot, mixColor, rand } from './util.js';
import { defs, rect, circle, path, poly, placed, shadow, curve as curve2, LIME, DEEP } from './draw.js';
import { hand, pencil, bic, highlighter, eraserBlock, WRITE_TIP, PINCH } from './hands.js';
import { notebook, tape, NB, PAGE, content } from './notebook.js';
import { phone, phoneScreen } from './phone.js';
import { lamp, glass, trousse, textbook, tutorCard, report, logoMark, LOGO } from './props.js';
import {
  camera, notebookState, childHand, childEraser, droppedEraser, parentHand, phonePose, cardPoses, tutorHand,
  monthHand, reportPose, lighting, bumpBurst, LAMP, GLASS, TROUSSE, BOOK, V,
} from './world.js';
import { monthWritings } from './month.js';
import { TXT } from './texts.js';
import { W, H } from './timeline.js';

export const DEFS = () => defs();

// ---------- outils tenus ----------
function toolFor(name, pose) {
  if (!name) return '';
  if (pose === 'write') {
    const [x, y] = WRITE_TIP;
    if (name === 'pencil') return g({ transform: `translate(${x} ${y})` }, pencil({ a: 62, len: 128 }));
    if (name === 'bic') return g({ transform: `translate(${x} ${y})` }, bic({ a: 62 }));
    if (name === 'highlighter') return g({ transform: `translate(${x} ${y})` }, highlighter({ a: 62 }));
  }
  if (pose === 'pinch') {
    const [x, y] = PINCH;
    if (name === 'eraser') return g({ transform: `translate(${x} ${y - 4})` }, eraserBlock({ a: 8 }));
    if (name === 'tape') return g({ transform: `translate(${x} ${y - 2}) rotate(-50)` }, tape(0, 0, 1, 0));
  }
  return '';
}
// La manche s'arrête juste au-delà du cadre : une ombre floutée trop grande dépasse les limites de Chromium.
let sleeveFor = () => 520;
const drawHand = (hd) => (hd ? hand({ ...hd, tool: toolFor(hd.tool, hd.pose), sleeveLen: sleeveFor(hd.s || 1) }) : '');

// ---------- la table ----------
function tablecloth() {
  return rect(-3000, -3000, 6000, 6000, { fill: 'url(#wax)' }) +
    rect(-3000, -3000, 6000, 6000, { fill: '#141C38', opacity: 0.5 }) +
    rect(-3000, -3000, 6000, 6000, { fill: 'url(#clothTex)' });
}

function lightingOverlay(t, L) {
  // dégradés propres à l'image (repère de la table)
  const gd = `<radialGradient id="eve" gradientUnits="userSpaceOnUse" cx="-40" cy="130" r="640">
    <stop offset="0" stop-color="#FFD9A0" stop-opacity="0"/><stop offset="0.45" stop-color="#2A1E3A" stop-opacity="0.18"/>
    <stop offset="1" stop-color="#05070F" stop-opacity="0.78"/></radialGradient>`;
  let s = gd;
  const eve = (1 - L.day) * L.lamp;
  if (eve > 0.001) {
    s += rect(-3000, -3000, 6000, 6000, { fill: 'url(#eve)', opacity: n(eve) });
    s += rect(-3000, -3000, 6000, 6000, { fill: '#FFDDB0', opacity: n(0.28 * eve), style: 'mix-blend-mode:multiply' });
  }
  if (L.day > 0.001) {
    s += rect(-3000, -3000, 6000, 6000, { fill: '#EAF0FF', opacity: n(0.1 * L.day), style: 'mix-blend-mode:multiply' });
    // lumière de la fenêtre qui traverse la table
    const x = lerp(-700, 600, L.sun);
    s += poly([[x, -900], [x + 260, -900], [x + 620, 900], [x + 360, 900]], { fill: '#FFF4D8', opacity: n(0.16 * L.day), style: 'mix-blend-mode:screen' });
    s += poly([[x + 300, -900], [x + 380, -900], [x + 740, 900], [x + 660, 900]], { fill: '#FFF4D8', opacity: n(0.12 * L.day), style: 'mix-blend-mode:screen' });
  }
  if (L.night > 0.001) s += rect(-3000, -3000, 6000, 6000, { fill: '#05070F', opacity: n(0.55 * L.night) });
  return s;
}

function notebookPlaced(t, lang, st, extra = '') {
  const inner = g({ transform: `translate(${NB.x} ${NB.y}) rotate(${NB.r}) translate(0 -110)` }, notebook(t, lang, st) + extra);
  return shadow(inner, 3.5, { op: 0.42 }) + inner;
}

function world(t, opt, cam) {
  const lang = opt.lang;
  sleeveFor = (sc) => clamp((1250 / cam.z) / sc, 160, 560);
  const T = TXT[lang];
  const L = lighting(t);
  const st = notebookState(t);
  let s = tablecloth();
  // décor
  s += placed(textbook('MATHS', T.level), { ...BOOK, h: 5 });
  s += placed(trousse(), { ...TROUSSE, h: 9 });
  s += placed(glass(), { ...GLASS, h: 30, shadowOp: 0.18 });
  // le cahier, ses outils posés
  const dropped = droppedEraser(t, lang);
  s += notebookPlaced(t, lang, st, monthLayer(t, lang, st));
  if (dropped) s += placed(eraserBlock({ a: 0 }), { x: dropped.x, y: dropped.y, r: dropped.r, h: dropped.h });
  // le bilan du mois
  const rp = reportPose(t);
  if (rp) s += placed(report(t, T, lang), { ...rp });
  // les fiches
  for (const c of cardPoses(t)) {
    if (c.gone) continue;
    s += placed(tutorCard(c.i, T, { stamp: c.stamp, dim: c.dim || 0, highlight: c.sel || 0 }), { x: c.x, y: c.y, r: c.r, s: c.s, h: c.h });
  }
  // les mains de l'élève (sous celle du parent)
  s += drawHand(childEraser(t, lang));
  s += drawHand(childHand(t, lang));
  s += drawHand(tutorHand(t, lang));
  s += drawHand(monthHand(t, monthWritings(lang)));
  const burst = bumpBurst(t);
  if (burst) s += burstLines(burst);
  // le téléphone, puis la main du parent
  const ph = phonePose(t);
  const phTf = `translate(${n(ph.x)} ${n(ph.y)}) rotate(${n(ph.r)}) scale(${ph.s})`;
  s += placed(phone(t, lang, { mode: ph.mode, on: 0 }), { x: ph.x, y: ph.y, r: ph.r, s: ph.s, h: ph.h });
  s += drawHand(parentHand(t));
  s += lightingOverlay(t, L);
  // l'écran éclaire : il passe au-dessus de la lumière de la pièce, avec un halo sur la table
  if (ph.on > 0) {
    s += g({ transform: phTf, opacity: n(ph.on * 0.5 * (1 - L.day)), style: 'mix-blend-mode:screen' }, el('ellipse', { cx: 0, cy: 0, rx: 95, ry: 120, fill: 'url(#screenGlow)' }));
    s += g({ transform: phTf }, phoneScreen(t, lang, { mode: ph.mode, on: ph.on }));
  }
  if (ph.held > 0.02) s += holdingFingers(ph);
  return s;
}

// Doigts du parent qui tiennent le téléphone : trois bouts de doigts sur un bord, le pouce sur l'autre.
function holdingFingers(ph) {
  const sk = { base: '#6A4330', light: '#8A5E45', nail: '#D2A792', shade: '#4F3123' };
  const tipShape = (x, y, a, w, l) => g({ transform: `translate(${x} ${y}) rotate(${a})` },
    path(`M${-w / 2} ${l}V0a${w / 2} ${w / 2} 0 0 1 ${w} 0V${l}Z`, { fill: sk.base }) +
    path(`M${-w / 2 + 1.4} ${l}V1a${w / 2 - 1.4} ${w / 2 - 1.4} 0 0 1 ${w - 2.8} 0`, { fill: 'none', stroke: sk.light, 'stroke-width': 1.2, opacity: 0.5 }) +
    el('ellipse', { cx: 0, cy: 3.6, rx: w * 0.3, ry: w * 0.34, fill: sk.nail, opacity: 0.85 }));
  let s = '';
  // trois doigts repliés dépassent du bord gauche (vu du parent), le pouce du bord droit
  const fingerStub = (x, y, a, w, l) => g({ transform: `translate(${x} ${y}) rotate(${a})` },
    path(curve2([[0, 0], [l * 0.55, -1.2], [l, 0.6]]), { fill: 'none', stroke: sk.base, 'stroke-width': w, 'stroke-linecap': 'round' }) +
    path(curve2([[1, -w * 0.18], [l * 0.55, -w * 0.28], [l - 1, -w * 0.12]]), { fill: 'none', stroke: sk.light, 'stroke-width': w * 0.28, 'stroke-linecap': 'round', opacity: 0.55 }) +
    path(`M${l * 0.5} ${-w * 0.45}q1.6 ${w * 0.45} 0 ${w * 0.9}`, { fill: 'none', stroke: sk.shade, 'stroke-width': 0.7, opacity: 0.6 }));
  [[-56, -20, 6], [-57, -3, 0], [-56, 14, -6]].forEach(([x, y, a]) => { s += fingerStub(x, y, a, 12.5, 21); });
  s += fingerStub(58, 30, 180 - 18, 14, 22);
  const tf = `translate(${n(ph.x)} ${n(ph.y)}) rotate(${n(ph.r)}) scale(${ph.s})`;
  const inner = g({ transform: tf, opacity: n(clamp(ph.held * 3)) }, s);
  return shadow(inner, 6, { op: 0.3 }) + inner;
}

function burstLines({ at, k }) {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    const r0 = 22 + k * 30, r1 = r0 + 14 * (1 - k);
    s += path(`M${n(at[0] + Math.cos(a) * r0)} ${n(at[1] + Math.sin(a) * r0)}L${n(at[0] + Math.cos(a) * r1)} ${n(at[1] + Math.sin(a) * r1)}`, { stroke: LIME, 'stroke-width': 3.2, 'stroke-linecap': 'round', opacity: n(1 - k) });
  }
  return s;
}

// Le mois en accéléré : pages tournées et contenus des spécialistes (src/month.js).
import { monthPages } from './month.js';
function monthLayer(t, lang, st) {
  return monthPages(t, lang, st);
}

// ---------- caméra ----------
export function camTransform(cam, w = W, h = H, ax = w / 2) {
  return `translate(${n(ax)} ${h / 2}) rotate(${n(-cam.r)}) scale(${n(cam.z)}) translate(${n(-cam.c[0])} ${n(-cam.c[1])})`;
}
const toScreen = ([x, y], cam, w = W, h = H) => {
  const p = rot([(x - cam.c[0]) * cam.z, (y - cam.c[1]) * cam.z], -cam.r);
  return [p[0] + w / 2, p[1] + h / 2];
};

// ---------- signature finale ----------
// Le pictogramme du logo, en grand (héros), puis à sa place dans le logo complet.
const HERO = { s: 3.6, c: [540, 520] };
export const SIGN = { s: 0.8, x: (W - 956 * 0.8) / 2, y: 1290 };
const logoTarget = (t) => {
  const k = easeInOut(prog(t, 54.5, 55.15));
  const signC = [SIGN.x + LOGO.center[0] * SIGN.s, SIGN.y + LOGO.center[1] * SIGN.s];
  return { s: lerp(HERO.s, SIGN.s, k), c: [lerp(HERO.c[0], signC[0], k), lerp(HERO.c[1], signC[1], k) - Math.sin(Math.PI * k) * 40] };
};
const logoPt = ([x, y], tg) => [tg.c[0] + (x - LOGO.center[0]) * tg.s, tg.c[1] + (y - LOGO.center[1]) * tg.s];

// `frame` : cadre de sortie ; le contenu (dessiné en coordonnées du 9:16) y est posé en (ox, 0) à l'échelle sc.
function finale(t, opt, frame = { w: W, h: H, ox: 0, sc: 1 }) {
  if (t < 49.0) return '';
  const off = easeInOut(prog(t, 49.0, 49.55));
  let bg = rect(0, 0, frame.w, frame.h, { fill: DEEP, opacity: n(off) });
  if (t >= 49.4) bg += rect(0, 0, frame.w, frame.h, { fill: 'url(#blueprintPx)', opacity: n(prog(t, 49.6, 50.4)) });
  return bg + g({ transform: frame.sc === 1 && !frame.ox ? undefined : `translate(${n(frame.ox)} 0) scale(${frame.sc})` }, finaleContent(t, opt));
}

function finaleContent(t, opt) {
  const lang = opt.lang;
  let s = '';
  const cam = camera(49.5);
  const st = notebookState(49.5);
  if (t < 49.5) {
    // seul le cahier reste éclairé (même caméra que la table, pour qu'il ne bouge pas sous le noir)
    s += g({ transform: camTransform(camera(t)) }, notebookPlaced(t, lang, st, monthLayer(t, lang, st)));
    return s;
  }
  // métamorphose : les deux pages deviennent les deux pages du logo
  const k = easeInOut(prog(t, 49.5, 50.35));
  const tg = logoTarget(t);
  const corners = (xs) => [[xs[0], 0], [xs[1], 0], [xs[1], 220], [xs[0], 220]].map(([x, y]) => toScreen(nbWorld([x, y]), cam));
  const leftQ = corners([-168, -1]), rightQ = corners([1, 168]);
  const toL = LOGO.left.map((p) => logoPt(p, tg)), toR = LOGO.right.map((p) => logoPt(p, tg));
  const mixQ = (a, b) => a.map((p, i) => [lerp(p[0], b[i][0], k), lerp(p[1], b[i][1], k)]);
  const paper = mixColor('#FBFAF3', LOGO.page, k);
  // les deux pages, opaques dès le départ (elles recouvrent exactement celles du cahier), se redressent ;
  // le cahier lui-même s'efface par-dessus en un tiers de la métamorphose
  s += poly(mixQ(leftQ, toL), { fill: paper }) + poly(mixQ(rightQ, toR), { fill: paper });
  const ghost = 1 - prog(k, 0, 0.32);
  if (ghost > 0) s += g({ transform: camTransform(cam), opacity: n(ghost) }, notebookPlaced(49.5, lang, st, monthLayer(49.5, lang, st)));
  if (k >= 1) s += g({ opacity: 1 }, path(`M${n(logoPt([67.5, 86], tg)[0])} ${n(logoPt([67.5, 86], tg)[1])}V${n(logoPt([67.5, 134], tg)[1])}M${n(logoPt([80, 86], tg)[0])} ${n(logoPt([80, 86], tg)[1])}V${n(logoPt([80, 134], tg)[1])}`, { stroke: '#989AA2', 'stroke-width': n(1.2 * tg.s) }));
  // la tache de surligneur s'envole et devient le point
  const from = toScreen(nbWorld(HL_SPOT), cam);
  const to = logoPt(LOGO.dot, tg);
  const kd = easeInOut(prog(t, 49.55, 50.4));
  const arc = Math.sin(Math.PI * kd) * 160;
  const p = [lerp(from[0], to[0], kd) + arc * 0.4, lerp(from[1], to[1], kd) - arc];
  const rIn = lerp(10, LOGO.inner * tg.s, kd), rOut = LOGO.ring * tg.s * ease(prog(t, 50.1, 50.45));
  // une fois formé, le point respire doucement, sur la mesure (2 s)
  const breath = t > 50.45 && t < 54.5 ? 0.5 - 0.5 * Math.cos(((t - 50.45) / 2) * Math.PI * 2) : 0;
  if (breath > 0) s += circle(p[0], p[1], LOGO.ring * tg.s * (1.6 + 0.5 * breath), { fill: 'url(#halo)', opacity: n(0.35 * breath) });
  if (rOut > 0) s += circle(p[0], p[1], rOut, { fill: LOGO.ringColor });
  if (kd < 1) s += circle(p[0], p[1], rIn * 2.4, { fill: 'url(#halo)', opacity: n(1 - kd) });
  s += circle(p[0], p[1], rIn, { fill: LIME });
  // le mot TutorLab se déploie à côté du pictogramme
  const wm = easeOut(prog(t, 54.85, 55.5));
  if (wm > 0) {
    const x0 = SIGN.x + 230 * SIGN.s, x1 = SIGN.x + 956 * SIGN.s;
    s += `<clipPath id="wm"><rect x="${n(x0)}" y="${SIGN.y - 10}" width="${n((x1 - x0) * wm)}" height="${158 * SIGN.s + 20}"/></clipPath>`;
    s += g({ 'clip-path': 'url(#wm)' }, el('image', { href: 'assets/brand/tutorlab-logo-horizontal-sombre.png', x: n(SIGN.x), y: SIGN.y, width: n(956 * SIGN.s), height: n(158 * SIGN.s) }));
  }
  return s;
}

const nbWorld = ([x, y]) => {
  const a = (NB.r * Math.PI) / 180, c = Math.cos(a), si = Math.sin(a);
  const lx = x, ly = y - 110;
  return [NB.x + lx * c - ly * si, NB.y + lx * si + ly * c];
};
// Où est la dernière tache de surligneur visible à la fin (page de maths, src/month.js).
import { FINAL_HL } from './month.js';
const HL_SPOT = FINAL_HL;

// ---------- image complète ----------
// En 16:9, le cadre 9:16 du master (même hauteur de table) est posé à droite, son centre en x = 1290 :
// la colonne de texte occupe la gauche, la table continue derrière elle.
export const WIDE = { sc: H === 1920 ? 1080 / 1920 : 1, ax: 1290 };
export function renderScene(t, opt, { w = W, h = H } = {}) {
  const cam = camera(t);
  const wide = w > h;
  const camW = wide ? { ...cam, z: cam.z * WIDE.sc } : cam;
  const ax = wide ? WIDE.ax : w / 2;
  let s = '';
  if (t < 49.5) s += g({ transform: camTransform(camW, w, h, ax) }, world(t, opt, camW));
  s += finale(t, opt, wide ? { w, h, ox: WIDE.ax - (W / 2) * WIDE.sc, sc: WIDE.sc } : { w, h, ox: 0, sc: 1 });
  return s;
}
