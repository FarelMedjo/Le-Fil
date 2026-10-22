// Écriture à la main, trait par trait, avec les glyphes à trait unique de src/glyphs.js.
//
// Une écriture est une suite de morceaux de texte posés sur des lignes, chacun écrit dans une fenêtre
// de temps. Elle sait dire, à tout instant : ce qui est déjà tracé, où est la mine, si elle touche le
// papier et à quelle vitesse elle avance. Le son (scripts/build-audio.mjs) lit cette vitesse : le
// grattement du crayon suit exactement les lettres qu'on voit s'écrire.
//
// Unités : millimètres de la page, y vers le bas, ligne de base à y = 0 de chaque ligne.
import { GLYPHS } from './glyphs.js';
import { rand, clamp, lerp, prog } from './util.js';

// Signes absents des polices Hershey : on les écrit comme à la main.
const CHARS = { '−': '-', '×': 'x', '’': "'" };
const LIFT_MIN = 0.035; // durée minimale d'un lever de crayon (s)
const LIFT_SPEED = 3.2; // en l'air, la main va plus vite qu'en écrivant

function measure(pts) {
  let len = 0;
  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    cum.push(len);
  }
  return { len, cum };
}

function pointAt(s, d) {
  if (d <= 0) return s.pts[0];
  if (d >= s.len) return s.pts[s.pts.length - 1];
  let lo = 0, hi = s.cum.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (s.cum[m] < d) lo = m; else hi = m; }
  const k = (d - s.cum[lo]) / (s.cum[hi] - s.cum[lo] || 1);
  return [lerp(s.pts[lo][0], s.pts[hi][0], k), lerp(s.pts[lo][1], s.pts[hi][1], k)];
}

function partial(s, d) {
  if (d >= s.len) return s.pts;
  const out = [];
  for (let i = 0; i < s.pts.length && s.cum[i] < d; i++) out.push(s.pts[i]);
  out.push(pointAt(s, d));
  return out;
}

// Pose un texte : traits en millimètres, à partir de (x, y) sur la ligne de base.
// `xh` hauteur d'x en mm ; `wobble` irrégularité de la main (0 : régulière).
export function layout(text, { font = 'script', x = 0, y = 0, xh = 3.4, seed = 1, wobble = 1, track = 1, slant = 0 } = {}) {
  const F = GLYPHS[font];
  const sc = xh / F.xh;
  const r = rand(seed);
  const strokes = [];
  let cx = x;
  for (const c0 of text) {
    const ch = CHARS[c0] || c0;
    const gl = F.glyphs[ch] || F.glyphs[' '];
    const [adv, st] = gl;
    const k = sc * (1 + (r() - 0.5) * 0.08 * wobble);
    const dy = (r() - 0.5) * 0.35 * wobble;
    const a = ((r() - 0.5) * 3 * wobble + slant) * Math.PI / 180;
    const ca = Math.cos(a), sa = Math.sin(a);
    for (const flat of st) {
      const pts = [];
      for (let i = 0; i < flat.length; i += 2) {
        const gx = flat[i] * k, gy = flat[i + 1] * k;
        pts.push([cx + gx * ca - gy * sa, y + dy + gx * sa + gy * ca]);
      }
      const m = measure(pts);
      if (m.len > 0.01) strokes.push({ pts, ...m, ch });
    }
    cx += adv * k * track;
  }
  return { strokes, width: cx - x, end: [cx, y] };
}

// Largeur d'un texte posé (pour centrer ou aligner).
export const widthOf = (text, opts) => layout(text, opts).width;

