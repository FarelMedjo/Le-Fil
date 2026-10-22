// Bande-son de « Exercice 3 » : bruitages et musique synthétisés, calés à l'image près.
//
// Rien n'est enregistré ni tiré d'une banque de sons : chaque son est fabriqué ici à partir d'un modèle
// physique simple (bruit filtré, résonances modales, collisions de grains). Les bruitages liés à un
// mouvement lisent ce mouvement dans l'animation : le crayon et les stylos suivent la vitesse réelle de
// la mine (src/write.js), la gomme suit la main qui frotte, les fiches claquent à l'image où elles se posent.
//
// La musique est un bikutsi (la musique de Yaoundé) en 12/8 à 120 BPM : balafon (lames de bois et
// calebasses qui bourdonnent), main à plat sur la table, règle claquée, trousse secouée, basse, nappe.
//
// Sorties (out/audio), pour le master puis avec le suffixe -30s ou -64s :
//   bande-son.wav              mix stéréo, −14 LUFS intégrés, crête réelle ≤ −1 dBTP
//   pistes/bruitages.wav       bruitages seuls             (pistes en 32 bits flottants, au gain du mix,
//   pistes/musique.wav         musique seule                avant limiteur : leur somme refait le mix
//   pistes/ambiance.wav        pièce, grillons, horloge     non limité)
//
//   node scripts/build-audio.mjs            les trois versions
//   node scripts/build-audio.mjs 30s        une seule version
//   node scripts/build-audio.mjs --en       version anglaise (les écritures changent : leurs sons aussi)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { BEAT } from '../src/timeline.js';
import { CUTS, cutOf, segments, cardsFor } from '../src/cuts.js';
import { content } from '../src/notebook.js';
import { monthWritings } from '../src/month.js';
import { CARDS } from '../src/texts.js';
import { keyTimes, SEND, REPLY, RING, ANSWER, FIELDS, SENT, PROPOSAL, PAY_TAP, PAY_OK } from '../src/phone.js';
import { CARD_LAND, STAMPS, FLIPS, BACK_FLIPS, CARD_SWAP, REPORT_IN, REPORT_OUT, BUMP, MONTH_WRITERS } from '../src/world.js';
import { REPORT_TICKS } from '../src/props.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out', 'audio');
const SR = 48000;
const TAU = Math.PI * 2;
const MASTER = 60;
const TAIL = 5; // les stems du master durent 5 s de plus : la cloche et la pièce portent la tenue de la variante 64 s

// ---------- outils ----------

let seedCounter = 1;
function rng(s = seedCounter++) {
  let x = (Math.imul(s, 2654435761) >>> 0) || 1;
  return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
}
const db = (x) => 10 ** (x / 20);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ms = (x) => Math.round((x * SR) / 1000);
const buf = (sec) => new Float32Array(Math.max(1, Math.round(sec * SR)));
const NOTE = (name) => {
  const m = /^([A-G])(#|b?)(-?\d)$/.exec(name);
  const semi = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (semi / 12);
};

class Biquad {
  constructor(type, f, q = 0.707) { this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(type, f, q); }
  set(type, f, q = 0.707) {
    const w = (TAU * clamp(f, 10, SR * 0.45)) / SR, cs = Math.cos(w), a = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
    else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
    else { b0 = a; b1 = 0; b2 = -a; } // passe-bande, gain crête 0 dB
    const a0 = 1 + a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * cs) / a0; this.a2 = (1 - a) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}
const onePole = (f) => { const a = Math.exp((-TAU * f) / SR); let y = 0; return (x) => (y = x + (y - x) * a); };

function peakNorm(b, p = 1) {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < b.length; i++) b[i] *= p / m;
  return b;
}
function rmsNorm(b, r = 0.2) {
  let s = 0, n = 0;
  for (const v of b) if (Math.abs(v) > 1e-6) { s += v * v; n++; }
  const cur = Math.sqrt(s / Math.max(1, n));
  if (cur > 0) for (let i = 0; i < b.length; i++) b[i] *= r / cur;
  return b;
}
const filt = (b, ...fs) => { for (const f of fs) for (let i = 0; i < b.length; i++) b[i] = f.run(b[i]); return b; };

// Bus stéréo : pose un son mono à l'instant t, avec un gain et un panoramique (−1 gauche, +1 droite).
class Bus {
  constructor(sec) { this.L = buf(sec); this.R = buf(sec); }
  put(t, data, gain = 1, pan = 0) {
    const o = Math.round(t * SR);
    const gl = gain * Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, gr = gain * Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2;
    for (let i = 0; i < data.length; i++) {
      const j = o + i;
      if (j < 0 || j >= this.L.length) continue;
      this.L[j] += data[i] * gl; this.R[j] += data[i] * gr;
    }
  }
  putStereo(t, l, r, gain = 1) {
    const o = Math.round(t * SR);
    for (let i = 0; i < l.length; i++) {
      const j = o + i;
      if (j < 0 || j >= this.L.length) continue;
      this.L[j] += l[i] * gain; this.R[j] += r[i] * gain;
    }
  }
}

// Réverbération à réseau de lignes à retard (8 lignes, matrice de Hadamard, amortissement des aigus).
function fdnReverb(L, R, { size = 1, decay = 0.6, damp = 5000, pre = 0.012, wet = 0.25 } = {}) {
  const base = [1031, 1327, 1523, 1789, 2053, 2311, 2543, 2861].map((d) => Math.round(d * size));
  const lines = base.map((d) => ({ d, b: new Float32Array(d), i: 0 }));
  const g = base.map((d) => 10 ** ((-3 * d) / SR / decay)); // gain par passage pour un T60 = decay
  const lp = base.map(() => onePole(damp));
  const preN = Math.round(pre * SR);
  const outL = new Float32Array(L.length), outR = new Float32Array(R.length);
  const pl = new Float32Array(preN + 1), pr = new Float32Array(preN + 1);
  let pi = 0;
  const v = new Float32Array(8), h = new Float32Array(8);
  for (let n = 0; n < L.length; n++) {
    const inL = pl[pi], inR = pr[pi];
    pl[pi] = L[n]; pr[pi] = R[n]; pi = (pi + 1) % (preN + 1);
    for (let k = 0; k < 8; k++) { const ln = lines[k]; v[k] = ln.b[ln.i]; }
    // Hadamard 8×8 rapide
    for (let k = 0; k < 8; k++) h[k] = v[k];
    for (let s = 1; s < 8; s <<= 1) for (let k = 0; k < 8; k += s << 1) for (let j = k; j < k + s; j++) { const a = h[j], b = h[j + s]; h[j] = a + b; h[j + s] = a - b; }
    for (let k = 0; k < 8; k++) {
      const ln = lines[k];
      const inj = k % 2 ? inR : inL;
      ln.b[ln.i] = lp[k](h[k] * 0.35355 * g[k]) + inj * 0.5;
      ln.i = (ln.i + 1) % ln.d;
    }
    outL[n] = (v[0] - v[2] + v[4] - v[6]) * wet * 0.5;
    outR[n] = (v[1] - v[3] + v[5] - v[7]) * wet * 0.5;
  }
  return [outL, outR];
}

// ---------- bruitages ----------

