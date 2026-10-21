// La table et sa chorégraphie : où sont les objets, les mains et la caméra à l'instant t (secondes du master).
// Repère de la table : millimètres, y vers le bas. L'élève est assise en bas, le parent en face (en haut),
// le répétiteur à gauche de l'élève.
import { prog, ease, easeIn, easeOut, easeInOut, easeOutBack, lerp, clamp, keys, zoomPath, angleLerp, noise1, bounce, rot } from './util.js';
import { NB, nbPoint, content, L } from './notebook.js';
import { WRITE_TIP, PINCH, handAt, handPoint } from './hands.js';
import { W, H } from './timeline.js';

// ---------- décor fixe ----------
export const LAMP = { x: -430, y: -360, r: 25 };
export const GLASS = { x: -205, y: -15 };
export const TROUSSE = { x: -150, y: 372, r: -7 };
export const BOOK = { x: 300, y: -50, r: 9 };
export const PHONE_REST = { x: 20, y: -150, r: 166 };
export const PHONE_REST2 = { x: 205, y: -215, r: 170 };
export const PHONE_HELD = { x: 165, y: -255, r: 176 };
// Fiches sur la table, en escalier pour rester lisibles dans le cadre vertical.
export const CARD_SPOTS = [
  { x: -52, y: -178, r: -6 },
  { x: 52, y: -98, r: 5 },
  { x: -46, y: -14, r: -3 },
];
export const CARD_LAND = [16.5, 17.0, 17.5];
export const STAMPS = [20.5, 21.0, 21.5];
export const REPORT_SPOT = { x: -104, y: 176, r: -5 };
// Instants partagés avec la bande-son (scripts/build-audio.mjs).
export const FLIPS = [32.2, 33.2, 34.2]; // pages tournées (0,3 s chacune, posées sur le temps suivant)
export const CARD_SWAP = { dim: 40.0, out: [40.3, 40.95], in: [41.95, 42.5], stamp: 43.0 };
export const REPORT_IN = [35.95, 36.5];

// Point de la page droite (repère des pages) → table.
export const P = (x, y) => nbPoint([x, y]);

// ---------- caméra ----------
// Vue : centre (mm), zoom (pixels par mm du cadre 9:16), rotation (degrés : celle du monde à redresser).
const view = (c, z, r) => ({ c, z, r });
const phoneScreenTop = (pose, z, topPx = 430) => {
  // centre de caméra tel que le haut du téléphone tombe à `topPx` dans le cadre
  const off = (H / 2 - topPx) / z - 81;
  const [dx, dy] = rot([0, off], pose.r);
  return view([pose.x + dx, pose.y + dy], z, pose.r);
};
const pageView = (px, py, z, screenY = 960) => {
  const a = P(px, py);
  const [dx, dy] = rot([0, -(screenY - H / 2) / z], NB.r);
  return view([a[0] + dx, a[1] + dy], z, NB.r);
};

export const V = {
  hook: pageView(84, 112, 8.2, 980),
  hookClose: pageView(84, 114, 9.0, 990),
  table: view([60, 130], 2.7, NB.r),
  phone: phoneScreenTop(PHONE_HELD, 9.4),
  cards: view([0, -238 + (H / 2 - 620) / 4.2], 4.2, -1.5),
  trial: pageView(88, 112, 8.6, 1060),
  month: view(nbPoint([0, 110]), 3.05, NB.r),
  report: view([REPORT_SPOT.x + 30, REPORT_SPOT.y - 10], 5.2, NB.r),
  replace: view([0, -238 + (H / 2 - 620) / 4.2], 4.2, -1.5),
  end: view(nbPoint([0, 110]), 2.5, NB.r),
};
V.phone2 = phoneScreenTop(PHONE_HELD, 9.4);

