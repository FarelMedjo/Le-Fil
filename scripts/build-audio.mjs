// Son témoin de l'animatique : bruitages et fond sonore synthétisés, calés sur la feuille de synchronisation.
//
// Ce n'est PAS la bande-son finale : le document prévoit d'enregistrer les objets de la trousse
// (section 5). Ce témoin sert à valider le rythme, la grille de 96 BPM et la courbe d'intensité
// avant la séance d'enregistrement. Chaque son imite l'objet prévu (crayon, gomme, compas, règle…).
//
// Une bande-son par version (src/cuts.js) : master 60 s, version courte 30 s, variante 64 s.
// Les bruitages suivent leur image dans le montage ; le fond sonore est remonté sur la grille de
// 96 BPM en suivant, segment par segment, la courbe d'intensité du master. Le 16:9 reprend le son du master.
//
// Sorties (out/audio), pour le master puis avec le suffixe -30s ou -64s :
//   le-fil-temoin.wav           mix complet, −14 LUFS intégrés, crête ≤ −1 dBFS
//   pistes/bruitages.wav        bruitages synchronisés seuls        (pistes en 32 bits flottants,
//   pistes/fond-sonore.wav      pulsation + trousse + nappe          au gain du mix, avant limiteur :
//   pistes/ambiance.wav         ambiance de pièce                    leur somme = le mix non limité)
//
//   node scripts/build-audio.mjs            les trois versions
//   node scripts/build-audio.mjs 30s        une seule version
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BEAT, FPS, at } from '../src/timeline.js';
import { CUTS, cutOf, segments, masterTime, versionTime } from '../src/cuts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out', 'audio');
const SR = 48000;
const TAU = Math.PI * 2;


// ---------- outils ----------

let seed = 1;
function rng(s = seed++) {
  let x = (s * 2654435761) >>> 0 || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
const db = (x) => 10 ** (x / 20);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const note = (name) => {
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  const semi = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (semi / 12);
};

class Biquad {
  constructor(type, f, q = 0.707) { this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(type, f, q); }
  set(type, f, q = 0.707) {
    const w = TAU * clamp(f, 10, SR * 0.45) / SR, cs = Math.cos(w), a = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
    else { b0 = a; b1 = 0; b2 = -a; } // passe-bande, gain crête 0 dB
    const a0 = 1 + a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * cs) / a0; this.a2 = (1 - a) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

function peakNorm(b, p = 1) {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] *= p / m;
  return b;
}
function rmsNorm(b, r = 0.25) {
  let s = 0, n = 0;
  for (const v of b) if (Math.abs(v) > 1e-5) { s += v * v; n++; }
  const cur = Math.sqrt(s / Math.max(1, n));
  if (cur > 0) for (let i = 0; i < b.length; i++) b[i] *= r / cur;
  return b;
}
function put(buf, t, data, gain = 1) {
  const o = Math.round(t * SR);
  for (let i = 0; i < data.length; i++) {
    const j = o + i;
    if (j >= 0 && j < buf.length) buf[j] += data[i] * gain;
  }
}
const ms = (x) => Math.round(x * SR / 1000);
const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));

// Réverbération de Schroeder (traîne du franchissement).
function reverb(input, tail = 1.6, wet = 0.4) {
  const out = new Float32Array(input.length + Math.round(tail * SR));
  const combs = [1687, 1601, 2053, 2251].map((d) => ({ d, b: new Float32Array(d), i: 0, fb: 0.8 }));
  const aps = [347, 113].map((d) => ({ d, b: new Float32Array(d), i: 0 }));
  for (let n = 0; n < out.length; n++) {
    const x = n < input.length ? input[n] : 0;
    let y = 0;
    for (const c of combs) { const v = c.b[c.i]; c.b[c.i] = x + v * c.fb; c.i = (c.i + 1) % c.d; y += v; }
    y /= combs.length;
    for (const a of aps) { const v = a.b[a.i]; const z = -0.6 * y + v; a.b[a.i] = y + 0.6 * z; a.i = (a.i + 1) % a.d; y = z; }
    out[n] = x + wet * y;
  }
  return out;
}

// ---------- bruitages ----------

