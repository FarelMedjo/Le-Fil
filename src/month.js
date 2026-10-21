// Un mois en accéléré (0:32 → 0:36) : trois pages tournées, et sur chacune un spécialiste qui écrit.
// Physique-chimie (loi d'Ohm), anglais (present perfect), maths (Thalès). Chaque page finit surlignée.
// Repère : celui du cahier (reliure en x = 0, haut des pages en y = 0), page droite de x = 1 à 168.
import { g, n, prog, ease, easeInOut, clamp, lerp } from './util.js';
import { rect, path } from './draw.js';
import { Writing, layout, strokePath } from './write.js';
import { MONTH_WRITERS } from './world.js';
import { PAGE, rightPage, notebookFinal } from './notebook.js';

const BLUE = '#2140A8';
const X0 = 35;
const adult = { font: 'print', wobble: 0.6 };

// Dessins à main levée (traits en mm de la page).
const circuit = () => {
  const x = X0 + 6, y = 58, w = 90, h = 44;
  return [
    [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x, y]],
    // pile
    [[x + 34, y - 7], [x + 34, y + 7]], [[x + 40, y - 4], [x + 40, y + 4]],
    // résistance en zigzag
    [[x + w - 5, y + 12], [x + w + 5, y + 15], [x + w - 5, y + 19], [x + w + 5, y + 23], [x + w - 5, y + 27], [x + w + 5, y + 31], [x + w, y + 33]],
  ];
};
const triangle = () => {
  const A = [X0 + 40, 54], B = [X0 + 8, 112], C = [X0 + 92, 112];
  const M = [lerp(A[0], B[0], 0.5), lerp(A[1], B[1], 0.5)], N = [lerp(A[0], C[0], 0.5), lerp(A[1], C[1], 0.5)];
  return { strokes: [[A, B, C, A], [M, N]], pts: { A, B, C, M, N } };
};

const memo = new Map();
// Les trois écritures du mois, dans l'ordre des pages.
export function monthWritings(lang = 'fr') {
  if (memo.has(lang)) return memo.get(lang).ws;
  const fr = lang === 'fr';
  const [p0, p1, p2] = MONTH_WRITERS.map((m) => m.at);
  const span = (a, f0, f1) => [lerp(a[0], a[1], f0), lerp(a[0], a[1], f1)];
  const tri = triangle();
  const labels = Object.entries(tri.pts).map(([k, [x, y]]) => ({ text: k, x: x + (k === 'B' ? -6 : k === 'M' ? -6 : 2), y: y + (k === 'A' ? -2 : 5), ...adult, xh: 2.4, seed: 90 + k.charCodeAt(0) }));
  const ws = [
    new Writing([
      { text: fr ? 'Loi d\'Ohm' : 'Ohm\'s law', x: X0, y: 40, ...adult, xh: 3.4, seed: 81, at: span(p0, 0, 0.25) },
      { paths: circuit(), at: span(p0, 0.27, 0.62) },
      { text: 'U = R × I', x: X0 + 18, y: 132, ...adult, xh: 4.2, seed: 82, at: span(p0, 0.66, 1) },
    ]),
    new Writing([
      { text: 'Present perfect', x: X0, y: 40, ...adult, xh: 3.4, seed: 83, at: span(p1, 0, 0.3) },
      { text: 'I have lived in', x: X0 + 4, y: 64, ...adult, xh: 3.4, seed: 84, at: span(p1, 0.32, 0.64) },
      { text: 'Yaoundé since 2015.', x: X0 + 4, y: 80, ...adult, xh: 3.4, seed: 85, at: span(p1, 0.66, 1) },
    ]),
    new Writing([
      { text: fr ? 'Thalès' : 'Thales', x: X0, y: 40, ...adult, xh: 3.4, seed: 86, at: span(p2, 0, 0.18) },
      { paths: tri.strokes, at: span(p2, 0.2, 0.5) },
      ...labels.map((l, i) => ({ ...l, at: span(p2, 0.5 + i * 0.03, 0.53 + i * 0.03) })),
      { text: 'AM/AB = AN/AC', x: X0 + 8, y: 136, ...adult, xh: 3.8, seed: 87, at: span(p2, 0.68, 1) },
    ]),
  ];
  // surlignages : [x0, x1, y] dans la page
  const hl = [
    [X0 + 16, X0 + 20 + layout('U = R × I', { ...adult, xh: 4.2, seed: 82 }).width, 132 - 2.2],
    [X0 + 8, X0 + 8 + layout('have lived', { ...adult, xh: 3.4, seed: 84 }).width + 6, 64 - 1.8],
    [X0 + 6, X0 + 10 + layout('AM/AB = AN/AC', { ...adult, xh: 3.8, seed: 87 }).width, 136 - 2],
  ];
  const out = { ws, hl };
  memo.set(lang, out);
  return ws;
}
const hlOf = (lang) => { monthWritings(lang); return memo.get(lang).hl; };