// Images-clés de caméra : [début, fin, vue de départ, vue d'arrivée, courbe].
const MOVES = [
  [0, 4.7, V.hook, V.hookClose, easeInOut],
  [5.0, 6.05, V.hookClose, V.table, easeInOut],
  [7.05, 8.35, V.table, V.phone, easeInOut],
  [16.0, 16.95, V.phone, V.cards, easeInOut],
  [23.5, 24.6, V.cards, V.trial, easeInOut],
  [31.6, 32.5, V.trial, V.month, easeInOut],
  [35.7, 36.55, V.month, V.report, easeInOut],
  [39.55, 40.2, V.report, V.replace, easeInOut],
  [43.75, 45.1, V.replace, V.phone2, easeInOut],
  [47.85, 48.9, V.phone2, V.end, easeInOut],
];

function between(a, b, k) {
  // centre et zoom par le chemin de van Wijk (largeur visible = W / z), rotation par le plus court
  const path = zoomPath([a.c[0], a.c[1], W / a.z], [b.c[0], b.c[1], W / b.z], 1.25);
  const [x, y, w] = path(k);
  return { c: [x, y], z: W / w, r: angleLerp(a.r, b.r, k) };
}

export function camera(t) {
  let cam = MOVES[0][2];
  for (const [t0, t1, a, b, fn] of MOVES) {
    if (t < t0) break;
    cam = t >= t1 ? b : between(a, b, fn(prog(t, t0, t1)));
  }
  // flottement de caméra tenue, très léger (plus marqué de près)
  const amp = 0.0022 * W / cam.z;
  return {
    c: [cam.c[0] + noise1(t * 0.55, 1) * amp, cam.c[1] + noise1(t * 0.5, 2) * amp],
    z: cam.z * (1 + noise1(t * 0.3, 3) * 0.004),
    r: cam.r + noise1(t * 0.4, 4) * 0.25,
  };
}

// ---------- états du cahier ----------
export function notebookState(t) {
  return {
    erase: keys(t, [[3.0, 0], [3.25, 0.3], [3.5, 0.55], [3.75, 0.8], [4.0, 1]], (k) => k),
    hole: t < 4.0 ? 0 : easeOut(prog(t, 4.0, 4.09)),
    tape: prog(t, 26.5, 26.75),
    tapeLift: 1 - prog(t, 26.6, 26.8),
    hl: easeInOut(prog(t, 30.0, 30.32)),
    flips: FLIPS.map((t0) => prog(t, t0, t0 + 0.3)),
    month: t,
  };
}

// ---------- mains ----------
// Chaque main : null (hors champ) ou { kind, pose, x, y, r, s, left, tool, h }.

const CHILD_R = -28, CHILD_S = 0.66;
export const ADULT_S = 0.82;
const kidWriteTip = (p) => handAt(p, WRITE_TIP, { r: CHILD_R, s: CHILD_S });
const pageW = (pt) => P(pt[0], pt[1]);

function penPos(writing, t, rest) {
  const pen = writing.pen(t);
  return pen;
}