// Crayon, stylo bille, crayon sur scotch, surligneur : grain piloté par la vitesse de la mine.
// `speed(t)` en mm/s, `down(t)` contact ; `t0`, `dur` fenêtre ; `vref` vitesse de référence.
function scribe({ t0, dur, speed, down, vref = 250, tool = 'pencil', seed }) {
  const out = buf(dur + 0.05), r = rng(seed);
  const cfg = {
    pencil: { f1: 3200, q1: 0.9, f2: 4300, q2: 1.4, mix2: 0.3, grainBW: 260, grainDepth: 0.55, body: 0.25, bodyF: 700, level: 0.24 },
    bic: { f1: 2100, q1: 0.7, f2: 4200, q2: 1.0, mix2: 0.3, grainBW: 120, grainDepth: 0.25, body: 0.08, level: 0.17 },
    tape: { f1: 4400, q1: 1.8, f2: 5200, q2: 2.4, mix2: 0.6, grainBW: 90, grainDepth: 0.35, body: 0.05, level: 0.18 },
    marker: { f1: 1800, q1: 0.8, f2: 3900, q2: 3, mix2: 0.5, grainBW: 40, grainDepth: 0.2, body: 0.04, level: 0.2 },
  }[tool];
  const b1 = new Biquad('bp', cfg.f1, cfg.q1), b2 = new Biquad('bp', cfg.f2, cfg.q2), hp = new Biquad('hp', 450);
  const bodyF = new Biquad('bp', cfg.bodyF || 380, 0.8), lpOut = new Biquad('lp', 8000), hpSq = new Biquad('hp', 300);
  const grain = onePole(cfg.grainBW), envS = onePole(60);
  let prevDown = false, tick = 0;
  let sq = 0, sqPh = 0, burst = 0;
  for (let i = 0; i < out.length; i++) {
    const t = t0 + i / SR;
    const d = down(t);
    const v = d ? clamp(speed(t) / vref, 0, 1.6) : 0;
    const e = envS(v ** 0.75);
    if (d && !prevDown) tick = 1;
    prevDown = d;
    const n = r() * 2 - 1;
    const gmod = 1 - cfg.grainDepth + cfg.grainDepth * Math.abs(grain(r() * 2 - 1) * 6);
    let y = hp.run(b1.run(n) + cfg.mix2 * b2.run(n)) * gmod * e;
    y += bodyF.run(n) * cfg.body * e;
    if (tick > 0.001) { y += (r() * 2 - 1) * tick * 0.6; tick *= 0.85; }
    if (tool === 'marker' || tool === 'tape') {
      // couinement : frottement collé-glissé de la pointe
      // par salves de 20 à 60 ms, pas en continu
      if (burst <= 0 && r() < 0.0004) burst = ms(20 + 40 * r());
      if (burst > 0) burst--;
      sqPh += (TAU * (tool === 'marker' ? 1900 : 2600) * (1 + 0.03 * Math.sin(TAU * 7 * t))) / SR;
      sq = burst > 0 ? Math.max(0, Math.sin(sqPh)) ** 3 : 0;
      y += hpSq.run(sq) * e * (tool === 'marker' ? 0.04 : 0.03);
    }
    out[i] = lpOut.run(y) * cfg.level;
  }
  return out;
}

// Son d'une écriture (src/write.js) : la vitesse est lue dans l'animation, à 1 ms près.
function writingSound(w, tool, { vref, from = -Infinity, to = Infinity } = {}) {
  const t0 = Math.max(w.t0 - 0.03, from), t1 = Math.min(w.t1 + 0.05, to);
  const step = 0.001;
  const n = Math.ceil((t1 - t0) / step) + 2;
  const sp = new Float32Array(n), dn = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = w.pen(t0 + i * step);
    sp[i] = p && p.down ? p.speed : 0;
    dn[i] = p && p.down ? 1 : 0;
  }
  const idx = (t) => clamp(Math.floor((t - t0) / step), 0, n - 1);
  return { t0, data: scribe({ t0, dur: t1 - t0, speed: (t) => sp[idx(t)], down: (t) => dn[idx(t)] === 1, vref, tool, seed: Math.round(t0 * 1000) }) };
}

// Gomme : quatre allers-retours, de plus en plus appuyés, jusqu'à la déchirure.
function eraserRubs(t0 = 3.0, t1 = 4.0) {
  const out = buf(t1 - t0 + 0.08), r = rng(41);
  const b1 = new Biquad('bp', 950, 0.7), b2 = new Biquad('bp', 2300, 1.1), hp = new Biquad('hp', 250), lpE = new Biquad('lp', 5200);
  const sm = onePole(40);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = t0 + i / SR;
    const v = Math.abs(Math.cos(((t - 3.0) / 0.25) * TAU)) * (t < t1 ? 1 : Math.max(0, 1 - (t - t1) * 40));
    const press = lerp(0.6, 1.25, clamp((t - t0) / (t1 - t0), 0, 1));
    const e = sm(v ** 0.8 * press);
    const n = r() * 2 - 1;
    let y = hp.run(b1.run(n) + 0.45 * b2.run(n)) * e;
    // collé-glissé du caoutchouc : un petit grincement qui monte avec la pression
    ph += (TAU * (780 + 260 * press + 60 * Math.sin(TAU * 13 * t))) / SR;
    y += Math.sin(ph) ** 3 * 0.04 * e * press * (0.6 + 0.4 * r());
    // le papier s'use : quelques craquements, de plus en plus serrés
    if (r() < 0.00015 * press * press * e * 8) y += (r() * 2 - 1) * 0.15;
    out[i] = lpE.run(y);
  }
  return rmsNorm(out, 0.16);
}

// Papier qui se déchire : une salve de micro-craquements, puis le claquement final.
function tear(dur = 0.2, { bright = 1, snapAt = 0.78 } = {}) {
  const out = buf(dur), r = rng(51);
  const bp = new Biquad('bp', 2800 * bright, 0.6), hp = new Biquad('hp', 700);
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    const rate = 0.35 * (1 - u) ** 1.5 + 0.02;
    let y = 0;
    if (r() < rate) y = (r() * 2 - 1) * (1 - u * 0.7);
    out[i] = hp.run(bp.run(y + (r() * 2 - 1) * 0.15 * (1 - u)));
  }
  // claquement final
  const k0 = Math.floor(out.length * snapAt);
  for (let i = 0; i < ms(6) && k0 + i < out.length; i++) out[k0 + i] += (r() * 2 - 1) * (1 - i / ms(6));
  return peakNorm(out, 0.9);
}

function thump(f0 = 120, f1 = 60, dur = 0.12, click = 0.4, seed) {
  const out = buf(dur), r = rng(seed);
  const hp = new Biquad('hp', 900);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * lerp(f0, f1, Math.min(1, t / (dur * 0.5)))) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / (dur * 0.3)) + hp.run(r() * 2 - 1) * click * Math.exp(-t / 0.004);
  }
  return peakNorm(out, 0.9);
}

// Fiche cartonnée qui se pose sur la toile cirée : claquement sec, petit corps grave.
function cardSlap(seed) {
  const out = buf(0.16), r = rng(seed);
  const bp = new Biquad('bp', 1800, 0.6), bp2 = new Biquad('bp', 4200, 1.2);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const n = r() * 2 - 1;
    out[i] = (bp.run(n) + 0.4 * bp2.run(n)) * Math.exp(-t / 0.012) * 1.6 + Math.sin(TAU * 150 * t) * Math.exp(-t / 0.035) * 0.6;
  }
  return peakNorm(out, 0.85);
}

// Souffle de papier (une feuille, une fiche qui fend l'air) : bruit filtré qui glisse.
function swish(dur = 0.4, f0 = 700, f1 = 2200, seed) {
  const out = buf(dur), r = rng(seed);
  const bp = new Biquad('bp', f0, 0.9);
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    if (i % 64 === 0) bp.set('bp', lerp(f0, f1, u), 0.9);
    out[i] = bp.run(r() * 2 - 1) * Math.sin(Math.PI * u) ** 1.5 * (0.8 + 0.2 * Math.sin(TAU * 38 * u * dur));
  }
  return rmsNorm(out, 0.12);
}

function pageFlip(seed) {
  const out = buf(0.42), r = rng(seed);
  const air = swish(0.32, 500, 1700, seed);
  for (let i = 0; i < air.length; i++) out[i] += air[i] * (0.7 + 0.3 * Math.sin(TAU * 42 * (i / SR)));
  const flap = cardSlap(seed + 1);
  for (let i = 0; i < flap.length && ms(290) + i < out.length; i++) out[ms(290) + i] += flap[i] * 0.35;
  // froissement du papier qui plie
  const bp = new Biquad('bp', 3200, 0.8);
  for (let i = 0; i < ms(300); i++) if (r() < 0.02) out[i] += bp.run(r() * 2 - 1) * 0.6;
  return peakNorm(out, 0.8);
}

// Glissé d'une surface sur une autre (téléphone, feuille, fiche) : frottement doux et régulier.
function slide(dur, f = 1200, q = 0.7, seed) {
  const out = buf(dur), r = rng(seed);
  const bp = new Biquad('bp', f, q), am = onePole(30);
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    out[i] = bp.run(r() * 2 - 1) * Math.min(1, u * 8) * (1 - u) ** 0.7 * (0.7 + 0.6 * Math.abs(am(r() * 2 - 1)) * 4);
  }
  return rmsNorm(out, 0.1);
}