// Centre du dernier surlignage (maths), repère du cahier : la tache qui deviendra le point du logo.
export const FINAL_HL = (() => {
  const X = X0 + 6, w = 76; // largeur approximative de « AM/AB = AN/AC »
  return [X + w / 2, 136 - 2];
})();

const ink = (list, color, w) => (list.length ? path(strokePath(list), { fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }) : '');

function seyesRight() {
  let s = rect(1, 0, PAGE.w, PAGE.h, { fill: '#FBFAF3' });
  s += rect(1, 0, PAGE.w, PAGE.h, { fill: 'url(#seyesMain)' });
  s += rect(1, 0, PAGE.w, PAGE.h, { fill: 'url(#paperTex)', opacity: 0.8 });
  s += path('M29 0V220', { stroke: '#E58A84', 'stroke-width': 0.35 });
  s += rect(1, 0, PAGE.w, 7.5, { fill: '#FBFAF3' }) + rect(1, PAGE.h - 6, PAGE.w, 6, { fill: '#FBFAF3' });
  return s;
}
function seyesLeft() {
  let s = rect(-168, 0, PAGE.w, PAGE.h, { fill: '#FBFAF3' });
  s += rect(-168, 0, PAGE.w, PAGE.h, { fill: 'url(#seyesMain)' });
  s += rect(-168, 0, PAGE.w, PAGE.h, { fill: 'url(#paperTex)', opacity: 0.8 });
  s += path('M-140 0V220', { stroke: '#E58A84', 'stroke-width': 0.35 });
  s += rect(-168, 0, PAGE.w, 7.5, { fill: '#FBFAF3' }) + rect(-168, PAGE.h - 6, PAGE.w, 6, { fill: '#FBFAF3' });
  return s;
}

// Contenu d'une page du mois (index 1 à 3) à l'instant t.
function pageContent(i, t, lang) {
  const ws = monthWritings(lang);
  const w = ws[i - 1];
  let s = ink(w.visible(t), BLUE, 0.42);
  const [x0, x1, y] = hlOf(lang)[i - 1];
  const k = easeInOut(prog(t, w.t1 - 0.02, w.t1 + 0.16));
  if (k > 0) s += path(`M${n(x0)} ${n(y + 0.4)}L${n(lerp(x0, x1, k))} ${n(y - 0.3)}`, { fill: 'none', stroke: '#C8FF3E', 'stroke-width': 6, opacity: 0.6, style: 'mix-blend-mode:multiply' });
  return s;
}

// Calque du mois, posé sur le cahier : pages tournées et nouveaux contenus.
export function monthPages(t, lang, st) {
  const f = st.flips;
  if (!f || f[0] <= 0) return '';
  let s = '';
  // dernière page atteinte
  let cur = 0;
  f.forEach((k, i) => { if (k > 0) cur = i + 1; });
  // page droite découverte
  s += seyesRight() + pageContent(cur, t, lang) + rect(1, 0, 22, PAGE.h, { fill: 'url(#spineR)' });
  // page gauche : le verso de la dernière feuille entièrement tournée
  const doneFlips = f.filter((k) => k >= 1).length;
  if (doneFlips > 0) {
    s += seyesLeft();
    // l'écriture de la page précédente transparaît, en miroir
    const prev = doneFlips - 1;
    if (prev >= 1) s += g({ transform: 'scale(-1 1)', opacity: 0.07 }, pageContent(prev, 99, lang));
    s += rect(-24, 0, 23, PAGE.h, { fill: 'url(#spineL)' });
  }
  // la feuille en train de tourner
  const k = f[cur - 1];
  if (k > 0 && k < 1) {
    const a = easeInOut(k) * Math.PI;
    const c = Math.cos(a);
    const shade = Math.sin(a) * 0.35;
    if (c > 0) {
      // recto : la page qu'on quitte, qui s'écrase vers la reliure
      const front = cur === 1 ? rightPage(99, lang, notebookFinal) : seyesRight() + pageContent(cur - 1, 99, lang);
      s += g({ transform: `scale(${n(c)} 1)` }, front + rect(1, 0, PAGE.w, PAGE.h, { fill: '#0B0E1A', opacity: n(shade) }));
    } else {
      s += g({ transform: `scale(${n(c)} 1)` }, seyesRight() + rect(1, 0, PAGE.w, PAGE.h, { fill: '#0B0E1A', opacity: n(shade * 0.8) }));
    }
    // ombre portée de la feuille soulevée
    s += rect(c > 0 ? 1 : -168, 0, PAGE.w, PAGE.h, { fill: '#0B0E1A', opacity: n(0.08 * Math.sin(a)) });
  }
  return s;
}