// Main droite de l'élève (crayon).
export function childHand(t, lang) {
  const c = content(lang);
  if (t < 0.25 || t > 33) return null;
  let tip, h = 24, pose = 'write', extra = {};
  const endWrong = c.attempt.strokes.at(-1).pts.at(-1);
  if (t < 2.0) {
    const pen = c.attempt.pen(t);
    tip = pageW(pen.pos);
    h = pen.down ? 22 : 28;
    // entrée par le bas à droite
    const k = easeOut(prog(t, 0.25, 0.62));
    const tp = [tip[0] + (1 - k) * 160, tip[1] + (1 - k) * 260];
    tip = tp;
  } else if (t < 2.75) {
    // deux tapotements, sur les temps (0:02,0 et 0:02,5)
    const tap = Math.max(0, 1 - Math.min(Math.abs(t - 2.0), Math.abs(t - 2.5)) * 6);
    const lift = 1 - tap;
    tip = pageW([endWrong[0] + 2, endWrong[1] + 1.5 - lift * 2]);
    h = 22 + lift * 9;
  } else if (t < 6.0) {
    // la main se retire un peu pour laisser la gomme, puis se fige ; après le trou, elle retombe
    const back = easeInOut(prog(t, 2.75, 3.0));
    const slump = easeInOut(prog(t, 4.1, 4.8));
    tip = pageW([endWrong[0] + 8 + back * 16 + slump * 6, endWrong[1] + 6 + back * 10 + slump * 8]);
    h = 30 - slump * 6;
  } else if (t < 28.4) {
    // posée, crayon en main (pendant la main du parent, puis pendant la séance d'essai)
    tip = pageW([endWrong[0] + 30, endWrong[1] + 24]);
    h = 22;
    if (t > 24 && t < 28.4) {
      const k = easeInOut(prog(t, 27.9, 28.4));
      const start = c.fix.strokes[0].pts[0];
      tip = pageW([lerp(endWrong[0] + 30, start[0], k), lerp(endWrong[1] + 24, start[1], k)]);
      h = 22 + 6 * k;
    }
  } else if (t < 30.0) {
    const pen = c.fix.pen(t);
    tip = pageW(pen.pos);
    h = pen.down ? 21 : 27;
  } else if (t < 30.4) {
    const last = c.fix.strokes.at(-1).pts.at(-1);
    const k = easeOut(prog(t, 29.95, 30.35));
    tip = pageW([last[0] + 6 + k * 18, last[1] + 8 + k * 16]);
    h = 26 + k * 8;
  } else {
    return fistBump(t, 'child');
  }
  return { kind: 'child', pose, ...kidWriteTip(tip), h, tool: 'pencil', ...extra };
}

// Main gauche de l'élève : la gomme (0:02,75 → 0:04,4).
export function childEraser(t, lang) {
  if (t < 2.7 || t > 4.65) return null;
  const c = content(lang);
  const hole = c.hole;
  const enter = easeOut(prog(t, 2.7, 3.0));
  // quatre allers-retours, sur les croches (0:03,0 · 3,25 · 3,5 · 3,75)
  const rub = t < 4.0 ? Math.sin(((t - 3.0) / 0.25) * Math.PI * 2) * 9 * clamp((t - 2.95) * 6) : 0;
  const leave = easeIn(prog(t, 4.2, 4.6));
  const p = pageW([hole.x + rub - (1 - enter) * 120 - leave * 60, hole.y + 1 + (1 - enter) * 160 + leave * 200]);
  const r = -14;
  const s = CHILD_S;
  // la gomme est tenue en pince ; elle tombe de la main à 0:04,4
  return { kind: 'child', pose: 'pinch', left: true, ...handAt(p, PINCH, { r, s, left: true }), h: 18 + (t > 4.0 ? 10 : 0), tool: t < 4.4 ? 'eraser' : '' };
}
// La gomme lâchée, sur la page.
export function droppedEraser(t, lang) {
  if (t < 4.4 || t > 30) return null;
  const c = content(lang);
  const k = easeIn(prog(t, 4.4, 4.62));
  const p = pageW([c.hole.x + 58, c.hole.y + 62]);
  return { x: p[0], y: p[1] - (1 - k) * 4, r: 24, h: lerp(14, 1.2, k) + bounce(t - 4.62, 6, 9) * 2 };
}

// Main du parent : se pose sur celle de l'élève, prend le téléphone ; la reprend pour payer.
export function parentHand(t) {
  if (t > 5.3 && t < 7.6) {
    const ch = childHand(Math.min(t, 6.0), 'fr');
    const back = handPoint([0, -60], ch); // dos de la main de l'élève
    const land = easeOut(prog(t, 5.35, 6.0));
    const leave = easeIn(prog(t, 7.0, 7.55));
    const r = 200;
    const target = handAt([back[0] - 2, back[1] - 4], [0, -70], { r, s: 0.86 });
    const hover = (1 - land) * 1 + leave;
    return { kind: 'parent', pose: 'cover', ...target, x: target.x - hover * 30, y: target.y - hover * 260, s: 0.86 * (1 + 0.06 * (1 - land)), h: 16 + hover * 40 - (t > 6.4 && t < 6.6 ? 2 : 0) };
  }
  return null;
}