function click({ f = 3200, decay = 18, body = 0, noise = 1, len = 0.06, tone = 0.7, seed } = {}) {
  const out = buf(len), r = rng(seed), hp = new Biquad('hp', 1500);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = noise * hp.run(r() * 2 - 1) * Math.exp(-t / 0.0022);
    v += Math.sin(TAU * f * t) * Math.exp(-t / (decay / 1000)) * tone;
    if (body) v += Math.sin(TAU * body * t) * Math.exp(-t / 0.025) * 0.5;
    out[i] = v;
  }
  return peakNorm(out, 0.9);
}

// Coche au crayon : un trait court puis un trait long.
function penTick(seed) {
  const out = buf(0.12), r = rng(seed);
  const bp = new Biquad('bp', 3400, 0.9);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const e = t < 0.03 ? Math.sin((Math.PI * t) / 0.03) * 0.7 : t > 0.04 ? Math.sin((Math.PI * (t - 0.04)) / 0.08) : 0;
    out[i] = bp.run(r() * 2 - 1) * Math.max(0, e);
  }
  return peakNorm(out, 0.6);
}

// Tampon encreur : choc mat du bois sur la table, caoutchouc qui s'écrase.
function stamp(seed) {
  const a = thump(230, 160, 0.07, 0.6, seed);
  const r = rng(seed + 7), bp = new Biquad('bp', 1100, 0.8), wood = new Biquad('bp', 2500, 3);
  for (let i = 0; i < a.length; i++) {
    const n = r() * 2 - 1;
    a[i] += bp.run(n) * Math.exp(-i / ms(18)) * 0.9 + wood.run(n) * Math.exp(-i / ms(4)) * 1.2; // le manche en bois
  }
  return peakNorm(a, 0.95);
}

// Bande de papier adhésif plaquée sur l'écran : petit « tchk » feutré.
function stripPress(seed) {
  const out = buf(0.08), r = rng(seed), bp = new Biquad('bp', 1700, 0.8);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = bp.run(r() * 2 - 1) * Math.exp(-t / 0.008) + Math.sin(TAU * 210 * t) * Math.exp(-t / 0.018) * 0.35;
  }
  return peakNorm(out, 0.6);
}

// Toc-toc à une porte en bois, hors champ.
function knock(seed) {
  const out = buf(0.2), r = rng(seed), bp = new Biquad('bp', 520, 3);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = bp.run(r() * 2 - 1) * Math.exp(-t / 0.02) * 3 + Math.sin(TAU * 135 * t) * Math.exp(-t / 0.05) * 0.8 + Math.sin(TAU * 265 * t) * Math.exp(-t / 0.03) * 0.4;
  }
  return filt(peakNorm(out, 0.9), new Biquad('lp', 2400));
}

// Grincement : frottement collé-glissé d'une charnière (ou d'un pied de chaise).
function creak(dur = 0.55, f0 = 420, f1 = 640, seed, { rough = 1 } = {}) {
  const out = buf(dur), r = rng(seed), bp = new Biquad('bp', 900, 5);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    const f = lerp(f0, f1, u) * (1 + (r() - 0.5) * 0.04 * rough);
    ph += (TAU * f) / SR;
    const stick = Math.max(0, Math.sin(TAU * 31 * (i / SR))) ** 3;
    out[i] = bp.run(Math.sin(ph) * stick + (r() - 0.5) * 0.3 * rough) * Math.sin(Math.PI * u);
  }
  return peakNorm(out, 0.5);
}

// Scotch : déroulé (crépitement collant), déchiré, posé, lissé.
function tapeUnroll(dur = 0.42, seed) {
  const out = buf(dur), r = rng(seed);
  const bp = new Biquad('bp', 3600, 0.7), hp = new Biquad('hp', 1200), tone = new Biquad('bp', 1450, 8);
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    const speed = Math.sin(Math.PI * Math.min(1, u * 1.2)) ** 0.6;
    let y = 0;
    if (r() < 0.12 * speed) y = (r() * 2 - 1) * (0.4 + r());
    out[i] = hp.run(bp.run(y)) + tone.run(y) * 0.6 * speed;
  }
  return peakNorm(out, 0.7);
}
function rub(dur, f = 1100, seed) {
  const out = buf(dur), r = rng(seed), bp = new Biquad('bp', f, 0.5);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = bp.run(r() * 2 - 1) * Math.abs(Math.sin((TAU * t) / (dur / 1.0))) * Math.sin((Math.PI * t) / dur);
  }
  return rmsNorm(out, 0.06);
}

// Verre frappé au crayon : partiels inharmoniques, longue résonance.
function glass(f, dur = 1.2) {
  const out = buf(dur), r = rng(Math.round(f)), tap = new Biquad('bp', 3000, 1.2);
  const parts = [[1, 1, 0.7], [2.32, 0.45, 0.35], [4.25, 0.2, 0.2], [6.63, 0.08, 0.12]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [h, g, d] of parts) v += Math.sin(TAU * f * h * t) * g * Math.exp(-t / d);
    out[i] = v * Math.min(1, i / ms(1.2)) + (i < ms(3) ? tap.run(r() * 2 - 1) * 1.5 : 0);
  }
  return peakNorm(out, 0.55);
}

// Cloche à main de récréation, en ré.
function bell(f = NOTE('D5'), dur = 5) {
  const out = buf(dur), r = rng(91);
  const parts = [[0.5, 0.3, 1.8], [1, 1, 1.5], [1.19, 0.35, 1.0], [1.5, 0.3, 0.9], [2.0, 0.4, 0.7], [2.74, 0.18, 0.45], [3.76, 0.1, 0.3]];
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [h, g, d] of parts) v += Math.sin(TAU * f * h * t * (1 + 0.0007 * Math.sin(TAU * 4.5 * t))) * g * Math.exp(-t / d);
    out[i] = (v + (r() * 2 - 1) * Math.exp(-t / 0.003) * 0.5) * Math.min(1, (dur - t) / 0.3);
  }
  return peakNorm(out, 0.8);
}

// Horloge murale : tic et tac de bois.
function clockTick(tock, seed) {
  const out = buf(0.06), r = rng(seed), bp = new Biquad('bp', tock ? 2100 : 2700, 2);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = bp.run(r() * 2 - 1) * Math.exp(-t / 0.003) + Math.sin(TAU * (tock ? 1150 : 1420) * t) * Math.exp(-t / 0.012) * 0.4;
  }
  return peakNorm(out, 0.5);
}

// ---------- ambiance ----------

// Pièce le soir à Yaoundé : souffle de la pièce, grillons au loin.
function ambience(len, { crickets = (t) => 1 } = {}) {
  const bus = new Bus(len / SR);
  // souffle : bruit rose approché, un générateur par canal (stéréo décorrélée), coupé sous 60 Hz
  for (const [ch, seed] of [[bus.L, 7], [bus.R, 8]]) {
    const r = rng(seed), lp = new Biquad('lp', 900), hp = new Biquad('hp', 60);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = r() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527;
      ch[i] += hp.run(lp.run((b0 + b1 + b2 + w * 0.1848) * 0.0048)) * 0.5;
    }
  }
  // grillons : trains d'impulsions vers 4,5 kHz, trois insectes à des distances différentes
  const insects = [
    { f: 4600, rate: 2.1, pulses: 4, gain: 0.012, pan: -0.6 },
    { f: 4250, rate: 1.55, pulses: 3, gain: 0.0085, pan: 0.5 },
    { f: 5100, rate: 2.7, pulses: 5, gain: 0.0055, pan: 0.1 },
  ];
  insects.forEach((ins, k) => {
    const rr = rng(100 + k);
    let t = rr() * 0.5;
    while (t < len / SR) {
      const g = ins.gain * crickets(t) * (0.7 + 0.3 * rr());
      if (g > 0.0015) {
        const chirp = buf(ins.pulses * 0.03 + 0.02);
        for (let p = 0; p < ins.pulses; p++) {
          for (let i = 0; i < ms(16); i++) {
            const tt = i / SR;
            chirp[ms(p * 30) + i] += Math.sin(TAU * ins.f * tt) * Math.sin((Math.PI * i) / ms(16));
          }
        }
        bus.put(t, chirp, g, ins.pan);
      }
      t += 1 / ins.rate * (0.92 + 0.16 * rr());
    }
  });
  return bus;
}