// Voix de la ligne : grattement de graphite dont la hauteur suit la ligne (−5 bas, 0 mi-hauteur, +7 haut).
function graphite(dur, semis, { q = 1.5, base = 2500, thin = () => 1, attack = 15, release = 25 } = {}) {
  const n = Math.round(dur * SR), out = new Float32Array(n);
  const bp = new Biquad('bp', base, q), bp2 = new Biquad('bp', base * 1.9, q * 1.3), hp = new Biquad('hp', 700);
  const r = rng();
  let am = 1, target = 1, hold = 0;
  for (let i = 0; i < n; i++) {
    const u = i / n;
    if (i % 48 === 0) { const f = base * 2 ** (semis(u) / 12); bp.set('bp', f, q); bp2.set('bp', f * 1.9, q * 1.3); }
    if (--hold <= 0) { target = 0.45 + 0.55 * r(); hold = ms(3) + r() * ms(10); }
    am += (target - am) * 0.02;
    const x = r() * 2 - 1;
    const y = hp.run(bp.run(x) + 0.45 * bp2.run(x));
    const env = Math.min(1, i / ms(attack), (n - i) / ms(release));
    out[i] = y * am * env * thin(u);
  }
  return rmsNorm(out, 0.2);
}

function eraser(dur = 0.38, { soft = false } = {}) {
  const out = buf(dur), r = rng(), lp = new Biquad('lp', soft ? 900 : 1500, 0.9), hp = new Biquad('hp', 180);
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    const env = Math.sin(Math.PI * u) ** 1.4;
    const rub = 0.65 + 0.35 * Math.sin(TAU * (soft ? 18 : 27) * i / SR + r() * 0.3);
    out[i] = hp.run(lp.run(r() * 2 - 1)) * env * rub;
  }
  return rmsNorm(out, soft ? 0.12 : 0.2);
}

function slide(dur, f = 900, q = 0.8) {
  const out = buf(dur), r = rng(), bp = new Biquad('bp', f, q);
  let am = 1;
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    if (i % 200 === 0) am = 0.7 + 0.3 * r();
    out[i] = bp.run(r() * 2 - 1) * Math.min(1, u * 6) * (1 - u) ** 0.6 * am;
  }
  return rmsNorm(out, 0.16);
}

function click({ f = 3200, decay = 25, body = 0, noise = 1, len = 0.08 } = {}) {
  const out = buf(len), r = rng(), hp = new Biquad('hp', 1800);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = noise * hp.run(r() * 2 - 1) * Math.exp(-t / 0.0025);
    v += Math.sin(TAU * f * t) * Math.exp(-t / (decay / 1000)) * 0.8;
    if (body) v += Math.sin(TAU * body * t) * Math.exp(-t / 0.03) * 0.5;
    out[i] = v;
  }
  return peakNorm(out, 0.9);
}

function flips(dur, count, { f = 2600, gain = 1 } = {}) {
  const out = buf(dur + 0.1), r = rng();
  for (let k = 0; k < count; k++) {
    const o = Math.round((k / count) * dur * SR * (0.85 + 0.15 * r()));
    const bp = new Biquad('bp', f * (0.7 + 0.6 * r()), 0.9);
    const L = ms(30 + r() * 25);
    for (let i = 0; i < L && o + i < out.length; i++) out[o + i] += bp.run(r() * 2 - 1) * Math.exp(-i / ms(9)) * (0.6 + 0.4 * r());
  }
  return peakNorm(out, 0.8 * gain);
}

function ratchet(dur) {
  const out = buf(dur), r = rng();
  for (let k = 0; k * 0.045 < dur - 0.02; k++) put2(out, k * 0.045 + r() * 0.006, click({ f: 4800 + r() * 600, decay: 6, noise: 0.4, len: 0.03 }), 0.35);
  return out;
}
function put2(target, t, data, gain) { const o = Math.round(t * SR); for (let i = 0; i < data.length && o + i < target.length; i++) target[o + i] += data[i] * gain; }

function compassClick() {
  const a = click({ f: 2500, decay: 60, noise: 0.8, len: 0.25 });
  const b = click({ f: 4150, decay: 45, noise: 0, len: 0.25 });
  for (let i = 0; i < a.length; i++) a[i] = a[i] * 0.7 + b[i] * 0.45;
  return peakNorm(a, 0.9);
}