// Le téléphone : posé, pris en main, tenu ; reposé à droite pendant la séance d'essai.
export function phonePose(t) {
  const lift1 = easeInOut(prog(t, 7.45, 8.3));
  const down1 = easeInOut(prog(t, 23.6, 24.4));
  const lift2 = easeInOut(prog(t, 44.0, 44.8));
  const down2 = easeInOut(prog(t, 48.0, 48.6));
  const rest = t < 16 ? PHONE_REST : PHONE_REST2;
  let k = 0;
  if (t < 24.4) k = lift1 * (1 - down1);
  else k = lift2 * (1 - down2);
  return {
    x: lerp(rest.x, PHONE_HELD.x, k), y: lerp(rest.y, PHONE_HELD.y, k), r: angleLerp(rest.r, PHONE_HELD.r, k),
    s: 1 + 0.035 * k, h: lerp(3, 34, k), held: k,
    mode: t >= 43 ? 'pay' : 'chat',
    on: t < 7.4 ? 0 : t < 24.3 ? clamp((t - 7.4) / 0.3) : t < 44.2 ? 0 : t < 48.6 ? prog(t, 44.2, 44.5) : 1 - prog(t, 48.6, 49.0),
  };
}

// Les fiches : elles se soulèvent de l'écran (0:16,0), volent et atterrissent une par temps.
export function cardPoses(t) {
  const ph = phonePose(t);
  const out = [];
  CARD_SPOTS.forEach((spot, i) => {
    if (t < 15.98) return;
    const t0 = 16.0 + i * 0.12, t1 = CARD_LAND[i];
    // départ : la vignette sur l'écran du téléphone (dans le repère du téléphone, puis de la table)
    const local = rot([0, -22 + i * 26], ph.r);
    const from = { x: ph.x + local[0], y: ph.y + local[1], r: ph.r, s: 0.3 };
    let p;
    if (t < t1) {
      const k = prog(t, t0, t1);
      const e = easeInOut(k);
      // trajectoire en arc : la fiche monte vers la caméra puis redescend
      const arc = Math.sin(Math.PI * k);
      p = {
        x: lerp(from.x, spot.x, e) + arc * (i - 1) * 40, y: lerp(from.y, spot.y, e) - arc * 30,
        r: angleLerp(from.r, spot.r, easeOut(k)), s: lerp(from.s, 1, easeOut(k)) * (1 + arc * 0.22), h: 6 + arc * 120,
      };
    } else {
      const b = bounce(t - t1, 7, 10);
      p = { ...spot, s: 1 + b * 0.025, h: 1.5 + Math.max(0, b) * 6 };
    }
    // la fiche d'anglais se ternit puis s'en va (0:40,0) ; sa remplaçante arrive (0:42,0 → 0:42,5)
    if (i === 2) {
      const dim = prog(t, CARD_SWAP.dim, CARD_SWAP.dim + 0.35);
      const go = easeIn(prog(t, ...CARD_SWAP.out));
      p = { ...p, x: p.x - go * 330, r: p.r - go * 25, h: p.h + go * 30, dim };
      if (go >= 1) p.gone = true;
    }
    p.stamp = prog(t, STAMPS[i] - 0.02, STAMPS[i] + 0.16);
    p.i = i;
    p.sel = i === 0 ? ease(prog(t, 22.5, 22.8)) * (1 - prog(t, 24.0, 24.3)) : 0;
    out.push(p);
  });
  if (t >= CARD_SWAP.in[0] - 0.05) {
    const k = prog(t, ...CARD_SWAP.in);
    const spot = CARD_SPOTS[2];
    const e = easeOut(k);
    const b = bounce(t - 42.5, 7, 10);
    out.push({
      i: 3, x: lerp(spot.x - 340, spot.x, e), y: lerp(spot.y + 40, spot.y, e), r: lerp(-40, spot.r + 1, e), s: (1 + Math.sin(Math.PI * k) * 0.12) * (1 + (k >= 1 ? b * 0.025 : 0)),
      h: k < 1 ? 4 + Math.sin(Math.PI * k) * 60 : 1.5 + Math.max(0, b) * 6, stamp: prog(t, CARD_SWAP.stamp - 0.02, CARD_SWAP.stamp + 0.16), dim: 0,
    });
  }
  return out;
}