// ---------- musique : bikutsi en 12/8 ----------

// Balafon : trois modes d'une lame de bois accordée, frappe de la mailloche, bourdonnement de la calebasse.
const balafonCache = new Map();
function balafon(f, seed = 0) {
  const key = `${f.toFixed(2)}:${seed % 8}`;
  if (balafonCache.has(key)) return balafonCache.get(key);
  const t1 = clamp(0.55 * Math.sqrt(300 / f), 0.18, 0.9);
  const out = buf(t1 * 4.2), r = rng(1000 + Math.round(f) + seed);
  const det = 1 + (r() - 0.5) * 0.004;
  const parts = [[1 * det, 1, t1], [3.93, 0.32, t1 * 0.24], [9.2, 0.1, t1 * 0.1], [2.01, 0.06, t1 * 0.5]];
  const buzzBP = new Biquad('bp', clamp(f * 3, 500, 2600), 1.2);
  const mallet = new Biquad('bp', clamp(f * 2.2, 400, 5000), 1.2);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let v = 0;
    for (const [h, g, d] of parts) v += Math.sin(TAU * f * h * t + h) * g * Math.exp(-t / d);
    // mailloche : petit choc feutré
    v += mallet.run(r() * 2 - 1) * Math.exp(-t / 0.004) * 0.9;
    // calebasse : la membrane (mirliton) bourdonne avec le fondamental
    ph += (TAU * f) / SR;
    const env = Math.exp(-t / (t1 * 0.8));
    const buzz = (Math.abs(Math.sin(ph)) - 0.637) * (0.7 + 0.6 * r());
    v += buzzBP.run(buzz) * env * 0.55;
    out[i] = v * Math.min(1, i / ms(0.8));
  }
  peakNorm(out, 0.8);
  balafonCache.set(key, out);
  return out;
}

// Main à plat sur la table (pulsation).
function handSlap(seed) {
  const out = buf(0.22), r = rng(seed), hp = new Biquad('hp', 1200), body = new Biquad('bp', 190, 2);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (TAU * lerp(135, 78, Math.min(1, t / 0.05))) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t / 0.05) * 0.8 + hp.run(r() * 2 - 1) * Math.exp(-t / 0.005) * 0.6 + body.run(r() * 2 - 1) * Math.exp(-t / 0.03) * 1.1;
  }
  return peakNorm(out, 0.95);
}

// Règle plate claquée sur la table (contretemps 2 et 4).
function rulerSlap(seed) {
  const out = buf(0.25), r = rng(seed);
  const hp = new Biquad('hp', 900), bp = new Biquad('bp', 2600, 0.7), wood = new Biquad('bp', 420, 4);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const n = r() * 2 - 1;
    out[i] = hp.run(bp.run(n)) * Math.exp(-t / 0.028) * 1.4 + wood.run(n) * Math.exp(-t / 0.04) * 1.2 + Math.sin(TAU * 210 * t) * Math.exp(-t / 0.09) * 0.12;
  }
  return peakNorm(out, 0.9);
}

// Trousse en pagne secouée : modèle de grains (crayons qui s'entrechoquent), gauche et droite décorrélées.
function shaker(energy, seed) {
  const n = ms(85), L = new Float32Array(n), R = new Float32Array(n), r = rng(seed);
  const res = [[new Biquad('bp', 3300, 3), new Biquad('bp', 5600, 4)], [new Biquad('bp', 3150, 3), new Biquad('bp', 5900, 4)]];
  const hp = [new Biquad('hp', 1800), new Biquad('hp', 1800)];
  let e = energy;
  for (let i = 0; i < n; i++) {
    e *= 0.99935;
    for (let c = 0; c < 2; c++) {
      const imp = r() < e * 0.09 ? (r() * 2 - 1) : 0;
      const v = hp[c].run(res[c][0].run(imp) + 0.7 * res[c][1].run(imp)) * Math.min(1, i / ms(4));
      (c ? R : L)[i] = v;
    }
  }
  return [L, R];
}

// Basse : corde grave, avec les harmoniques que les petits haut-parleurs savent rendre.
function bass(f, dur = 0.45) {
  const out = buf(dur + 0.15), lp = new Biquad('lp', 1400);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.006) * (t < dur ? 0.55 + 0.45 * Math.exp(-t / 0.09) : 0.55 * Math.exp(-(t - dur) / 0.04));
    const v = Math.sin(TAU * f * t) + 0.55 * Math.sin(TAU * 2 * f * t) + 0.3 * Math.sin(TAU * 3 * f * t) + 0.12 * Math.sin(TAU * 4 * f * t);
    out[i] = lp.run(Math.tanh(v * 0.9) * env);
  }
  return out;
}

// Nappe de verres chantés : sinus purs légèrement battants, attaque lente.
function pad(freqs, dur, { attack = 0.6, release = 0.4, bright = 0.2 } = {}) {
  const out = buf(dur + release);
  const ph = freqs.map(() => [0, 0]);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / release));
    let v = 0;
    freqs.forEach((f, k) => {
      ph[k][0] += (TAU * f) / SR; ph[k][1] += (TAU * f * 1.0023) / SR;
      v += Math.sin(ph[k][0]) + 0.7 * Math.sin(ph[k][1]) + bright * Math.sin(2 * ph[k][0]);
    });
    out[i] = (v / freqs.length) * env * (0.9 + 0.1 * Math.sin(TAU * 0.35 * t));
  }
  return out;
}

const CH = {
  D: { root: 'D', bass: ['D2', 'A2', 'D3'], ost: ['D5', 'A4', 'F#5', 'A4', 'D5', 'A4', 'E5', 'A4', 'F#5', 'A4', 'D5', 'A4'], pad: ['D3', 'A3', 'E4', 'F#4'] },
  G: { root: 'G', bass: ['G2', 'D3', 'G2'], ost: ['D5', 'G4', 'B4', 'G4', 'D5', 'G4', 'E5', 'G4', 'B4', 'G4', 'D5', 'G4'], pad: ['G2', 'D3', 'A3', 'B3'] },
  A: { root: 'A', bass: ['A2', 'E3', 'A2'], ost: ['E5', 'A4', 'C#5', 'A4', 'E5', 'A4', 'F#5', 'A4', 'C#5', 'A4', 'E5', 'A4'], pad: ['A2', 'E3', 'B3', 'C#4'] },
  Bm: { root: 'B', bass: ['B2', 'F#3', 'B2'], ost: ['D5', 'B4', 'F#5', 'B4', 'D5', 'B4', 'E5', 'B4', 'F#5', 'B4', 'D5', 'B4'], pad: ['B2', 'F#3', 'C#4', 'D4'] },
};
const OST_VEL = [1, 0.45, 0.75, 0.5, 0.9, 0.45, 0.75, 0.5, 0.85, 0.45, 0.75, 0.55];
const SHK_VEL = [1, 0.35, 0.6, 0.85, 0.35, 0.6, 0.9, 0.35, 0.6, 0.85, 0.35, 0.65];
// Mélodie de balafon (pas de croche de 12/8 dans la mesure ; deux mesures par phrase)
const PHRASE_A = [[0, 0, 'A5'], [0, 2, 'F#5'], [0, 3, 'A5'], [0, 5, 'B5'], [0, 6, 'A5'], [0, 9, 'F#5'], [0, 11, 'E5'], [1, 0, 'D5'], [1, 3, 'E5'], [1, 4, 'F#5'], [1, 6, 'E5'], [1, 8, 'D5'], [1, 9, 'B4', 'roll']];
const PHRASE_B = [[0, 0, 'A5'], [0, 2, 'F#5'], [0, 3, 'A5'], [0, 5, 'D6'], [0, 6, 'B5'], [0, 8, 'A5'], [0, 9, 'F#5'], [0, 11, 'A5'], [1, 0, 'F#5'], [1, 2, 'E5'], [1, 3, 'D5'], [1, 6, 'E5'], [1, 9, 'D5', 'roll']];

const DECLIC = 30 + (2 * BEAT) / 3; // deux croches après 0:30,0, une fois le trait de surligneur fini