function tap({ soft = false } = {}) {
  const out = buf(0.18), r = rng(), lp = new Biquad('lp', soft ? 1200 : 2600);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 210 - 90 * Math.min(1, t / 0.04);
    out[i] = Math.sin(TAU * f * t) * Math.exp(-t / 0.045) + lp.run(r() * 2 - 1) * Math.exp(-t / 0.006) * 0.8;
  }
  return peakNorm(out, soft ? 0.55 : 0.8);
}

// Règle métallique pincée : corde résonnante qui vibre en se bloquant contre la table.
function twang(f, dur = 1.4) {
  const out = buf(dur);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const ff = f * (1 + 0.012 * Math.exp(-t / 0.08)) * (1 + 0.004 * Math.sin(TAU * 6 * t));
    let v = 0;
    for (const [h, g] of [[1, 1], [2, 0.5], [3, 0.32], [4, 0.18], [5.1, 0.1]]) v += Math.sin(TAU * ff * h * t) * g;
    const buzz = 1 + 0.25 * Math.sign(Math.sin(TAU * ff * 0.5 * t)) * Math.exp(-t / 0.12);
    out[i] = v * buzz * Math.exp(-t / 0.42) * Math.min(1, i / ms(2));
  }
  return peakNorm(out, 0.8);
}

function knock() {
  const out = buf(0.15), r = rng(), bp = new Biquad('bp', 720, 4);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = bp.run(r() * 2 - 1) * Math.exp(-t / 0.02) * 3 + Math.sin(TAU * 170 * t) * Math.exp(-t / 0.035) * 0.7;
  }
  return peakNorm(out, 0.85);
}

function creak(dur = 0.55) {
  const out = buf(dur), r = rng(), bp = new Biquad('bp', 900, 6);
  let f = 520, ph = 0;
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    f += (r() - 0.5) * 6;
    ph += TAU * f / SR;
    const stick = Math.max(0, Math.sin(TAU * 34 * i / SR)) ** 3;
    out[i] = bp.run(Math.sin(ph) * stick + (r() - 0.5) * 0.2) * Math.sin(Math.PI * u);
  }
  return peakNorm(out, 0.35);
}

function stamp() {
  const out = buf(0.3), r = rng(), lp = new Biquad('lp', 1800);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = Math.sin(TAU * (95 - 30 * Math.min(1, t / 0.05)) * t) * Math.exp(-t / 0.07) + lp.run(r() * 2 - 1) * Math.exp(-t / 0.012) * 1.2;
  }
  return peakNorm(out, 0.95);
}

function stapler() {
  const out = buf(0.25);
  put2(out, 0, click({ f: 3500, decay: 20, body: 400, len: 0.1 }), 0.8);
  put2(out, 0.038, click({ f: 2200, decay: 35, body: 300, len: 0.12 }), 1);
  return peakNorm(out, 0.85);
}

// Verre frappé au crayon : partiels inharmoniques, longue résonance.
function glass(f, dur = 1.6) {
  const out = buf(dur);
  const parts = [[1, 1, 1.1], [2.32, 0.45, 0.6], [4.25, 0.22, 0.35], [6.63, 0.1, 0.2]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [h, g, d] of parts) v += Math.sin(TAU * f * h * t) * g * Math.exp(-t / d);
    out[i] = v * Math.min(1, i / ms(1.5));
  }
  return peakNorm(out, 0.6);
}

// Cloche à main de récréation, en ré.
function bell(f = note('D5'), dur = 2.2) {
  const out = buf(dur), r = rng();
  const parts = [[0.5, 0.35, 1.6], [1, 1, 1.4], [1.19, 0.4, 0.9], [1.5, 0.35, 0.8], [2.0, 0.45, 0.7], [2.74, 0.2, 0.45], [3.76, 0.12, 0.3]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [h, g, d] of parts) v += Math.sin(TAU * f * h * t * (1 + 0.0008 * Math.sin(TAU * 4 * t))) * g * Math.exp(-t / d);
    v += (r() * 2 - 1) * Math.exp(-t / 0.004) * 0.6;
    out[i] = v;
  }
  return peakNorm(out, 0.9);
}