// Main du répétiteur de maths pendant la séance d'essai (0:25,5 → 0:31,7).
export function tutorHand(t, lang) {
  if (t < 25.4 || t > 31.8) return null;
  const c = content(lang);
  const r = 38, s = ADULT_S;
  if (t < 26.8) {
    // apporte le morceau de scotch, le pose sur le trou
    const k = easeOut(prog(t, 25.4, 26.5));
    const hole = pageW([c.hole.x + 1, c.hole.y + 0.6]);
    const p = [hole[0] - (1 - k) * 260, hole[1] + (1 - k) * 160];
    const press = t > 26.5 ? 1 : 0;
    return { kind: 'maths', pose: 'pinch', ...handAt(p, PINCH, { r: 52, s }), h: 30 - press * 12, tool: t < 26.62 ? 'tape' : '' };
  }
  if (t < 27.45) {
    // lisse le scotch du plat des doigts, deux passages
    const hole = pageW([c.hole.x, c.hole.y]);
    const sweep = Math.sin(((t - 26.95) / 0.25) * Math.PI) * 7 * prog(t, 26.8, 27.0);
    const p = [hole[0] + sweep, hole[1] + 4];
    return { kind: 'maths', pose: 'flat', ...handAt(p, [-6, -150], { r: 70, s }), h: 14 };
  }
  if (t < 29.6) {
    const pen = c.hint.pen(Math.min(t, 28.25));
    let tip = pageW(pen.pos);
    const rest = easeInOut(prog(t, 28.3, 28.8));
    tip = [tip[0] - rest * 34, tip[1] + rest * 30];
    return { kind: 'maths', pose: 'write', ...handAt(tip, WRITE_TIP, { r, s }), h: pen.down && t < 28.25 ? 20 : 30, tool: 'bic' };
  }
  if (t < 30.42) {
    // le surligneur passe sur « x = 6 »
    const y = L.ans - 1.8;
    const x0 = 33 + 10, x1 = 33 + 14 + c.ans.width;
    const k = easeInOut(prog(t, 30.0, 30.32));
    const app = easeOut(prog(t, 29.6, 30.0));
    let tip = pageW([lerp(x0, x1, k), y]);
    tip = [tip[0] - (1 - app) * 40, tip[1] + (1 - app) * 40];
    return { kind: 'maths', pose: 'write', ...handAt(tip, WRITE_TIP, { r: 30, s }), h: t > 29.98 && t < 30.34 ? 18 : 28, tool: 'highlighter' };
  }
  return fistBump(t, 'tutor');
}

