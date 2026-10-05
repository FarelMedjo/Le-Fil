// Petite boîte à outils déterministe : easing, interpolation, géométrie, SVG.
// Tout est fonction du temps t (secondes) : aucune animation CSS, aucun état caché.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
export const mix2 = (p, q, k) => [lerp(p[0], q[0], k), lerp(p[1], q[1], k)];

// cubic-bezier CSS, résolu par Newton + bissection.
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (u) => ((ax * u + bx) * u + cx) * u;
  const sy = (u) => ((ay * u + by) * u + cy) * u;
  const dx = (u) => (3 * ax * u + 2 * bx) * u + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(u) - x;
      if (Math.abs(e) < 1e-6) return sy(u);
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    let lo = 0, hi = 1;
    u = x;
    for (let i = 0; i < 30; i++) {
      const v = sx(u);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = u; else hi = u;
      u = (lo + hi) / 2;
    }
    return sy(u);
  };
}

// Courbe de la DA : cubic-bezier(0.22, 1, 0.36, 1).
export const ease = cubicBezier(0.22, 1, 0.36, 1);
export const easeInOut = cubicBezier(0.65, 0, 0.35, 1);
export const easeIn = cubicBezier(0.5, 0, 0.75, 0);

// Animation entre t0 et t1 avec easing (DA par défaut).
export const anim = (t, t0, t1, fn = ease) => fn(prog(t, t0, t1));

// Images-clés : [[t, v], ...] ; v nombre ou tableau. Easing par segment.
export function keys(t, frames, fn = easeInOut) {
  if (t <= frames[0][0]) return frames[0][1];
  for (let i = 1; i < frames.length; i++) {
    const [t1, v1, f1] = frames[i];
    const [t0, v0] = frames[i - 1];
    if (t <= t1) {
      const k = (f1 || fn)(prog(t, t0, t1));
      return Array.isArray(v0) ? v0.map((a, j) => lerp(a, v1[j], k)) : lerp(v0, v1, k);
    }
  }
  return frames[frames.length - 1][1];
}

// ---------- géométrie ----------

// Catmull-Rom uniforme échantillonnée : une courbe douce qui passe par tous les points.
export function spline(pts, per = 18) {
  if (pts.length < 2) return pts.slice();
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    for (let s = 0; s < per; s++) {
      const u = s / per, u2 = u * u, u3 = u2 * u;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u +
        (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3)));
    }
  }
  out.push(pts[pts.length - 1].slice());
  return out;
}

export function arc(cx, cy, r, a0, a1, n = 72) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = lerp(a0, a1, i / n);
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

export function polyline(...segs) {
  const out = [];
  for (const s of segs) for (const p of s) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.01) out.push(p);
  }
  return out;
}

export const offset = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

// Polyligne mesurée : position par fraction de longueur, découpe partielle.
export class Fil {
  constructor(pts) {
    this.pts = pts;
    this.len = [0];
    for (let i = 1; i < pts.length; i++)
      this.len.push(this.len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    this.total = this.len[this.len.length - 1] || 1;
  }
  index(f) {
    const L = clamp(f) * this.total;
    let lo = 0, hi = this.len.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (this.len[m] < L) lo = m; else hi = m; }
    const seg = this.len[hi] - this.len[lo] || 1;
    return [lo, (L - this.len[lo]) / seg];
  }
  at(f) {
    const [i, k] = this.index(f);
    const a = this.pts[i], b = this.pts[Math.min(i + 1, this.pts.length - 1)];
    return mix2(a, b, k);
  }
  angle(f) {
    const [i] = this.index(f);
    const a = this.pts[i], b = this.pts[Math.min(i + 1, this.pts.length - 1)];
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
  }
  slice(f0, f1) {
    f0 = clamp(f0); f1 = clamp(f1);
    if (f1 <= f0) return [];
    const [i0, k0] = this.index(f0), [i1, k1] = this.index(f1);
    const out = [mix2(this.pts[i0], this.pts[Math.min(i0 + 1, this.pts.length - 1)], k0)];
    for (let i = i0 + 1; i <= i1; i++) out.push(this.pts[i]);
    out.push(mix2(this.pts[i1], this.pts[Math.min(i1 + 1, this.pts.length - 1)], k1));
    return out;
  }
}

// ---------- SVG ----------

export const n = (v) => (Math.round(v * 10) / 10).toString();
export const d = (pts) => (pts.length ? 'M' + pts.map((p) => n(p[0]) + ' ' + n(p[1])).join('L') : '');
export const attrs = (o) => Object.entries(o)
  .filter(([, v]) => v !== undefined && v !== null && v !== false)
  .map(([k, v]) => `${k}="${v}"`).join(' ');
export const el = (tag, o, inner) => inner === undefined ? `<${tag} ${attrs(o)}/>` : `<${tag} ${attrs(o)}>${inner}</${tag}>`;
export const g = (o, inner) => `<g ${attrs(o)}>${inner}</g>`;
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Mesure de texte (canvas) pour dimensionner les étiquettes SVG.
let ctx2d;
export function measure(text, font) {
  if (typeof document === 'undefined') return text.length * 20;
  ctx2d = ctx2d || document.createElement('canvas').getContext('2d');
  ctx2d.font = font;
  return ctx2d.measureText(text).width;
}

// Pseudo-aléatoire déterministe (grain, tremblés).
export function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