// Timbres des trois fils : crayon, craie, feutre.
function timbre(kind, dur = 0.42) {
  if (kind === 'crayon') return graphite(dur, (u) => 2 + 2 * u, { q: 2.2 });
  if (kind === 'craie') {
    const g = graphite(dur, (u) => -1 + 2 * u, { q: 0.9, base: 1500 });
    const r = rng();
    for (let i = 0; i < g.length; i++) g[i] *= r() < 0.004 ? 2.2 : 1; // poussière, accrocs
    return g;
  }
  const out = graphite(dur, (u) => 1 + u, { q: 0.8, base: 1700 }); // feutre : plus doux, une pointe tonale
  for (let i = 0; i < out.length; i++) out[i] = out[i] * 0.7 + Math.sin(TAU * 880 * i / SR) * 0.05 * Math.sin(Math.PI * i / out.length);
  return out;
}

function chord(freqs, dur = 2.6, bright = 1) {
  const out = buf(dur);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const f of freqs) v += (Math.sin(TAU * f * t) + 0.3 * bright * Math.sin(TAU * 2 * f * t) + 0.1 * bright * Math.sin(TAU * 3 * f * t)) * Math.exp(-t / 1.1);
    out[i] = v * Math.min(1, i / ms(25));
  }
  return peakNorm(out, 0.6);
}

// ---------- bruitages du master (feuille de synchronisation) ----------

// Chaque bruitage est synthétisé une fois, puis posé dans chaque version à l'instant de son image.
const EV = [];
const at2 = (t, data, gain = 1, label = '') => { EV.push({ t, data, gain, label }); };


// Plan 0 : la ligne monte, cale (6 images de silence), redescend, gomme ×2
at2(at(9), graphite(at(56) - at(9), (u) => -5 + 5 * (1 - (1 - u) ** 2), { release: 4 }), 1, 'graphite montant');
at2(at(63), graphite(0.32, (u) => -0.5 - 1.5 * u), 0.8, 'graphite descendant');
at2(at(75), eraser(), 1, 'gomme 1');
at2(at(94), eraser(0.4), 1, 'gomme 2');
// Plan 1
at2(at(131), slide(at(169) - at(131) + 0.05), 0.9, 'glissé sur bois');
at2(at(188), click({ f: 3400, decay: 22 }), 0.9, 'capuchon');
at2(219 / 30, flips(0.28, 5), 0.7, 'feuilletage bref');
at2(at(281), graphite(0.62, (u) => -2 + 5 * u), 0.5, 'graphite discret');
// Plan 2
at2(at(300), ratchet(1.2), 0.8, 'rotation de compas');
at2(at(338), compassClick(), 1, 'clic de compas');
for (const f of [394, 413, 431, 450]) at2(at(f), tap(), 0.8, 'tapotement');
at2(at(488), graphite(1.25, (u) => 4 + 3 * u, { q: 3.2 }), 0.75, 'graphite tendu');
// Plan 3
for (const n of ['D4', 'F#4', 'A4']) at2(at(525), twang(note(n)), 0.5, 'twang triple');
at2(at(544), timbre('crayon'), 0.9, 'timbre crayon');
at2(at(563), timbre('craie'), 0.9, 'timbre craie');
at2(at(581), timbre('feutre'), 0.9, 'timbre feutre');
for (const f of [713, 731, 750, 769]) at2(at(f), graphite(0.13, (u) => 1 + 4 * u, { q: 2, attack: 3, release: 20 }), 0.9, 'coche');
at2(at(806), graphite(1.225, () => 0), 0.6, 'graphite neutre');
// Plan 4
at2(at(863), knock(), 1, 'toc 1');
at2(at(872), knock(), 0.9, 'toc 2');
at2(at(881), creak(), 0.5, 'grincement');
at2(at(900), slide(0.45, 520, 2.5), 0.5, 'chaise');
at2(at(938), graphite(at(975) - at(938), (u) => -1 + u, { thin: (u) => (u < 0.84 ? 1 : 1 - 0.55 * (u - 0.84) / 0.16), release: 4 }), 0.9, 'graphite reprend');
at2(at(975), reverb(graphite(1.875, (u) => 2 + 3 * u), 1.8, 0.5), 1, 'franchissement');
at2(at(1031), graphite(0.625, (u) => 5 + 2 * u), 0.7, 'graphite montant');
// Plan 5
for (const f of [1050, 1069, 1088, 1106]) at2(at(f), flips(0.2, 3), 0.7, 'feuilletage');
at2(at(1125), slide(0.45, 2000, 0.7), 0.7, 'glissement de feuille');
at2(at(1163), stamp(), 1, 'tampon');
at2(at(1200), eraser(0.55, { soft: true }), 1, 'gomme douce');
at2(at(1256), stapler(), 1, 'agrafeuse');
at2(at(1313), graphite(1.25, (u) => u), 0.45, 'graphite discret');
// Plan 6
at2(at(1388), glass(note('A5')), 0.5, 'carillon 1');
at2(at(1406), glass(note('D6')), 0.5, 'carillon 2');
at2(1475 / 30, flips(0.5, 10, { f: 1800, gain: 1 }), 0.9, 'feuilletage large');
// Plan 7
for (const [k, s] of [['crayon', 0], ['craie', 1], ['feutre', 2]]) at2(at(1500) + s * 0.02, timbre(k, 0.32), 0.6, 'convergence');
at2(at(1509), graphite(1.6, (u) => -5 + 12 * u), 0.9, 'glissando');
at2(at(1519), click({ f: 4200, decay: 22 }), 0.9, 'logo 01 capuchon');
at2(at(1528), compassClick(), 0.85, 'logo 02 compas');
at2(at(1538), twang(note('D4'), 0.9), 0.7, 'logo 03 twang');
at2(at(1547), knock(), 0.9, 'logo 04 toc');
at2(at(1556), stamp(), 0.9, 'logo 05 tampon');
at2(at(1575), chord([note('D4'), note('F#4'), note('A4'), note('D5')]), 0.7, 'accord de résolution');
for (const k of ['crayon', 'craie', 'feutre']) at2(at(1575), timbre(k, 0.5), 0.35, 'unisson des fils');
at2(at(1632), graphite(0.4, (u) => 4 * u), 0.6, 'graphite court');
at2(at(1725), tap({ soft: true }), 0.8, 'tapotement feutré');
at2(at(1744), tap({ soft: true }), 0.8, 'tapotement feutré');
at2(at(1763), bell(), 0.8, 'cloche à main');

