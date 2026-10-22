// Le cahier de brouillon de l'élève, ouvert sur la table : réglure Seyès, écritures, gomme, trou, scotch,
// surligneur, pages qui tournent. Repère local : millimètres, reliure en x = 0, haut des pages en y = 0.
// Page droite : x de 1 à 168 ; page gauche : x de −168 à −1 ; hauteur 220.
import { el, g, n, prog, ease, easeIn, easeInOut, clamp, lerp, rand } from './util.js';
import { path, rect, circle, poly, curve, shadow } from './draw.js';
import { Writing, layout, strokePath } from './write.js';
import { TXT } from './texts.js';

export const PAGE = { w: 167, h: 220 };
export const NB = { x: -24, y: 170, r: -4 }; // pose du cahier sur la table

const GRAPHITE = '#3A3E4A';
const BLUE = '#2140A8';
const RED = '#C8463E';

// Lignes de base (page droite, repère de la page : x depuis la reliure).
export const L = { ex2: 24, ex2a: 40, ex2b: 56, ex3: 88, eq: 104, hint: 112, try: 120, ans: 136 };
export const X0 = 33; // juste après la marge

// ---------- contenus écrits (indépendants du temps : construits une fois par langue) ----------

const memo = new Map();
export function content(lang = 'fr') {
  if (memo.has(lang)) return memo.get(lang);
  const T = TXT[lang];
  const kid = { font: 'script', xh: 4.0 };
  // Exercice 2, déjà fait (fin de la séance d'hier)
  const done = new Writing([
    { text: T.ex2, x: X0, y: L.ex2, ...kid, seed: 3, at: [-9, -8] },
    { text: '3x − 4 = 11', x: X0 + 4, y: L.ex2a, ...kid, seed: 4, at: [-8, -7] },
    { text: '3x = 15', x: X0 + 4, y: L.ex2b, ...kid, seed: 5, at: [-7, -6.5] },
    { text: 'x = 5', x: X0 + 74, y: L.ex2b, ...kid, seed: 6, at: [-6.5, -6] },
    { text: T.ex3, x: X0, y: L.ex3, ...kid, seed: 7, at: [-6, -5] },
    { text: '2x + 5 = 17', x: X0 + 2, y: L.eq, ...kid, xh: 4.1, seed: 9, at: [-4.5, -4] },
  ]);
  const eqX = X0 + 2;
  const eq = layout('2x + 5 = 17', { ...kid, xh: 4.1, seed: 9, x: eqX, y: L.eq });
  // repères dans l'équation : « + 5 » et « 17 »
  const charX = (i) => {
    const pre = layout('2x + 5 = 17'.slice(0, i), { ...kid, xh: 4.1, seed: 9, x: eqX, y: L.eq });
    return pre.end[0];
  };
  const plusX = (charX(3) + charX(6)) / 2, rhsX = (charX(9) + charX(11)) / 2;

  // Première tentative : « 2x = » puis « 17 + 5 » (0:00,6 → 0:01,9)
  const lhs = layout('2x = ', { ...kid, x: X0 + 2, y: L.try, seed: 21 });
  const attempt = new Writing([
    { text: '2x = ', x: X0 + 2, y: L.try, ...kid, seed: 21, at: [0.6, 1.15], id: 'lhs' },
    { text: '17 + 5', x: lhs.end[0], y: L.try, ...kid, seed: 22, at: [1.2, 1.9], id: 'wrong' },
  ]);
  const wrong = layout('17 + 5', { ...kid, x: lhs.end[0], y: L.try, seed: 22 });
  const hole = { x: lhs.end[0] + wrong.width * 0.48, y: L.try - 2.2 };

  // Le répétiteur, au stylo bleu, à droite de l'équation : « | −5 » (on enlève 5 des deux côtés)
  const adult = { font: 'print', xh: 3.2, wobble: 0.5 };
  const hx = eq.end[0] + 5;
  const hint = new Writing([
    { paths: [[[hx, L.eq - 9], [hx - 0.4, L.eq + 2.5]]], at: [27.5, 27.62] },
    { text: '−5', x: hx + 3, y: L.eq, ...adult, seed: 31, at: [27.66, 28.25] },
  ]);
  // L'élève écrit sur le scotch, puis la réponse (0:28,5 → 0:29,95)
  const twelveW = layout('12', { ...kid, xh: 4.4, seed: 41 }).width;
  const fix = new Writing([
    { text: '12', x: hole.x + 1 - twelveW / 2, y: L.try, ...kid, xh: 4.4, seed: 41, at: [28.5, 29.2] },
    { text: 'x = 6', x: X0 + 12, y: L.ans, ...kid, xh: 4.2, seed: 42, at: [29.45, 29.95] },
  ]);
  const ans = layout('x = 6', { ...kid, xh: 4.2, seed: 42, x: X0 + 12, y: L.ans });

  // Page gauche : la leçon recopiée au tableau (titre en rouge, texte au stylo bleu)
  const lesson = T.lesson.map((ln, i) => ({ text: ln, x: -168 + 30, y: 32 + i * 16, font: i === 0 ? 'print' : 'print', xh: i === 0 ? 3.2 : 2.7, wobble: 0.6, seed: 50 + i, at: [-20 + i, -19.5 + i] }));
  const lessonW = new Writing(lesson);

  const c = { done, attempt, hint, fix, lessonW, hole, ans, wrong, lhs, eq, plusX, rhsX };
  memo.set(lang, c);
  return c;
}