// Check des poings (contact à 0:31,0).
export const BUMP = 31.0;
function fistBump(t, who) {
  const meet = P(84, 176);
  const app = easeInOut(prog(t, 30.4, BUMP));
  const ret = easeIn(prog(t, BUMP + 0.08, BUMP + 0.75));
  const squash = t >= BUMP ? Math.max(0, bounce(t - BUMP, 5, 12)) : 0;
  const rise = Math.sin(Math.PI * clamp(prog(t, 30.4, BUMP + 0.75)));
  const s = (who === 'child' ? CHILD_S : ADULT_S) * (1 + 0.2 * rise);
  const r = who === 'child' ? -38 : 52;
  const front = [0, -112];
  // en dehors du contact, chaque poing recule le long de son bras
  const away = (1 - app) + ret;
  const dir = rot([0, 1], r);
  const gap = 7 + squash * 3;
  const tgt = [meet[0] - rot([0, -1], r)[0] * gap - dir[0] * 0, meet[1] - rot([0, -1], r)[1] * gap];
  const pose = handAt([tgt[0] + dir[0] * away * 170, tgt[1] + dir[1] * away * 170], front, { r, s });
  if (ret >= 1) return null;
  return { kind: who === 'child' ? 'child' : 'maths', pose: 'fist', ...pose, h: 26 + rise * 50 };
}
export const bumpBurst = (t) => (t >= BUMP && t < BUMP + 0.45 ? { at: P(84, 176), k: prog(t, BUMP, BUMP + 0.45) } : null);

// Un mois en accéléré (0:32 → 0:36) : chaque page tournée, un spécialiste écrit.
export const MONTH_WRITERS = [
  { kind: 'physics', at: [32.55, 33.15], r: 34 },
  { kind: 'english', at: [33.55, 34.15], r: 46 },
  { kind: 'maths', at: [34.55, 35.15], r: 38 },
];
export function monthHand(t, writings) {
  for (let i = 0; i < MONTH_WRITERS.length; i++) {
    const m = MONTH_WRITERS[i];
    if (t < m.at[0] - 0.25 || t > m.at[1] + 0.3) continue;
    const w = writings[i];
    const pen = w.pen(clamp(t, m.at[0], m.at[1]));
    let tip = P(pen.pos[0], pen.pos[1]);
    const inK = easeOut(prog(t, m.at[0] - 0.25, m.at[0]));
    const outK = easeIn(prog(t, m.at[1], m.at[1] + 0.3));
    const off = (1 - inK) + outK;
    const dir = rot([0, 1], m.r);
    tip = [tip[0] + dir[0] * off * 220, tip[1] + dir[1] * off * 220];
    return { kind: m.kind, pose: 'write', ...handAt(tip, WRITE_TIP, { r: m.r, s: ADULT_S }), h: pen.down ? 20 : 28, tool: m.kind === 'maths' ? 'bic' : 'bic' };
  }
  return null;
}

// Le bilan du mois glisse sur la page gauche (0:36,0 → 0:36,5).
export function reportPose(t) {
  if (t < 35.9) return null;
  const k = prog(t, ...REPORT_IN);
  const e = easeOut(k);
  const b = bounce(t - REPORT_IN[1], 6, 10);
  const lights = 1 - prog(t, 49.0, 49.5);
  return {
    x: lerp(REPORT_SPOT.x + 420, REPORT_SPOT.x, e), y: lerp(REPORT_SPOT.y - 60, REPORT_SPOT.y, e), r: lerp(REPORT_SPOT.r + 18, REPORT_SPOT.r, e),
    s: 1 + Math.sin(Math.PI * k) * 0.05 + (k >= 1 ? b * 0.012 : 0), h: k < 1 ? 3 + Math.sin(Math.PI * k) * 26 : 1.2, op: lights,
  };
}

// Lumière : lampe (soir), jour (le mois qui passe), extinction finale.
export function lighting(t) {
  // 0 : soir, lampe allumée ; 1 : plein jour
  const day = t < 32.3 || t > 36.4 ? 0 : keys(t, [[32.3, 0], [32.7, 0.15], [32.95, 1], [33.6, 1], [33.9, 0.1], [34.2, 0.95], [35.2, 1], [35.7, 0.3], [36.4, 0]], easeInOut);
  const night = t < 32.3 || t > 36.4 ? 0 : keys(t, [[32.3, 0], [32.6, 0.7], [32.8, 0], [33.75, 0], [33.95, 0.6], [34.15, 0]], easeInOut);
  const off = easeInOut(prog(t, 49.0, 49.55));
  const sun = prog(t, 32.7, 35.9);
  return { day, night, lamp: 1 - off, off, sun };
}