// Sons liés à un mouvement de la ligne ou d'un objet : une coupe les interrompt (fondu de la durée
// indiquée, en secondes). Les autres (clics, tampon, twang, verre, cloche…) résonnent au-delà de la coupe.
const MOTION = {
  'graphite montant': 0.08, 'graphite descendant': 0.08, 'glissé sur bois': 0.08, 'graphite discret': 0.08,
  'graphite tendu': 0.08, 'graphite neutre': 0.08, 'graphite reprend': 0.08, franchissement: 0.5,
  chaise: 0.08, 'glissement de feuille': 0.08, 'gomme douce': 0.08, glissando: 0.08, 'graphite court': 0.08,
};

function trimIn(data, skip) {
  const out = data.slice(Math.round(skip * SR));
  for (let i = 0; i < Math.min(out.length, ms(15)); i++) out[i] *= i / ms(15);
  return out;
}
function trimOut(data, keep, tail) {
  const k = Math.max(0, Math.round(keep * SR)), n = Math.round(tail * SR);
  const out = data.slice(0, k + n);
  for (let i = 0; i < n && k + i < out.length; i++) out[k + i] *= 1 - i / n;
  return out;
}

// Bruitages d'une version : chaque son suit son image ; un son attaché à un texte déplacé suit le texte.
function fxFor(cut, len) {
  const fx = new Float32Array(len);
  const segs = segments(cut).filter((s) => s.rate === 1); // le temps ralenti ne porte aucun bruitage
  const recue = cut.recue || {};
  let n = 0;
  for (const e of EV) {
    const moved = recue[Math.round(e.t * FPS)];
    if (moved !== undefined) { put(fx, moved, e.data, e.gain); n++; continue; }
    const dur = e.data.length / SR, tail = MOTION[e.label];
    for (const s of segs) {
      const inside = e.t >= s.from - 1e-9 && e.t < s.to - 1e-9;
      const running = tail !== undefined && e.t < s.from && e.t + dur > s.from + 0.02; // déjà lancé à la coupe
      if (!inside && !running) continue;
      let data = e.data, t0 = e.t;
      if (running) { data = trimIn(data, s.from - e.t); t0 = s.from; }
      if (tail !== undefined && t0 + data.length / SR > s.to + tail) data = trimOut(data, s.to - t0, tail);
      put(fx, s.at + (t0 - s.from), data, e.gain);
      n++;
    }
  }
  return { fx, n };
}