// La partition, mesure par mesure (mesure = 2 s = 4 temps = 12 croches).
// Chaque mesure : accord et couches jouées (0 → 1 : niveau).
function arrangement() {
  const bars = [];
  const prog4 = ['D', 'G', 'D', 'A'];
  for (let b = 0; b < 30; b++) {
    const t = b * 2;
    const L = { ost: 0, shk: 0, kick: 0, snare: 0, bass: 0, lead: 0, hi: 0, pad: 0, muffle: 0 };
    let chord = prog4[b % 4];
    if (b < 3) { /* silence : la pièce, l'horloge */ }
    else if (b === 3) { L.pad = 0.7; chord = 'D'; }
    else if (b < 6) { L.ost = 0.5; L.shk = 0.4; L.pad = 0.45; }
    else if (b < 8) { L.ost = 0.65; L.shk = 0.55; L.kick = 0.55; L.bass = 0.7; L.pad = 0.3; }
    else if (b < 12) { L.ost = 0.8; L.shk = 0.75; L.kick = 0.8; L.snare = 0.7; L.bass = 0.9; L.lead = 0.85; }
    else if (b < 15) { L.ost = 0.4; L.pad = 0.75; L.muffle = 1; chord = ['Bm', 'G', 'A'][b - 12]; }
    else if (b < 20) { L.ost = 0.85; L.shk = 0.8; L.kick = 0.9; L.snare = 0.8; L.bass = 1; L.lead = 1; L.hi = b >= 15 && b < 17 ? 0.6 : 0.35; L.pad = b === 15 ? 0.5 : 0; chord = prog4[(b - 15) % 4]; }
    else if (b === 20) { L.ost = 0.6; L.shk = 0.7; L.kick = 0.8; L.snare = 0.6; L.bass = 0.9; chord = 'D'; }
    else if (b === 21) { L.ost = 0.8; L.shk = 0.75; L.kick = 0.85; L.snare = 0.7; L.bass = 0.95; L.lead = 0.9; chord = 'A'; }
    else if (b < 24) { L.ost = 0.5; L.shk = 0.55; L.kick = 0.6; L.bass = 0.75; L.pad = 0.25; L.lead = b === 22 ? 0.8 : 0; chord = ['D', 'G'][b - 22]; }
    else if (b === 24) { L.ost = 0.5; L.shk = 0.5; L.kick = 0.55; L.bass = 0.7; chord = 'A'; }
    else if (b < 29) { L.ost = 0.9; L.shk = 0.85; L.kick = 0.95; L.snare = 0.85; L.bass = 1; L.lead = b < 27 ? 1 : 0; L.hi = 0.5; L.pad = 0.3; chord = ['G', 'A', 'D', 'A'][b - 25]; }
    bars.push({ b, t, chord, L });
  }
  return bars;
}

// Mesures où une phrase de mélodie commence (deux mesures chacune). Rien au remplacement (0:40),
// rien après 0:54 : le logo sonore de 0:54,5 sonne seul.
const PHRASE_BARS = [8, 10, 15, 17, 21, 25];
function music(sec) {
  const bus = new Bus(sec);
  const leadBus = new Bus(sec);
  const step = BEAT / 3; // croche de 12/8
  const bars = arrangement();
  const jr = rng(4242);
  // jeu humain : ±5 ms, et la 3e croche de chaque temps légèrement poussée
  const feel = (s) => (jr() - 0.5) * 0.01 - (s % 3 === 2 ? 0.009 : 0);
  let phraseN = 0;
  for (const bar of bars) {
    const { t, chord, L, b } = bar;
    const C = CH[chord];
    // la fin de la mesure 24 (0:49,5 → 0:50) est un demi-temps de silence
    const cutAt = b === 24 ? 1.5 : 2;
    for (let s = 0; s < 12; s++) {
      if (b === 15 && s < 2) continue; // le déclic : la musique revient après le trait de surligneur (0:30,33)
      const ts = t + s * step + (s ? feel(s) : 0);
      if (ts - t >= cutAt) break;
      if (L.ost > 0) {
        const f = NOTE(C.ost[s]);
        const note = balafon(f, s);
        const data = L.muffle ? filt(Float32Array.from(note), new Biquad('lp', 1100)) : note;
        bus.put(ts, data, L.ost * OST_VEL[s] * 0.26, -0.35);
        // main gauche du balafoniste : la fondamentale grave sur les temps
        if (s % 3 === 0) bus.put(ts, balafon(NOTE(C.bass[2].replace(/\d/, (d) => String(Number(d) + 1))), 9), L.ost * 0.16, -0.15);
      }
      if (L.shk > 0) {
        const [sl, sr] = shaker(0.6 + 0.4 * SHK_VEL[s], b * 12 + s);
        bus.putStereo(ts, sl, sr, L.shk * SHK_VEL[s] * 0.24);
      }
      if (L.kick > 0 && s % 3 === 0) bus.put(ts, handSlap(b * 4 + s), L.kick * (s === 0 ? 0.62 : 0.5), 0);
      if (L.snare > 0 && (s === 3 || s === 9)) bus.put(ts, rulerSlap(b * 2 + s), L.snare * 0.42, 0.1);
      if (L.bass > 0) {
        const pat = [[0, 0, 0.45], [3, 0, 0.3], [6, 1, 0.35], [8, 0, 0.18], [9, 2, 0.4]];
        for (const [ps, ni, dur] of pat) if (ps === s) bus.put(ts, bass(NOTE(C.bass[ni]), dur), L.bass * 0.22, 0);
      }
    }
    if (L.pad > 0) bus.put(t, pad(C.pad.map(NOTE), b === 3 ? 2.0 : 1.95, { attack: b === 3 ? 0.7 : 0.4 }), L.pad * 0.2, 0);
    // mélodie : phrases de deux mesures, A puis B
    if (PHRASE_BARS.includes(b)) {
      const ph = phraseN++ % 2 ? PHRASE_B : PHRASE_A;
      for (const [db0, s, n, roll] of ph) {
        const Lb = bars[b + db0].L; // chaque note prend le niveau de la mesure où elle tombe
        if (!Lb.lead) continue;
        const ts = t + db0 * 2 + s * step + feel(s);
        const f = NOTE(n);
        leadBus.put(ts, balafon(f, s + 3), Lb.lead * 0.36, 0.3);
        if (Lb.hi > 0) leadBus.put(ts, balafon(f * 2, s + 5), Lb.lead * Lb.hi * 0.16, 0.45);
        if (roll) for (let k = 1; k < 9; k++) leadBus.put(ts + k * step / 2, balafon(f, k + 8), Lb.lead * 0.2 * (1 - k / 11), 0.3);
      }
    }
  }
  // 0:06,0 : la main du parent ; une note grave de balafon, puis trois notes qui montent (0:07,0)
  bus.put(6.0, balafon(NOTE('D4'), 1), 0.42, 0);
  bus.put(6.0, balafon(NOTE('D3'), 2), 0.25, 0);
  [['A4', 7.0], ['B4', 7.0 + step], ['D5', 7.0 + 2 * step]].forEach(([n, t]) => bus.put(t, balafon(NOTE(n), 4), 0.32, 0.2));
  // la sonnerie du téléphone est le motif de balafon, filtrée comme un petit haut-parleur (0:12,0 et 0:12,5)
  for (const t of [RING, RING + 0.5]) {
    for (const [n, dt] of [['D5', 0], ['A4', step], ['D5', 2 * step]]) {
      const note = filt(Float32Array.from(balafon(NOTE(n), 7)), new Biquad('hp', 700), new Biquad('lp', 3800));
      bus.put(t + dt, note, 0.24, 0.25); // un peu sous les autres attaques : l'AAC à 128 kb/s la faisait dépasser −1 dBTP
    }
  }
  // 0:10,75 : réception, une seule note
  bus.put(REPLY, filt(Float32Array.from(balafon(NOTE('A5'), 8)), new Biquad('hp', 600)), 0.22, 0.25);
  bus.put(PROPOSAL, filt(Float32Array.from(balafon(NOTE('D6'), 8)), new Biquad('hp', 600)), 0.2, 0.25); // la proposition arrive
  // 0:24 → 0:29,5 : suspension ; la nappe monte puis tout se tait net à 0:29,5
  bus.put(28.0, pad(['A3', 'E4', 'B4', 'C#5'].map(NOTE), 1.5, { attack: 1.2, release: 0.01, bright: 0.35 }), 0.16, 0);
  // 0:30,0 : le déclic — accord plein
  // 0:30,33 : le déclic — le trait de surligneur se fait dans le silence, puis l'accord plein
  bus.put(DECLIC, pad(['D3', 'A3', 'F#4', 'A4', 'D5'].map(NOTE), 1.5, { attack: 0.05, release: 0.8, bright: 0.4 }), 0.24, 0);
  for (const n of ['D4', 'F#4', 'A4', 'D5']) bus.put(DECLIC, balafon(NOTE(n), 3), 0.24, 0);
  // logo sonore : cinq notes qui montent, en triolets (0:54,5)
  [['D5', 0], ['F#5', 1], ['A5', 2], ['B5', 3], ['D6', 4]].forEach(([n, k]) => {
    leadBus.put(54.5 + k * step, balafon(NOTE(n), k), k === 4 ? 0.5 : 0.42, 0.1);
    if (k === 4) for (let j = 1; j < 10; j++) leadBus.put(54.5 + 4 * step + j * step / 2, balafon(NOTE('D6'), j), 0.26 * (1 - j / 11), 0.1);
  });
  // final : accord de balafon et basse, tout s'arrête (0:58,0)
  for (const n of ['D3', 'D4', 'F#4', 'A4', 'D5']) bus.put(58.0, balafon(NOTE(n), 2), 0.3, 0);
  bus.put(58.0, bass(NOTE('D2'), 0.9), 0.35, 0);
  bus.put(58.0, handSlap(999), 0.4, 0);
  // mélodie mêlée au reste
  for (let i = 0; i < bus.L.length; i++) { bus.L[i] += leadBus.L[i]; bus.R[i] += leadBus.R[i]; }
  return bus;
}