// Une écriture : morceaux [{ text, at: [t0, t1], ...options de layout, ink }], tracés dans l'ordre.
export class Writing {
  constructor(pieces) {
    this.pieces = pieces.map((p) => {
      // un morceau est un texte, ou un dessin donné par ses traits (`paths`)
      const lay = p.paths
        ? { strokes: p.paths.map((pts) => ({ pts, ...measure(pts) })), width: 0, end: [0, 0] }
        : layout(p.text, p);
      const strokes = lay.strokes;
      // répartit la fenêtre de temps entre traits (au prorata de la longueur) et levers de crayon
      const lifts = strokes.map((s, i) => (i === 0 ? 0 : Math.max(LIFT_MIN, 0)));
      let ink = 0, air = 0;
      strokes.forEach((s, i) => {
        ink += s.len;
        if (i > 0) {
          const a = strokes[i - 1].pts.at(-1), b = s.pts[0];
          lifts[i] = Math.hypot(b[0] - a[0], b[1] - a[1]);
          air += lifts[i];
        }
      });
      const [t0, t1] = p.at;
      const T = t1 - t0;
      // vitesse d'écriture v telle que : ink / v + air / (v · LIFT_SPEED) + (n−1) · lift = T ;
      // le temps mort de chaque lever (LIFT_MIN) se resserre si la fenêtre est trop courte, pour ne jamais en déborder
      const n = strokes.length;
      const lift = n > 1 ? Math.min(LIFT_MIN, Math.max(0, T - 0.05) / (n - 1)) : 0;
      const fixed = Math.max(0, n - 1) * lift;
      const v = (ink + air / LIFT_SPEED) / Math.max(1e-3, T - fixed);
      let t = t0;
      strokes.forEach((s, i) => {
        if (i > 0) t += lift + lifts[i] / (v * LIFT_SPEED);
        s.t0 = t;
        t += s.len / v;
        s.t1 = t;
      });
      return { ...p, ...lay, speed: v };
    });
    this.strokes = this.pieces.flatMap((p) => p.strokes.map((s) => ({ ...s, piece: p })));
    this.t0 = Math.min(...this.pieces.map((p) => p.at[0]));
    this.t1 = Math.max(...this.pieces.map((p) => p.at[1]));
  }

  // Fraction parcourue d'un trait à l'instant t : la mine accélère puis freine dans chaque trait.
  static along(s, t) {
    const k = clamp((t - s.t0) / (s.t1 - s.t0 || 1));
    return s.len * (k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k)) * 0.35 + s.len * k * 0.65;
  }

  // Traits visibles à l'instant t, par morceau : [{ piece, pts[] }].
  visible(t, filter) {
    const out = [];
    for (const s of this.strokes) {
      if (t < s.t0 || (filter && !filter(s.piece))) continue;
      out.push({ piece: s.piece, pts: t >= s.t1 ? s.pts : partial(s, Writing.along(s, t)) });
    }
    return out;
  }

  // Position de la mine, contact et vitesse (mm/s) à l'instant t.
  pen(t) {
    const S = this.strokes;
    if (!S.length) return null;
    if (t <= S[0].t0) return { pos: S[0].pts[0], down: false, speed: 0, active: false };
    for (let i = 0; i < S.length; i++) {
      const s = S[i];
      if (t >= s.t0 && t <= s.t1) {
        const d = Writing.along(s, t), d2 = Writing.along(s, Math.min(s.t1, t + 1 / 240));
        const dt = Math.min(s.t1, t + 1 / 240) - t;
        return { pos: pointAt(s, d), down: true, speed: dt > 0 ? (d2 - d) / dt : 0, active: true, piece: s.piece };
      }
      const n = S[i + 1];
      if (n && t > s.t1 && t < n.t0) {
        // en l'air, entre deux traits (et entre deux morceaux, si la pause est longue la main se repose)
        const a = s.pts.at(-1), b = n.pts[0];
        const k = prog(t, s.t1, n.t0);
        const e = k * k * (3 - 2 * k);
        return { pos: [lerp(a[0], b[0], e), lerp(a[1], b[1], e)], down: false, speed: 0, active: n.t0 - s.t1 < 0.4, piece: n.piece };
      }
    }
    return { pos: S.at(-1).pts.at(-1), down: false, speed: 0, active: false };
  }
}

// Chemin SVG d'une liste de traits.
export const strokePath = (list) => list.map(({ pts }) => 'M' + pts.map((p) => `${Math.round(p[0] * 100) / 100} ${Math.round(p[1] * 100) / 100}`).join('L')).join('');