// Graine du hasard au début du fond sonore : chaque version repart de la même, la variante 64 s
// reproduit donc le master à l'échantillon près.
const BED_SEED = seed;


// ---------- fond sonore (96 BPM) ----------

// Automation : images-clés [t, valeur] ; deux clés rapprochées = coupure nette.
const auto = (keys) => (t) => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      return v0 + (v1 - v0) * (t - t0) / (t1 - t0);
    }
  }
  return keys[keys.length - 1][1];
};
const CUT = 0.005;
const pulseLevel = auto([[0, 0], [at(113), 0], [at(113) + 0.3, 0.25], [10, 0.25], [10.3, 0.55], [17.4, 0.55], [17.5, 0.85],
  [26.8, 0.85], [27.2, 0.45], [31.0, 0.45], [31.0 + CUT, 0], [32.5 - CUT, 0], [32.5, 0.85], [43.6, 0.85], [44.0, 0.4],
  [49.7, 0.4], [49.7 + CUT, 0], [52.5 - CUT, 0], [52.5, 0.9], [58.75, 0.9], [58.75 + CUT, 0]]);
const shakerLevel = auto([[0, 0], [10 - CUT, 0], [10, 0.45], [17.4, 0.45], [17.5, 0.8], [26.875, 0.8], [26.875 + CUT, 0],
  [32.5 - CUT, 0], [32.5, 0.75], [43.75, 0.75], [44.2, 0], [52.5 - CUT, 0], [52.5, 0.8], [58.75, 0.8], [58.75 + CUT, 0]]);
const padLevel = auto([[0, 0], [10, 0], [10.6, 0.5], [16.25, 0.5], [16.9, 0.75], [31.0, 0.75], [31.3, 0.8], [32.3, 0.8], [32.45, 0.35],
  [32.5, 0.9], [35.0, 0.75], [44.5, 0.75], [45.3, 0.42], [49.7, 0.42], [49.7 + CUT, 0], [52.5 - CUT, 0], [52.5, 0.85],
  [58.75, 0.85], [58.75 + CUT, 0]]);
const voice2 = auto([[0, 0], [17.5 - CUT, 0], [17.5, 1], [40.0, 1], [40.2, 0], [41.875 - CUT, 0], [41.875, 1], [45, 1], [45.6, 0], [52.5 - CUT, 0], [52.5, 1]]);
const voice3 = auto([[0, 0], [17.5 - CUT, 0], [17.5, 1], [45, 1], [45.6, 0.6], [52.5, 1]]);
// Ré – fa dièse – la ; un ton plus haut au franchissement ; plus clair à la fin.
const pitch = auto([[0, 0], [32.5 - CUT, 0], [32.5, 2], [35.0, 2], [35.6, 0], [52.5 - CUT, 0], [52.5, 12]]);
const bright = auto([[0, 0.25], [52.5 - CUT, 0.25], [52.5, 0.55]]);

// Bruitages signature sous lesquels le fond s'atténue de 3 à 4 dB (images du master).
const DUCK = [338, 525, 1163, 1519, 1528, 1538, 1547, 1556, 1763];