// ---------- bruitages du master ----------

function foley(lang = 'fr') {
  const bus = new Bus(MASTER + TAIL);
  const off = new Bus(MASTER + TAIL); // hors champ : passe par une réverbération plus grande
  const c = content(lang);
  const pencil = (w, vref = 260) => { const s = writingSound(w, 'pencil', { vref }); bus.put(s.t0, s.data, 1, 0.1); };
  // Séquence 1 : le crayon, deux tapotements, la gomme, la déchirure
  pencil(c.attempt);
  for (const t of [2.0, 2.5]) bus.put(t - 0.004, click({ f: 2600, decay: 10, body: 240, noise: 0.8, seed: Math.round(t * 10) }), 0.38, 0.1);
  bus.put(2.72, slide(0.3, 1500, 0.6, 3), 0.35, -0.3); // la manche de la main gauche
  bus.put(0.3, slide(0.35, 1100, 0.6, 2), 0.3, 0.2); // la manche de l'élève sur la page
  bus.put(3.0, eraserRubs(3.0, 4.0), 0.35, -0.1);
  bus.put(4.0, tear(0.22, { snapAt: 0.02 }), 0.3, 0);
  bus.put(4.0, thump(200, 110, 0.07, 0.1, 64), 0.25, 0);
  bus.put(4.62, thump(240, 140, 0.06, 0.6, 61), 0.25, 0.2); // la gomme tombe
  bus.put(4.71, thump(260, 160, 0.04, 0.4, 62), 0.1, 0.2);
  // Séquence 2 : la main du parent, le téléphone
  bus.put(5.3, slide(0.7, 900, 0.5, 4), 0.32, 0.3); // la manche qui glisse
  bus.put(6.0, thump(160, 90, 0.1, 0.05, 63), 0.22, 0.2);
  bus.put(7.4, slide(0.55, 700, 0.6, 5), 0.42, 0.3);
  bus.put(7.35, click({ f: 1800, decay: 6, noise: 0.3, seed: 6 }), 0.12, 0.2); // l'écran s'allume (src/world.js, phonePose.on)
  // Séquence 3 : clavier, envoi, réception
  // frappe : un clic de touche tous les trois caractères affichés (le message défile en accéléré)
  keyTimes(lang).filter((_, i) => i % 3 === 1).forEach(({ t }, k) => {
    const r = rng(200 + k);
    bus.put(t, click({ f: 1500 + 700 * r(), decay: 1.2, body: 0, noise: 1, tone: 0.15, len: 0.03, seed: 200 + k }), 0.22 * db((r() - 0.5) * 6), 0.1);
  });
  const sendBlip = () => { const o = buf(0.07); let ph = 0; for (let i = 0; i < o.length; i++) { const t = i / SR; ph += (TAU * lerp(700, 1500, Math.min(1, t / 0.035))) / SR; o[i] = Math.sin(ph) * Math.exp(-t / 0.018); } return o; };
  bus.put(SEND, sendBlip(), 0.22, 0.15);
  bus.put(SENT, sendBlip(), 0.18, 0.15); // la fiche part
  // Séquence 4 : décroché, quatre coches
  bus.put(ANSWER - 0.02, click({ f: 1600, decay: 8, body: 300, seed: 7 }), 0.2, 0.1);
  FIELDS.forEach((t, i) => bus.put(t, penTick(300 + i), 0.5, 0.1));
  // Séquence 5 : les fiches s'envolent et claquent, la bande surlignée, les tampons, les coches
  [0, 1, 2].forEach((i) => bus.put(16.0 + i * 0.12, swish(0.45, 600, 2000, 310 + i), 0.3, (i - 1) * 0.5));
  CARD_LAND.forEach((t, i) => bus.put(t, cardSlap(320 + i), 0.45, (i - 1) * 0.35));
  STAMPS.forEach((t, i) => bus.put(t, stamp(330 + i), 0.4, (i - 1) * 0.3));
  // Séquence 6 : toc-toc, porte, chaise ; le scotch ; le stylo ; le crayon ; le surligneur ; le check
  off.put(24.0, knock(401), 0.75, -0.55);
  off.put(24.25, knock(402), 0.65, -0.55);
  off.put(24.75, creak(0.5, 380, 560, 403), 0.18, -0.6);
  off.put(25.25, creak(0.32, 180, 150, 404, { rough: 3 }), 0.22, -0.4);
  off.put(24.8, tapeUnroll(0.36, 405), 0.45, -0.5); // hors champ : le morceau arrive déjà coupé
  off.put(25.18, tear(0.07, { bright: 1.5 }), 0.4, -0.5);
  bus.put(26.5, thump(300, 180, 0.05, 0.2, 406), 0.18, -0.1);
  bus.put(26.8, rub(0.62, 1300, 407), 0.9, -0.1);
  { const s = writingSound(c.hint, 'bic', { vref: 220 }); bus.put(s.t0, s.data, 2.5, -0.15); }
  { const s = writingSound(c.fix, 'tape', { vref: 260, to: 29.3 }); bus.put(s.t0, s.data, 1, 0.1); }
  { const s = writingSound(c.fix, 'pencil', { vref: 260, from: 29.3 }); bus.put(s.t0, s.data, 1.1, 0.1); }
  bus.put(30.0, scribe({ t0: 30.0, dur: 0.34, speed: () => 200, down: (t) => t < 30.32, tool: 'marker', vref: 200, seed: 409 }), 1.1, -0.1);
  bus.put(BUMP - 0.005, thump(190, 130, 0.09, 0.5, 410), 0.55, 0);
  // Séquence 7 : le mois — pages, stylos, bilan
  FLIPS.forEach((t, i) => bus.put(t, pageFlip(500 + i), 0.45, 0.15));
  monthWritings(lang).forEach((w, i) => { const s = writingSound(w, 'bic', { vref: 900 }); bus.put(s.t0, s.data, 0.7, -0.2 + i * 0.1); });
  bus.put(REPORT_IN[0], slide(REPORT_IN[1] - REPORT_IN[0] + 0.05, 2200, 0.7, 520), 0.6, 0.4);
  bus.put(REPORT_IN[1], cardSlap(521), 0.28, 0.1);
  for (let k = 0; k < 8; k++) bus.put(REPORT_TICKS[0] + k * ((REPORT_TICKS[1] - REPORT_TICKS[0]) / 8), penTick(530 + k), 0.32, -0.1);
  bus.put(37.5, scribe({ t0: 37.5, dur: 0.5, speed: () => 200, down: (t) => t < 37.98, tool: 'marker', vref: 200, seed: 540 }), 0.8, 0.1);
  bus.put(38.0, stamp(541), 0.5, 0);
  // Séquence 8 : la fiche d'anglais s'en va, sa remplaçante arrive
  bus.put(CARD_SWAP.out[0], slide(CARD_SWAP.out[1] - CARD_SWAP.out[0], 1500, 0.6, 600), 0.6, -0.5);
  bus.put(CARD_SWAP.in[0], swish(0.55, 700, 1800, 601), 0.3, -0.4);
  bus.put(CARD_SWAP.in[1], cardSlap(602), 0.45, -0.2);
  bus.put(CARD_SWAP.stamp, stamp(603), 0.5, -0.2);
  // Séquence 9 : le paiement
  bus.put(44.0, slide(0.6, 700, 0.6, 700), 0.4, 0.3);
  bus.put(PAY_TAP - 0.005, click({ f: 2400, decay: 5, body: 180, noise: 0.4, seed: 701 }), 0.25, 0.1);
  bus.put(PAY_OK, glass(NOTE('A5')), 0.18, 0.15);
  bus.put(PAY_OK + 0.5, glass(NOTE('D6')), 0.18, 0.15);
  bus.put(48.0, slide(0.6, 650, 0.6, 702), 0.35, 0.3);
  // le bilan quitte le cahier, puis on feuillette en arrière jusqu'à l'exercice 3
  bus.put(REPORT_OUT[0], slide(REPORT_OUT[1] - REPORT_OUT[0] + 0.05, 2200, 0.7, 522), 0.5, 0.4);
  BACK_FLIPS.forEach((t, i) => {
    bus.put(t, swish(0.2, 900, 2600, 510 + i), 0.42, 0.15);
    bus.put(t + 0.15, cardSlap(515 + i), 0.12, 0.15);
  });
  // Séquence 10 : la lampe s'éteint, la métamorphose, le surligneur, les numéros, la cloche
  bus.put(49.0, click({ f: 2200, decay: 6, body: 160, seed: 800 }), 0.4, -0.4);
  bus.put(49.03, click({ f: 1900, decay: 5, body: 120, seed: 801 }), 0.22, -0.4);
  bus.put(49.48, scribe({ t0: 49.48, dur: 0.6, speed: (t) => 120 + 900 * (t - 49.48), down: (t) => t < 50.05, tool: 'pencil', vref: 400, seed: 802 }), 0.9, 0);
  for (const t of [55.5, 56.0]) bus.put(t, click({ f: 1700, decay: 8, body: 220, noise: 0.5, seed: Math.round(t * 10) }), 0.45, 0);
  bus.put(58.0, bell(), 0.3, 0.1);
  // horloge du soir : jusqu'à ce que la musique s'installe
  for (let k = 0; k <= 8; k++) bus.put(k, clockTick(k % 2 === 1, 1100 + k), 0.12 * (k < 6 ? 1 : 1 - (k - 5) / 4), -0.45);
  return { bus, off };
}