// Écritures qui produisent du son (pour scripts/build-audio.mjs).
export function writingsForAudio(lang = 'fr') {
  const c = content(lang);
  return [
    { w: c.attempt, tool: 'pencil' },
    { w: c.hint, tool: 'bic' },
    { w: c.fix, tool: 'pencil' },
  ];
}

// ---------- dessin ----------

function seyes(x, w, h, marginX) {
  let s = rect(x, 0, w, h, { fill: '#FBFAF3' });
  s += rect(x, 0, w, h, { fill: 'url(#seyesMain)' });
  s += rect(x, 0, w, h, { fill: 'url(#paperTex)', opacity: 0.8 });
  s += path(`M${n(marginX)} 0V${h}`, { stroke: '#E58A84', 'stroke-width': 0.35 });
  // bande blanche en haut et en bas (pas de réglure)
  s += rect(x, 0, w, 7.5, { fill: '#FBFAF3' }) + rect(x, h - 6, w, 6, { fill: '#FBFAF3' });
  return s;
}

const ink = (list, color, w, op = 1) => (list.length ? path(strokePath(list), { fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: op }) : '');

// Graphite : un trait principal et un trait plus fin décalé, pour le grain.
const graphite = (list, op = 1) => ink(list, GRAPHITE, 0.42, 0.9 * op) + g({ transform: 'translate(0.08 0.06)' }, ink(list, '#5A5F6C', 0.22, 0.5 * op));

// Contour déchiré du trou (fixe).
const TORN = (() => {
  const r = rand(77);
  return Array.from({ length: 26 }, (_, i) => {
    const a = (i / 26) * Math.PI * 2;
    const k = 0.75 + r() * 0.45;
    return [Math.cos(a) * 10.5 * k, Math.sin(a) * 4.8 * k];
  });
})();
const CRUMBS = (() => { const r = rand(9); return Array.from({ length: 16 }, () => [r() * 26 - 6, r() * 14 - 4, 0.5 + r() * 0.8, r() * 180]); })();