// Fond sonore d'une version : à chaque instant, la courbe d'intensité du master à l'image montrée.
// Coupes et départs restent sur la grille ; au saut d'une coupe, les niveaux passent en 5 ms.
function bedFor(cut, len) {
  seed = BED_SEED;
  const bed = new Float32Array(len);
  const segs = segments(cut);
  const mt = (t) => masterTime(cut, t);
  const jumps = segs.slice(1).filter((s, i) => Math.abs(s.from - segs[i].to) > 1e-6).map((s) => s.at);
  const stop = cut.stop ?? Infinity; // version courte : tout s'arrête sur la cloche
  const gate = (t) => (t < stop ? 1 : t < stop + CUT ? 1 - (t - stop) / CUT : 0);
  const level = (fn) => (t) => {
    for (const c of jumps) {
      if (Math.abs(t - c) < CUT / 2) {
        const a = fn(mt(c - CUT / 2)), b = fn(mt(c + CUT / 2));
        return (a + (b - a) * (t - c + CUT / 2) / CUT) * gate(t);
      }
    }
    return fn(mt(t)) * gate(t);
  };
  const pulse = level(pulseLevel), shaker = level(shakerLevel), pad = level(padLevel), v2 = level(voice2), v3 = level(voice3);
  const pitchAt = (t) => pitch(mt(t)), brightAt = (t) => bright(mt(t));
  const recue = cut.recue || {};
  const ducks = DUCK.map((f) => recue[f] ?? versionTime(cut, at(f))).filter((x) => x !== null && Number.isFinite(x));
  const duck = (t) => {
    let g = 1;
    for (const d of ducks) {
      const x = t - d;
      if (x < -0.02 || x > 0.4) continue;
      const e = x < 0 ? (x + 0.02) / 0.02 : x < 0.12 ? 1 : 1 - (x - 0.12) / 0.28;
      g = Math.min(g, 1 - (1 - db(-3.5)) * e);
    }
    return g;
  };
  const beats = Math.ceil(len / SR / BEAT);

  // Pulsation : crayon tapé côté gomme sur un cahier fermé, sur chaque temps.
  for (let k = 0; k < beats; k++) {
    const t = k * BEAT;
    const lv = pulse(t + 0.001);
    if (lv > 0) put(bed, t, tap({ soft: true }), lv * 0.7);
  }
  // Trousse : secouée d'un coup sec sur les croches.
  {
    const r = rng(99);
    for (let k = 0; k < beats * 2; k++) {
      const t = k * BEAT / 2;
      const lv = shaker(t + 0.001);
      if (lv <= 0) continue;
      const s = buf(0.12), bp = new Biquad('bp', 4200 + r() * 800, 0.8), hp = new Biquad('hp', 2000);
      for (let i = 0; i < s.length; i++) s[i] = hp.run(bp.run(r() * 2 - 1)) * Math.min(1, i / ms(6)) * Math.exp(-i / ms(35));
      peakNorm(s, 1);
      put(bed, t, s, lv * [0.5, 0.25, 0.38, 0.25][k % 4]);
    }
  }
  // Nappe : verre chanté, trois voix ; coupe-bas à 150 Hz.
  {
    const hp = new Biquad('hp', 150, 0.7);
    const ph = [0, 0, 0, 0, 0, 0];
    const base = [note('D4'), note('F#4'), note('A4')];
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      const lv = pad(t);
      let v = 0;
      if (lv > 0) {
        const tr = 2 ** (pitchAt(t) / 12), b = brightAt(t);
        const gains = [1, v2(t), v3(t)];
        for (let k = 0; k < 3; k++) {
          if (gains[k] <= 0) continue;
          const f = base[k] * tr * (1 + 0.0015 * Math.sin(TAU * (4.6 + k * 0.4) * t));
          ph[k] += TAU * f / SR;
          ph[k + 3] += TAU * f * 1.0021 / SR; // battement du verre
          v += gains[k] * (Math.sin(ph[k]) + 0.6 * Math.sin(ph[k + 3]) + b * Math.sin(2 * ph[k]) + b * 0.3 * Math.sin(3 * ph[k]));
        }
        v *= lv * 0.12 * (0.92 + 0.08 * Math.sin(TAU * 0.4 * t));
      }
      bed[i] += hp.run(v);
    }
  }
  for (let i = 0; i < len; i++) bed[i] *= duck(i / SR);
  return bed;
}

// Ambiance de pièce calme le soir : plus présente avant l'entrée du fond et après la cloche finale.
function ambienceFor(cut, len) {
  const amb = new Float32Array(len);
  const r = rng(5), lp = new Biquad('lp', 1800), hp = new Biquad('hp', 90);
  const bedIn = cut.bedIn ?? at(113), bell = cut.bell ?? at(1763), end = cut.duration;
  const lv = auto([[0, 0.022], [bedIn, 0.022], [bedIn + 1.25, 0.012], [bell, 0.012], [bell + 0.25, 0.02], [end - 0.6, 0.02], [end, 0]]);
  for (let i = 0; i < len; i++) amb[i] = hp.run(lp.run(r() * 2 - 1)) * lv(i / SR) * 3;
  return amb;
}


// ---------- mix, normalisation, export ----------

const BED_GAIN = db(-9); // le fond reste 8 à 10 dB sous les bruitages


function wav(file, data) {
  const b = Buffer.alloc(44 + data.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + data.length * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) b.writeInt16LE(Math.round(clamp(data[i], -1, 1) * 32767), 44 + i * 2);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
}