// Sons des textes à l'écran (bandes collées, étiquette d'étape, coches, surligneur), posés en temps de la
// version : chaque version place ses cartons à sa façon (src/cuts.js).
function cardSounds(cut, lang) {
  const bus = new Bus(cut.duration + 1);
  for (const card of cardsFor(cut)) {
    if (!Number.isFinite(card.in) || card.in >= cut.duration) continue;
    if (card.slot === 'top') {
      const lines = card.type === 'checks' ? 1 : (card[lang] || card.fr).length;
      for (let i = 0; i < lines; i++) bus.put(card.in + i * 0.09, stripPress(900 + Math.round(card.in * 10) + i), 0.5, 0);
      if (card.step) bus.put(card.in - 0.04, click({ f: 1300, decay: 6, body: 200, noise: 0.4, seed: 950 + Math.round(card.in) }), 0.18, 0);
      if (card.type === 'checks') card.items.forEach((t, k) => bus.put(t, penTick(960 + k), 0.42, 0.1));
    }
    const hl = card.hl;
    if (hl !== undefined && Number.isFinite(hl) && hl < cut.duration) {
      bus.put(hl, scribe({ t0: hl, dur: 0.34, speed: () => 200, down: (t) => t < hl + 0.32, tool: 'marker', vref: 200, seed: 990 + Math.round(hl) }), card.slot === 'top' ? 0.6 : 0.8, 0);
    }
  }
  return bus;
}

// Instants où la musique s'efface un peu devant un bruitage important (−4 dB).
const DUCKS = [4.0, ...CARD_LAND, ...STAMPS, 25.18, BUMP, 38.0, CARD_SWAP.in[1], CARD_SWAP.stamp, PAY_OK, PAY_OK + 0.5, 55.5, 56.0];

// ---------- mix ----------

function wav(file, L, R) {
  const n = L.length;
  const b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28); b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(clamp(L[i], -1, 1) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(clamp(R[i], -1, 1) * 32767), 46 + i * 4);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
}
// Pistes séparées en WAV 32 bits flottants stéréo (au gain du mix, avant le limiteur).
function wavFloat(file, L, R) {
  const n = L.length;
  const b = Buffer.alloc(58 + n * 8);
  b.write('RIFF', 0); b.writeUInt32LE(50 + n * 8, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(18, 16); b.writeUInt16LE(3, 20); b.writeUInt16LE(2, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 8, 28); b.writeUInt16LE(8, 32); b.writeUInt16LE(32, 34); b.writeUInt16LE(0, 36);
  b.write('fact', 38); b.writeUInt32LE(4, 42); b.writeUInt32LE(n, 46);
  b.write('data', 50); b.writeUInt32LE(n * 8, 54);
  for (let i = 0; i < n; i++) { b.writeFloatLE(L[i], 58 + i * 8); b.writeFloatLE(R[i], 62 + i * 8); }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, b);
}

// Loudness intégrée et crête réelle (ffmpeg ebur128).
function measure(file) {
  const { stderr } = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  const summary = stderr.slice(stderr.lastIndexOf('Summary'));
  const I = /I:\s+(-?[\d.]+) LUFS/.exec(summary);
  const P = /Peak:\s+(-?[\d.]+) dBFS/.exec(summary);
  return { I: I ? Number(I[1]) : NaN, TP: P ? Number(P[1]) : NaN };
}

// Crête entre les échantillons : interpolation ×4 par sinus cardinal fenêtré (16 points par phase).
const TP_TAPS = [1, 2, 3].map((p) => {
  const h = [];
  for (let k = -8; k < 8; k++) {
    const x = k + 1 - p / 4;
    const sinc = Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const w = 0.5 + 0.5 * Math.cos((Math.PI * x) / 8.5);
    h.push(sinc * w);
  }
  return h;
});
function truePeak(x) {
  const n = x.length, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let m = Math.abs(x[i]);
    if (i >= 8 && i < n - 8) {
      for (const h of TP_TAPS) {
        let v = 0;
        for (let k = 0; k < 16; k++) v += x[i - 7 + k] * h[k];
        if (Math.abs(v) > m) m = Math.abs(v);
      }
    }
    out[i] = m;
  }
  return out;
}

// Limiteur stéréo lié, à anticipation de 5 ms, qui surveille la crête réelle (entre les échantillons).
function limit(L, R, ceil) {
  const n = L.length, look = ms(5), att = Math.exp(-1 / ms(1.2)), rel = Math.exp(-1 / ms(90));
  const need = new Float32Array(n);
  const pL = truePeak(L), pR = truePeak(R);
  for (let i = 0; i < n; i++) { const a = Math.max(pL[i], pR[i]); need[i] = a > ceil ? ceil / a : 1; }
  const win = new Float32Array(n), dq = [];
  for (let i = n - 1; i >= 0; i--) {
    while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop();
    dq.push(i);
    while (dq[0] > i + look) dq.shift();
    win[i] = need[dq[0]];
  }
  let g = 1;
  const oL = new Float32Array(n), oR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    g = win[i] < g ? win[i] + (g - win[i]) * att : 1 - (1 - g) * rel;
    const k = Math.min(g, need[i]);
    oL[i] = L[i] * k; oR[i] = R[i] * k;
  }
  return [oL, oR];
}