// État de la page droite à l'instant t (repère du cahier).
export function rightPage(t, lang, st) {
  const c = content(lang);
  let s = '';
  // le trou laisse voir la page suivante
  s += seyes(1, PAGE.w, PAGE.h, 1 + 28);
  s += graphite(c.done.visible(99), 0.92);
  // première tentative
  const erase = st.erase; // 0 → 1 : la gomme efface « 17 + 5 »
  s += graphite(c.attempt.visible(t, (p) => p.id === 'lhs'));
  if (erase < 1) s += graphite(c.attempt.visible(t, (p) => p.id === 'wrong'), 1 - erase * 0.88);
  // halo gris laissé par la gomme
  if (erase > 0) {
    s += el('ellipse', { cx: n(c.hole.x), cy: n(c.hole.y), rx: 14, ry: 5.2, fill: '#8C909A', opacity: n(0.22 * erase), filter: 'url(#smudge)' });
    for (const [dx, dy, r0, a] of CRUMBS) {
      const k = clamp(erase * 1.6 - (dx + 6) / 40);
      const kc = k * (st.crumbs ?? 1);
      if (kc > 0) s += el('ellipse', { cx: n(c.hole.x + dx - 4), cy: n(c.hole.y + dy + 6), rx: n(r0 * 1.6), ry: n(r0 * 0.7), transform: `rotate(${n(a)} ${n(c.hole.x + dx - 4)} ${n(c.hole.y + dy + 6)})`, fill: '#9EA2AB', opacity: n(0.75 * kc) });
    }
  }
  // le trou
  if (st.hole > 0) {
    const k = st.hole;
    const pts = TORN.map(([x, y]) => [c.hole.x + x * k, c.hole.y + y * k]);
    const d = curve(pts, true);
    // la page suivante, dans l'ombre de la feuille percée
    s += path(d, { fill: '#A9A392' });
    s += g({ 'clip-path': `path('${d}')` }, rect(c.hole.x - 14, c.hole.y - 7, 28, 14, { fill: 'url(#seyesMain)', transform: 'translate(0.7 1.1)', opacity: 0.45 }) +
      g({ transform: 'translate(1.2 1.6)' }, path(d, { fill: 'none', stroke: '#0B0E1A', 'stroke-opacity': 0.85, 'stroke-width': 5.5, filter: 'url(#soft)' })));
    // bord déchiré : fibres blanches, et deux lambeaux de papier soulevés qui projettent leur ombre
    s += path(d, { fill: 'none', stroke: '#FFFFFF', 'stroke-width': 1.3, 'stroke-dasharray': '0.6 0.5', opacity: 0.95 });
    for (const [i, flip] of [[3, 1], [16, -1]]) {
      const [px, py] = pts[i], [qx, qy] = pts[(i + 2) % pts.length];
      const fx = (px + qx) / 2 + flip * 0.5, fy = (py + qy) / 2 + 2.2;
      s += poly([[px, py], [qx, qy], [fx + 0.8, fy + 0.9]], { fill: '#0B0E1A', opacity: 0.18 });
      s += poly([[px, py], [qx, qy], [fx, fy]], { fill: '#FFFDF6' });
    }
  }
  // le scotch
  if (st.tape > 0) s += tape(c.hole.x + 1, c.hole.y + 0.6, st.tape, st.tapeLift);
  // indices au stylo bleu, correction, réponse
  s += ink(c.hint.visible(t), BLUE, 0.4);
  s += graphite(c.fix.visible(t));
  // surligneur sur « x = 6 »
  if (st.hl > 0 && (st.hlLift ?? 0) < 1) {
    let x0 = X0 + 10, x1 = lerp(x0, X0 + 14 + c.ans.width, st.hl);
    const y = L.ans - 1.8;
    const lift = st.hlLift ?? 0;
    const mid = (x0 + x1) / 2;
    x0 = lerp(x0, mid, lift); x1 = lerp(x1, mid, lift);
    s += path(`M${n(x0)} ${n(y + 0.4)}L${n(x1)} ${n(y - 0.3)}`, { fill: 'none', stroke: '#C8FF3E', 'stroke-width': n(6.2 * (1 - 0.4 * lift)), 'stroke-linecap': lift > 0 ? 'round' : 'butt', opacity: 0.62, style: 'mix-blend-mode:multiply' });
  }
  // ombre de la reliure
  s += rect(1, 0, 22, PAGE.h, { fill: 'url(#spineR)' });
  return s;
}