// Pistes séparées en WAV 32 bits flottants : au gain du mix mais avant le limiteur, elles dépassent
// 0 dBFS sur les attaques ; le flottant les garde intactes, et leur somme refait le mix non limité.
function wavFloat(file, data) {
  const b = Buffer.alloc(58 + data.length * 4);
  b.write('RIFF', 0); b.writeUInt32LE(50 + data.length * 4, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(18, 16); b.writeUInt16LE(3, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(32, 34); b.writeUInt16LE(0, 36);
  b.write('fact', 38); b.writeUInt32LE(4, 42); b.writeUInt32LE(data.length, 46);
  b.write('data', 50); b.writeUInt32LE(data.length * 4, 54);
  for (let i = 0; i < data.length; i++) b.writeFloatLE(data[i], 58 + i * 4);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
}

// Loudness intégrée et crête (ffmpeg ebur128, résumé sur stderr).
function measure(file) {
  const { stderr } = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const summary = stderr.slice(stderr.lastIndexOf('Summary'));
  const I = /I:\s+(-?[\d.]+) LUFS/.exec(summary);
  const P = /Peak:\s+(-?[\d.]+) dBFS/.exec(summary);
  return { I: I ? Number(I[1]) : NaN, TP: P ? Number(P[1]) : NaN };
}

// Limiteur à anticipation : le gain descend avant la crête, remonte en 80 ms.
function limit(data, ceil) {
  const look = ms(5), att = Math.exp(-1 / ms(1.2)), rel = Math.exp(-1 / ms(80));
  const need = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) need[i] = Math.abs(data[i]) > ceil ? ceil / Math.abs(data[i]) : 1;
  // minimum glissant sur la fenêtre d'anticipation
  const win = new Float32Array(data.length);
  const dq = [];
  for (let i = data.length - 1; i >= 0; i--) {
    while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop();
    dq.push(i);
    while (dq[0] > i + look) dq.shift();
    win[i] = need[dq[0]];
  }
  let g = 1;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    g = win[i] < g ? win[i] + (g - win[i]) * att : 1 - (1 - g) * rel;
    out[i] = clamp(data[i] * Math.min(g, need[i] < 1 ? need[i] : 1), -ceil, ceil);
  }
  return out;
}

function build(cut) {
  const len = Math.round(cut.duration * SR);
  const { fx, n } = fxFor(cut, len);
  const bed = bedFor(cut, len);
  const amb = ambienceFor(cut, len);
  const mix = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const fade = Math.min(1, (len - i) / ms(300));
    fx[i] *= fade; bed[i] *= fade * BED_GAIN; amb[i] *= fade;
    mix[i] = fx[i] + bed[i] + amb[i];
  }
  // Mise à −14 LUFS intégrés, crête ≤ −1 dBFS : deux passes (le limiteur retire un peu de loudness).
  const tmp = path.join(OUT, '_mesure.wav');
  wav(tmp, mix);
  const before = measure(tmp);
  let gain = db(-14 - before.I);
  let final;
  for (let pass = 0; pass < 6; pass++) {
    final = limit(mix.map((v) => v * gain), db(-2.6)); // marge pour la crête réelle (suréchantillonnée)
    wav(tmp, final);
    const m = measure(tmp);
    if (Math.abs(m.I + 14) < 0.2) break;
    gain *= db(-14 - m.I);
  }
  for (const a of [fx, bed, amb]) for (let i = 0; i < a.length; i++) a[i] *= gain;
  const sfx = cut.id === 'master' ? '' : `-${cut.id}`;
  const file = path.join(OUT, `le-fil-temoin${sfx}.wav`);
  wav(file, final);
  wavFloat(path.join(OUT, `pistes${sfx}`, 'bruitages.wav'), fx);
  wavFloat(path.join(OUT, `pistes${sfx}`, 'fond-sonore.wav'), bed);
  wavFloat(path.join(OUT, `pistes${sfx}`, 'ambiance.wav'), amb);
  fs.unlinkSync(tmp);
  const after = measure(file);
  console.log(`${cut.name} : ${n} bruitages posés · avant ${before.I} LUFS → ${after.I} LUFS intégrés, crête ${after.TP} dBFS`);
  console.log(`→ ${path.relative(ROOT, file)} + pistes séparées dans pistes${sfx}/ (bruitages, fond sonore, ambiance)`);
}

const only = process.argv[2];
for (const cut of only ? [cutOf(only)] : Object.values(CUTS)) build(cut);