// Stems du master (bruitages, musique, ambiance), en temps du master.
function masterStems(lang) {
  const len = Math.round((MASTER + TAIL) * SR);
  const { bus: fx, off } = foley(lang);
  // réverbérations : petite pièce pour les bruitages, plus grande et plus sombre pour le hors-champ
  const [rfL, rfR] = fdnReverb(fx.L, fx.R, { size: 0.7, decay: 0.45, damp: 6000, wet: 0.18 });
  const [roL, roR] = fdnReverb(off.L, off.R, { size: 1.4, decay: 0.9, damp: 2500, wet: 0.9 });
  const lpOff = [new Biquad('lp', 2200), new Biquad('lp', 2200)];
  for (let i = 0; i < len; i++) {
    fx.L[i] += rfL[i] + lpOff[0].run(off.L[i]) * 0.5 + roL[i];
    fx.R[i] += rfR[i] + lpOff[1].run(off.R[i]) * 0.5 + roR[i];
  }
  const mu = music(MASTER + TAIL);
  const [rmL, rmR] = fdnReverb(mu.L, mu.R, { size: 1.1, decay: 1.1, damp: 7000, wet: 0.22 });
  const duck = (t) => {
    let g = 1;
    for (const d of DUCKS) {
      const x = t - d;
      if (x < -0.02 || x > 0.45) continue;
      const e = x < 0 ? (x + 0.02) / 0.02 : x < 0.12 ? 1 : 1 - (x - 0.12) / 0.33;
      g = Math.min(g, 1 - (1 - db(-4)) * e);
    }
    return g;
  };
  // coupe-bas vers 60 Hz pour la musique (rien d'utile en dessous sur un téléphone)
  const hpm = [new Biquad('hp', 85), new Biquad('hp', 85)];
  // silences : rampes en cosinus (4 ms à la fermeture, 2 ms à la réouverture), pas de coupure à l'échantillon
  const ramp = (t, a, b) => {
    if (t < a - 0.004 || t >= b + 0.002) return 1;
    if (t < a) return 0.5 + 0.5 * Math.cos((Math.PI * (t - (a - 0.004))) / 0.004);
    if (t < b) return 0;
    return 0.5 - 0.5 * Math.cos((Math.PI * (t - b)) / 0.002);
  };
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    // silence total à 0:29,5 (jusqu'au déclic) et demi-temps de silence à 0:49,5 : la réverbération est coupée aussi
    const gate = ramp(t, 29.5, DECLIC) * ramp(t, 49.5, 50.0);
    const d = duck(t);
    mu.L[i] = hpm[0].run(mu.L[i] + rmL[i]) * d * gate;
    mu.R[i] = hpm[1].run(mu.R[i] + rmR[i]) * d * gate;
  }
  // grillons : le soir seulement (pas pendant le mois en plein jour, ni sur le carton final)
  const crickets = (t) => (t < 32.3 ? 1 : t < 36.4 ? 0.15 : t < 49.5 ? 1 : 0.4);
  const amb = ambience(len, { crickets });
  // la pièce passe au premier plan quand rien d'autre ne joue : l'ouverture, la fin et la tenue de la 64 s
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const g = db(8 * (t < 6 ? 1 : t < 7 ? 7 - t : t > 59 ? 1 : t > 58 ? t - 58 : 0));
    amb.L[i] *= g; amb.R[i] *= g;
  }
  // coupe-bas à 90 Hz sur les bruitages : le sous-grave n'est pas rendu par un téléphone mais déclenche le limiteur
  const hpf = [new Biquad('hp', 90), new Biquad('hp', 90)];
  for (let i = 0; i < len; i++) { fx.L[i] = hpf[0].run(fx.L[i]); fx.R[i] = hpf[1].run(fx.R[i]); }
  return { fx, mu, amb, len };
}

const FX_GAIN = db(0), MU_GAIN = db(-9), AMB_GAIN = db(0);

// Une version : chaque segment reprend les stems du master, en temps réel (pendant la tenue de la 64 s,
// l'image ralentit mais le son continue : la cloche s'éteint, la pièce reste). À chaque coupe, fondu enchaîné
// à puissance constante : 24 ms pour la musique et l'ambiance, 3 ms pour les bruitages.
function assemble(cut, stems) {
  const len = Math.round(cut.duration * SR);
  const out = { fx: new Bus(cut.duration), mu: new Bus(cut.duration), amb: new Bus(cut.duration) };
  const segs = segments(cut);
  const XF = { fx: ms(3), mu: ms(24), amb: ms(24) };
  // deux segments qui se suivent sans saut dans le master (tenue de la 64 s) : pas de fondu entre eux
  const joined = (n) => n > 0 && n < segs.length && Math.abs((segs[n].from - segs[n].at) - (segs[n - 1].from - segs[n - 1].at)) < 1e-9;
  segs.forEach((s, n) => {
    const a = Math.round(s.at * SR), e = Math.round(s.end * SR), f0 = Math.round(s.from * SR);
    const fadeIn = n > 0 && !joined(n), fadeOut = n < segs.length - 1 && !joined(n + 1);
    for (const key of ['fx', 'mu', 'amb']) {
      const h = Math.floor(XF[key] / 2);
      const i0 = fadeIn ? a - h : a, i1 = e;
      const src = stems[key];
      for (let i = Math.max(0, i0); i < i1 && i < len; i++) {
        const j = f0 + (i - a);
        if (j < 0 || j >= src.L.length) continue;
        let k = 1;
        if (fadeIn && i < a + h) k = Math.sin((Math.PI / 2) * ((i - (a - h)) / (2 * h)));
        if (fadeOut && i >= e - 2 * h) k = Math.min(k, Math.cos((Math.PI / 2) * ((i - (e - 2 * h)) / (2 * h))));
        out[key].L[i] += src.L[j] * k;
        out[key].R[i] += src.R[j] * k;
      }
    }
  });
  return out;
}

function build(cut, stems) {
  const v = assemble(cut, stems);
  const len = v.fx.L.length;
  const cs = cardSounds(cut, lang);
  for (let i = 0; i < len; i++) { v.fx.L[i] += cs.L[i]; v.fx.R[i] += cs.R[i]; }
  const L = new Float32Array(len), R = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const fade = Math.min(1, (len - i) / ms(400));
    for (const [bus, g] of [[v.fx, FX_GAIN], [v.mu, MU_GAIN], [v.amb, AMB_GAIN]]) { bus.L[i] *= g * fade; bus.R[i] *= g * fade; }
    L[i] = v.fx.L[i] + v.mu.L[i] + v.amb.L[i];
    R[i] = v.fx.R[i] + v.mu.R[i] + v.amb.R[i];
  }
  // −14 LUFS intégrés, crête réelle ≤ −1 dBTP : quelques passes (le limiteur retire un peu de loudness)
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(OUT, '_mesure.wav');
  wav(tmp, L, R);
  const before = measure(tmp);
  let gain = db(-14 - before.I);
  let fin;
  for (let pass = 0; pass < 6; pass++) {
    fin = limit(L.map((x) => x * gain), R.map((x) => x * gain), db(-2.5));
    wav(tmp, ...fin);
    const m = measure(tmp);
    if (Math.abs(m.I + 14) < 0.05 && m.TP <= -2.0) break;
    gain *= db(-14 - m.I);
  }
  fs.unlinkSync(tmp);
  const sfx = (cut.id === 'master' ? '' : `-${cut.id}`) + (lang === 'en' ? '-en' : '');
  const file = path.join(OUT, `bande-son${sfx}.wav`);
  wav(file, ...fin);
  for (const [name, bus] of [['bruitages', v.fx], ['musique', v.mu], ['ambiance', v.amb]]) {
    wavFloat(path.join(OUT, `pistes${sfx}`, `${name}.wav`), bus.L.map((x) => x * gain), bus.R.map((x) => x * gain));
  }
  const after = measure(file);
  console.log(`${cut.name} : ${before.I} LUFS → ${after.I} LUFS intégrés, crête réelle ${after.TP} dBTP`);
  console.log(`→ ${path.relative(ROOT, file)} + pistes séparées dans pistes${sfx}/ (bruitages, musique, ambiance)`);
}

const only = process.argv[2];
const lang = process.argv.includes('--en') ? 'en' : 'fr';
const started = Date.now();
const stems = masterStems(lang);
console.log(`Stems du master : ${((Date.now() - started) / 1000).toFixed(1)} s`);
for (const cut of only && !only.startsWith('--') ? [cutOf(only)] : Object.values(CUTS)) build(cut, stems);