// État final de la page d'exercice (après la séance d'essai).
export const notebookFinal = { erase: 1, hole: 1, crumbs: 0, tape: 1, tapeLift: 0, hl: 1, hlLift: 0 };

// Centre du surlignage de « x = 6 » (repère du cahier) : la tache qui deviendra le point du logo.
export function hlSpot(lang = 'fr') {
  const c = content(lang);
  return [(X0 + 10 + X0 + 14 + c.ans.width) / 2, L.ans - 1.8];
}

// Morceau de scotch mat : bords en dents de scie, reflet, léger relief.
export function tape(cx, cy, k = 1, lift = 0) {
  const w = 40, h = 14;
  const jag = (x, dir) => Array.from({ length: 7 }, (_, i) => [x + (i % 2 ? dir * 1 : 0), -h / 2 + (i * h) / 6]);
  const pts = [...jag(-w / 2, -1), ...jag(w / 2, 1).reverse()];
  const body = g({ transform: `translate(${n(cx)} ${n(cy)}) rotate(-3)`, opacity: n(clamp(k * 1.5)) },
    poly(pts, { fill: '#F1EBDA', 'fill-opacity': 0.8, stroke: '#C9BFA4', 'stroke-width': 0.4 }) +
    path(`M${-w / 2 + 2} ${-h / 2 + 2.4}H${w / 2 - 3}`, { stroke: '#FFFFFF', 'stroke-width': 2, opacity: 0.7 }) +
    path(`M${-w / 2 + 1} ${h / 2 - 0.6}H${w / 2 - 1}`, { stroke: '#B7AD92', 'stroke-width': 0.5, opacity: 0.8 }) +
    path(`M${-w / 2 + 6} ${h / 2 - 3}Q0 ${h / 2 - 4} ${w / 2 - 5} ${h / 2 - 2.4}`, { stroke: '#BDB6A0', 'stroke-width': 0.3, fill: 'none', opacity: 0.6 }));
  return lift > 0 ? shadow(body, lift * 6, { op: 0.25 }) + body : body;
}

function leftPage(lang) {
  const c = content(lang);
  let s = seyes(-168, PAGE.w, PAGE.h, -168 + 28);
  const lines = c.lessonW.visible(99);
  s += ink(lines.filter((x) => x.piece.seed === 50), RED, 0.4);
  s += ink(lines.filter((x) => x.piece.seed !== 50), BLUE, 0.34);
  s += rect(-24, 0, 23, PAGE.h, { fill: 'url(#spineL)' });
  return s;
}

// Le cahier entier. `st` : état (gomme, trou, scotch, surligneur, page tournée…).
export function notebook(t, lang, st) {
  let s = '';
  // couverture et tranche des pages
  s += rect(-172, -3.5, 344, 227, { rx: 3, fill: '#0F1430' });
  s += rect(-170, -1.5, 340, 223, { rx: 1.5, fill: '#E7E3D6' });
  s += rect(-169, -0.8, 338, 221.5, { rx: 1, fill: '#F1EEE4' });
  s += leftPage(lang);
  s += rightPage(t, lang, st);
  // pli central
  s += path('M0 0V220', { stroke: '#9A968A', 'stroke-width': 0.5, opacity: 0.7 });
  return s;
}

// Point d'une page (repère du cahier) dans le repère de la table.
export function nbToWorld([x, y], pose = NB) {
  const a = (pose.r * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return [pose.x + x * c - y * s, pose.y + x * s + y * c];
}
// Le repère du cahier a son origine en haut de la reliure ; NB.x/NB.y en est le centre.
export const NB_ORIGIN = [0, -110];
export const nbPoint = (p, pose = NB) => nbToWorld([p[0] + NB_ORIGIN[0], p[1] + NB_ORIGIN[1]], pose);
