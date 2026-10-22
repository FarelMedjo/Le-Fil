// La table et sa chorégraphie : où sont les objets, les mains et la caméra à l'instant t (secondes du master).
// Repère de la table : millimètres, y vers le bas. L'élève est assise en bas, le parent en face (en haut),
// le répétiteur à gauche de l'élève.
//
// Règle de raccord : une main ne change jamais de pose ni d'outil sur place en une image. Elle se déplace
// (et se soulève) pendant le changement, ou sort du cadre et y revient.
import { prog, ease, easeIn, easeOut, easeInOut, lerp, clamp, keys, zoomPath, angleLerp, noise1, bounce, rot } from './util.js';
import { NB, nbPoint, content, L, X0 } from './notebook.js';
import { WRITE_TIP, PINCH, handAt, handPoint } from './hands.js';
import { W, H } from './timeline.js';

// ---------- décor fixe ----------
export const GLASS = { x: -205, y: -15 };
export const TROUSSE = { x: -150, y: 372, r: -7 };
export const BOOK = { x: 300, y: -50, r: 9 };
export const PHONE_REST = { x: 20, y: -150, r: 166 };
export const PHONE_REST2 = { x: 205, y: -215, r: 170 };
export const PHONE_HELD = { x: 165, y: -255, r: 176 };
// Fiches sur la table, en escalier pour rester lisibles dans le cadre vertical.
export const CARD_SPOTS = [
  { x: -52, y: -168, r: -6 },
  { x: 52, y: -98, r: 5 },
  { x: -46, y: -40, r: -3 },
];
// Instants partagés avec la bande-son (scripts/build-audio.mjs).
export const CARD_LAND = [16.5, 17.0, 17.5];
export const STAMPS = [20.5, 21.0, 21.5];
export const REPORT_SPOT = { x: -104, y: 176, r: -5 };
export const FLIPS = [32.2, 33.2, 34.2]; // pages tournées (0,3 s chacune, posées sur le temps suivant)
export const BACK_FLIPS = [48.9, 48.75, 48.6]; // retour à la page de l'exercice 3 (0,16 s chacune)
export const CARD_SWAP = { dim: 40.0, out: [40.3, 40.95], in: [41.95, 42.5], stamp: 43.0 };
export const REPORT_IN = [35.95, 36.5];
export const REPORT_OUT = [48.0, 48.45];
export const BUMP = 31.0;

// Point de la page droite (repère des pages) → table.
export const P = (x, y) => nbPoint([x, y]);
const pageW = (pt) => P(pt[0], pt[1]);

// ---------- caméra ----------
// Vue : centre (mm), zoom (pixels par mm du cadre 9:16), rotation (degrés : celle du monde à redresser).
const view = (c, z, r) => ({ c, z, r });
const phoneScreenTop = (pose, z, topPx = 430) => {
  // centre de caméra tel que le haut du téléphone tombe à `topPx` dans le cadre
  const off = (H / 2 - topPx) / z - 81;
  const [dx, dy] = rot([0, off], pose.r);
  return view([pose.x + dx, pose.y + dy], z, pose.r);
};
const phoneAt = (pose, local, z) => {
  const [dx, dy] = rot(local, pose.r);
  return view([pose.x + dx, pose.y + dy], z, pose.r);
};
const pageView = (px, py, z, screenY = 960) => {
  const a = P(px, py);
  const [dx, dy] = rot([0, -(screenY - H / 2) / z], NB.r);
  return view([a[0] + dx, a[1] + dy], z, NB.r);
};
const cardsY = -238 + (H / 2 - 620) / 4.2;

export const V = {
  hook: pageView(84, 112, 8.2, 980),
  hookClose: pageView(84, 114, 9.0, 990),
  table: view([60, 130], 2.7, NB.r),
  phone: phoneScreenTop(PHONE_HELD, 9.4),
  phoneType: phoneAt(PHONE_HELD, [0, 22], 11.2), // pendant la frappe : le champ de saisie et le clavier
  cards: view([0, cardsY], 4.2, -1.5),
  cardsClose: view([2, cardsY + 4], 4.42, -0.6),
  trial: pageView(90, 116, 7.6, 1040),
  trialWide: pageView(86, 132, 5.4, 1000), // le déclic : on recule pour voir les deux bras
  month: view(nbPoint([0, 110]), 3.05, NB.r),
  report: view([REPORT_SPOT.x + 18, REPORT_SPOT.y - 10], 5.2, NB.r), // le bord gauche du bilan dans la zone sûre
  replace: view([0, cardsY], 4.2, -1.5),
  end: view(nbPoint([0, 110]), 2.5, NB.r),
};
V.phone2 = phoneScreenTop(PHONE_HELD, 9.4);

// Mouvements de caméra : [début, fin, vue de départ, vue d'arrivée, courbe].
const MOVES = [
  [0, 4.7, V.hook, V.hookClose, easeInOut],
  [5.0, 5.65, V.hookClose, V.table, easeInOut], // recul fini avant que la main du parent se pose
  [7.05, 8.35, V.table, V.phone, easeInOut],
  [8.55, 9.15, V.phone, V.phoneType, easeInOut],
  [9.6, 10.15, V.phoneType, V.phone, easeInOut],
  [16.0, 16.95, V.phone, V.cards, easeInOut],
  [17.6, 23.5, V.cards, V.cardsClose, (k) => k], // lente poussée pendant que les fiches restent posées
  [23.5, 24.6, V.cardsClose, V.trial, easeInOut],
  [30.32, 31.0, V.trial, V.trialWide, easeOut],
  [31.6, 32.5, V.trialWide, V.month, easeInOut],
  [35.7, 36.55, V.month, V.report, easeInOut],
  [39.55, 40.2, V.report, V.replace, easeInOut],
  [43.75, 45.1, V.replace, V.phone2, easeInOut],
  [47.85, 48.55, V.phone2, V.end, easeInOut],
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
    crumbs: 1 - prog(t, 26.95, 27.35), // balayées quand le répétiteur lisse le scotch
    tape: prog(t, 26.5, 26.75),
    tapeLift: 1 - prog(t, 26.6, 26.8),
    hl: easeInOut(prog(t, 30.0, 30.32)),
    hlLift: prog(t, 49.55, 49.85), // la tache de surligneur se détache et devient le point du logo
    // pages tournées pendant le mois, puis feuilletées en arrière jusqu'à l'exercice 3
    flips: FLIPS.map((t0, i) => (t < 48 ? prog(t, t0, t0 + 0.3) : 1 - prog(t, BACK_FLIPS[i], BACK_FLIPS[i] + 0.16))),
  };
}

// ---------- mains ----------
// Chaque main : null (hors champ) ou { kind, pose, x, y, r, s, left, tool, h }.

const CHILD_R = -28, CHILD_S = 0.66;
export const ADULT_S = 0.82;
const kidWriteTip = (p, r = CHILD_R) => handAt(p, WRITE_TIP, { r, s: CHILD_S });

// Fondu entre deux poses de main : position, rotation, échelle et hauteur interpolées ; la pose et
// l'outil basculent au milieu, quand la main est en l'air.
function blend(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const lift = Math.sin(Math.PI * k) * 14;
  const pick = k < 0.5 ? a : b;
  return {
    ...pick, x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), r: angleLerp(a.r, b.r, k), s: lerp(a.s, b.s, k),
    h: lerp(a.h, b.h, k) + lift,
  };
}

// Main droite de l'élève (crayon).
export function childHand(t, lang) {
  const c = content(lang);
  if (t < 0.25 || t > 31.8) return null;
  const endWrong = c.attempt.strokes.at(-1).pts.at(-1);
  const restTip = pageW([endWrong[0] + 30, endWrong[1] + 24]);
  const at = (tip, h) => ({ kind: 'child', pose: 'write', tool: 'pencil', ...kidWriteTip(tip), h });
  if (t < 2.0) {
    const pen = c.attempt.pen(t);
    const tip = pageW(pen.pos);
    const k = easeOut(prog(t, 0.25, 0.62)); // entrée par le bas à droite
    return at([tip[0] + (1 - k) * 160, tip[1] + (1 - k) * 260], pen.down ? 22 : 28);
  }
  if (t < 2.75) {
    // deux tapotements, sur les temps (0:02,0 et 0:02,5)
    const tap = Math.max(0, 1 - Math.min(Math.abs(t - 2.0), Math.abs(t - 2.5)) * 6);
    return at(pageW([endWrong[0] + 2, endWrong[1] + 1.5 - (1 - tap) * 2]), 22 + (1 - tap) * 9);
  }
  if (t < 6.0) {
    // la main se retire un peu pour laisser la gomme, se fige ; après le trou, elle retombe
    const back = easeInOut(prog(t, 2.75, 3.0));
    const slump = easeInOut(prog(t, 4.1, 4.8));
    const tip = pageW([endWrong[0] + 2 + back * 22 + slump * 6, endWrong[1] - 0.5 + back * 16.5 + slump * 8]);
    const a = at(tip, 31 - back - slump * 6);
    // puis elle glisse vers sa place de repos (sous la main du parent)
    return blend(a, at(restTip, 22), easeInOut(prog(t, 5.0, 5.6)));
  }
  if (t < 28.3) return at(restTip, 22); // posée, crayon en main, toujours dans le cadre
  if (t < 28.5) {
    const start = pageW(c.fix.strokes[0].pts[0]);
    return blend(at(restTip, 22), at(start, 28), easeInOut(prog(t, 28.3, 28.49)));
  }
  if (t < 29.98) {
    const pen = c.fix.pen(t);
    return at(pageW(pen.pos), pen.down ? 21 : 27);
  }
  const last = c.fix.strokes.at(-1).pts.at(-1);
  const away = at(pageW([last[0] + 22, last[1] + 22]), 32);
  if (t < 30.4) return blend(at(pageW(last), 22), away, easeOut(prog(t, 29.98, 30.35)));
  return fistBump(t, 'child', away);
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
  // la gomme est tenue en pince ; elle tombe de la main à 0:04,4
  return { kind: 'child', pose: 'pinch', left: true, ...handAt(p, PINCH, { r: -14, s: CHILD_S, left: true }), h: 18 + (t > 4.0 ? 10 : 0), tool: t < ERASER_DROP ? 'eraser' : '' };
}
// La gomme lâchée : elle tombe des doigts sur la page, là où la main la lâche (même taille, même sens) ;
// elle est poussée de côté pendant que la caméra est sur les fiches, hors champ.
const ERASER_DROP = 4.4;
const dropMemo = new Map();
export function droppedEraser(t, lang) {
  if (t < ERASER_DROP) return null;
  if (!dropMemo.has(lang)) {
    // repère de la gomme dans la main au moment où elle est lâchée (src/scene.js, toolFor : pince, rotation 8°)
    const pose = childEraser(ERASER_DROP - 1e-4, lang);
    const a8 = (8 * Math.PI) / 180;
    const q = (u, v) => handPoint([PINCH[0] + u * Math.cos(a8) - v * Math.sin(a8), PINCH[1] - 4 + u * Math.sin(a8) + v * Math.cos(a8)], pose);
    const o = q(0, 0), ex = q(1, 0), ey = q(0, 1);
    const ax = [ex[0] - o[0], ex[1] - o[1]], ay = [ey[0] - o[0], ey[1] - o[1]];
    dropMemo.set(lang, { o, r: (Math.atan2(ax[1], ax[0]) * 180) / Math.PI, s: Math.hypot(ax[0], ax[1]), mirror: ax[0] * ay[1] - ax[1] * ay[0] < 0, h: pose.h });
  }
  const d = dropMemo.get(lang);
  const k = easeIn(prog(t, ERASER_DROP, 4.62));
  const push = easeInOut(prog(t, 23.0, 23.4));
  const [dx, dy] = rot([3 * k + push * 40, 6 * k + push * 90], NB.r);
  return { x: d.o[0] + dx, y: d.o[1] + dy, r: d.r + 14 * k + push * 20, s: d.s, mirror: d.mirror, h: lerp(d.h, 1.2, k) + bounce(t - 4.62, 6, 9) * 2 };
}

// ---------- le parent ----------

// Le téléphone : posé, pris en main, tenu ; reposé à droite dès que les fiches sont sur la table.
export function phonePose(t) {
  const lift1 = easeInOut(prog(t, 7.45, 8.3));
  const down1 = easeInOut(prog(t, 17.7, 18.5));
  const lift2 = easeInOut(prog(t, 44.0, 44.8));
  const down2 = easeInOut(prog(t, 48.0, 48.6));
  const rest = t < 16 ? PHONE_REST : PHONE_REST2;
  const k = t < 24 ? lift1 * (1 - down1) : lift2 * (1 - down2);
  return {
    x: lerp(rest.x, PHONE_HELD.x, k), y: lerp(rest.y, PHONE_HELD.y, k), r: angleLerp(rest.r, PHONE_HELD.r, k),
    s: 1 + 0.035 * k, h: lerp(3, 34, k), held: k,
    mode: t >= 43 ? 'pay' : 'chat',
    // l'écran s'allume quand la main du parent le prend
    on: t < 7.35 ? 0 : t < 24.3 ? clamp((t - 7.35) / 0.3) : t < 44.0 ? 0 : t < 48.6 ? prog(t, 44.0, 44.3) : 1 - prog(t, 48.6, 49.0),
  };
}

// La main qui tient le téléphone, par en dessous : poignet et manche dépassent du bas du téléphone,
// le reste est caché (les bouts des doigts sur les bords sont dessinés à part, src/scene.js).
// Repère du téléphone ; main gauche vue paume vers le haut = main droite vue de dos, retournée.
const CRADLE = { local: [0, 128], s: 0.86 };
function cradleOn(ph, h) {
  const [dx, dy] = rot(CRADLE.local, ph.r);
  return { kind: 'parent', pose: 'cover', left: true, x: ph.x + dx, y: ph.y + dy, r: ph.r, s: CRADLE.s * ph.s, h };
}

// Main du parent : se pose sur celle de l'élève (0:06,0), va prendre le téléphone (0:07,0 → 0:07,45),
// le tient ; le repose (0:18,5) ; revient le prendre pour payer (0:43,6 → 0:48,6).
export function parentHand(t) {
  if (t > 5.3 && t < 7.0) {
    // entre par le haut du cadre (sur le son de la manche, 0:05,3) et se pose à 0:06,0
    const ch = childHand(6.0, 'fr');
    const back = handPoint([0, -60], ch); // dos de la main de l'élève
    const land = easeOut(prog(t, 5.3, 6.0));
    const target = handAt([back[0] - 2, back[1] - 4], [0, -70], { r: 200, s: 0.86, left: true });
    const hover = 1 - land;
    const squeeze = Math.exp(-(((t - 6.5) / 0.12) ** 2)) * 0.015; // un temps : la main serre doucement
    return { kind: 'parent', pose: 'cover', ...target, x: target.x - hover * 30, y: target.y - hover * 600, s: 0.86 * (1 + 0.06 * hover - squeeze), h: 16 + hover * 40, under: false };
  }
  if (t >= 7.0 && t < 7.45) {
    // de la main de l'élève jusqu'au téléphone posé : elle passe au-delà du bord du téléphone, puis glisse dessous
    const ch = childHand(6.0, 'fr');
    const back = handPoint([0, -60], ch);
    const from = { kind: 'parent', pose: 'cover', ...handAt([back[0] - 2, back[1] - 4], [0, -70], { r: 200, s: 0.86, left: true }), h: 16 };
    const to = cradleOn(phonePose(7.45), 6);
    const [ox, oy] = rot([0, 120], to.r);
    const via = { ...to, x: to.x + ox, y: to.y + oy, h: 16 };
    if (t < 7.3) return { ...blend(from, via, easeInOut(prog(t, 7.0, 7.3))), under: false };
    return { ...blend(via, to, easeInOut(prog(t, 7.3, 7.45))), under: true };
  }
  const ph = phonePose(t);
  if (t >= 7.45 && t < 19.0) {
    // tient le téléphone ; le repose, puis se retire vers le haut
    const leave = easeIn(prog(t, 18.5, 19.0));
    const c = cradleOn(ph, ph.h + 4);
    const [ax, ay] = rot([0, 260 * leave], ph.r);
    return { ...c, x: c.x + ax, y: c.y + ay, h: c.h + leave * 30, under: true };
  }
  if (t >= 43.5 && t < 49.1) {
    const come = easeOut(prog(t, 43.5, 44.0));
    const leave = easeIn(prog(t, 48.6, 49.1));
    const c = cradleOn(ph, ph.h + 4);
    const [ax, ay] = rot([0, 260 * ((1 - come) + leave)], ph.r);
    return { ...c, x: c.x + ax, y: c.y + ay, h: c.h + ((1 - come) + leave) * 30, under: true };
  }
  return null;
}

// Pouce du parent sur l'écran de paiement : il vient appuyer sur « Confirmer » (0:46,05 → 0:46,3).
export function payThumb(t) {
  if (t < 45.8 || t > 46.8) return null;
  const go = easeInOut(prog(t, 45.85, 46.2));
  const back = easeIn(prog(t, 46.35, 46.75));
  const press = Math.exp(-(((t - 46.25) / 0.06) ** 2));
  // repère du téléphone : le bout du pouce va du bord droit (x = 40) au bouton « Confirmer » (0, 54,5)
  return { x: lerp(38, 13, go * (1 - back)), y: lerp(64, 55, go * (1 - back)), press };
}

// ---------- les fiches ----------
// Elles se soulèvent de l'écran (0:16,0), volent et atterrissent une par temps.
export function cardPoses(t) {
  const ph = phonePose(t);
  const out = [];
  CARD_SPOTS.forEach((spot, i) => {
    if (t < 15.98) return;
    const t0 = 16.0 + i * 0.12, t1 = CARD_LAND[i];
    // départ : la vignette sur l'écran du téléphone (dans le repère du téléphone, puis de la table)
    const local = rot([0, -22 + i * 26], ph.r);
    const from = { x: ph.x + local[0], y: ph.y + local[1], r: ph.r, s: 0.45 };
    let p;
    if (t < t1) {
      const k = prog(t, t0, t1);
      const e = easeInOut(k);
      // trajectoire en arc : la fiche monte vers la caméra puis redescend
      const arc = Math.sin(Math.PI * k);
      p = {
        x: lerp(from.x, spot.x, e) + arc * (i - 1) * 40, y: lerp(from.y, spot.y, e) - arc * 30,
        r: angleLerp(from.r, spot.r, easeOut(k)), s: lerp(from.s, 1, easeOut(k)) * (1 + arc * 0.22), h: 40 + arc * 100 - 38 * e,
        op: clamp(k * 6),
      };
    } else {
      const b = bounce(t - t1, 7, 10);
      p = { ...spot, s: 1 + b * 0.025, h: 1.5 + Math.max(0, b) * 6 };
    }
    // la fiche d'anglais se ternit puis s'en va (0:40,0) ; sa remplaçante arrive (0:42,0 → 0:42,5)
    if (i === 2) {
      const dim = prog(t, CARD_SWAP.dim, CARD_SWAP.dim + 0.35);
      const go = easeIn(prog(t, ...CARD_SWAP.out));
      p = { ...p, x: p.x - go * 700, r: p.r - go * 25, h: p.h + go * 30, dim };
      if (go >= 1) p.gone = true;
    }
    p.stamp = prog(t, STAMPS[i] - 0.02, STAMPS[i] + 0.16);
    p.i = i;
    // la fiche de maths est choisie (0:22,5) ; pendant le mois, la fiche du spécialiste qui écrit s'allume
    const monthSel = MONTH_WRITERS.reduce((a, m) => (m.card === i ? Math.max(a, prog(t, m.at[0] - 0.35, m.at[0] - 0.2) * (1 - prog(t, m.at[1] + 0.25, m.at[1] + 0.4))) : a), 0);
    p.sel = i === 0 ? ease(prog(t, 22.5, 22.8)) * (1 - prog(t, 24.0, 24.3)) : 0;
    p.sel = Math.max(p.sel, monthSel);
    out.push(p);
  });
  if (t >= CARD_SWAP.in[0] - 0.05) {
    const k = prog(t, ...CARD_SWAP.in);
    const spot = CARD_SPOTS[2];
    const e = easeOut(k);
    const b = bounce(t - CARD_SWAP.in[1], 7, 10);
    out.push({
      i: 3, x: lerp(spot.x - 700, spot.x, e), y: lerp(spot.y + 40, spot.y, e), r: lerp(-40, spot.r + 1, e), s: (1 + Math.sin(Math.PI * k) * 0.12) * (1 + (k >= 1 ? b * 0.025 : 0)),
      h: k < 1 ? 4 + Math.sin(Math.PI * k) * 60 : 1.5 + Math.max(0, b) * 6, stamp: prog(t, CARD_SWAP.stamp - 0.02, CARD_SWAP.stamp + 0.16), dim: 0, sel: 0,
    });
  }
  return out;
}

// ---------- le répétiteur de maths, pendant la séance d'essai (0:25,4 → 0:31,8) ----------
export function tutorHand(t, lang) {
  if (t < 25.35 || t > 31.8) return null;
  const c = content(lang);
  const s = ADULT_S;
  const holeC = pageW([c.hole.x + 1, c.hole.y + 0.6]);
  // a. apporte le scotch, tenu par un bout, et le pose sur le trou (la main reste à gauche du trou)
  const tapeHold = (k, h) => {
    const p = [holeC[0] - 20 - (1 - k) * 260, holeC[1] + 1 + (1 - k) * 160];
    return { kind: 'maths', pose: 'pinch', ...handAt(p, PINCH, { r: 58, s }), h, tool: 'tape' };
  };
  // b. lisse le scotch du plat des doigts
  const smooth = (sweep) => ({ kind: 'maths', pose: 'flat', ...handAt([holeC[0] + sweep, holeC[1] + 5], [-6, -150], { r: 70, s }), h: 13 });
  // c. écrit « | −5 » au stylo
  const writeAt = (tip, h, tool = 'bic', r = 38) => ({ kind: 'maths', pose: 'write', ...handAt(tip, WRITE_TIP, { r, s }), h, tool });
  const out = (pose, k) => {
    // sortie le long du bras (vers le bas à gauche)
    const d = rot([0, 1], pose.r);
    return { ...pose, x: pose.x + d[0] * 300 * k, y: pose.y + d[1] * 300 * k, h: pose.h + 20 * k };
  };

  if (t < 26.5) return tapeHold(easeOut(prog(t, 25.35, 26.45)), 30);
  if (t < 26.75) return { ...tapeHold(1, lerp(30, 14, easeOut(prog(t, 26.5, 26.62)))), tool: t < 26.67 ? 'tape' : '' };
  if (t < 26.95) return blend({ ...tapeHold(1, 14), tool: '' }, smooth(0), easeInOut(prog(t, 26.75, 26.95)));
  if (t < 27.35) return smooth(Math.sin(((t - 26.95) / 0.2) * Math.PI) * 7);
  const pen = c.hint.pen(clamp(t, 27.5, 28.25));
  const hintStart = writeAt(pageW(c.hint.strokes[0].pts[0]), 28);
  if (t < 27.5) return blend(smooth(0), hintStart, easeInOut(prog(t, 27.35, 27.5)));
  if (t < 28.25) return writeAt(pageW(pen.pos), pen.down ? 20 : 28);
  const last = writeAt(pageW(c.hint.strokes.at(-1).pts.at(-1)), 28);
  if (t < 28.8) return out(last, easeIn(prog(t, 28.25, 28.5))); // se retire : l'élève écrit seule
  if (t < 29.55) return null;
  // d. revient avec le surligneur, passe sur « x = 6 »
  const y = L.ans - 1.8;
  const x0 = X0 + 10, x1 = X0 + 14 + c.ans.width;
  const hlStart = writeAt(pageW([x0, y]), 26, 'highlighter', 30);
  if (t < 30.0) return out(hlStart, 1 - easeOut(prog(t, 29.55, 30.0)));
  const hlEnd = writeAt(pageW([x1, y]), 18, 'highlighter', 30);
  if (t < 30.32) return { ...writeAt(pageW([lerp(x0, x1, easeInOut(prog(t, 30.0, 30.32))), y]), 18, 'highlighter', 30) };
  return fistBump(t, 'tutor', { ...hlEnd, h: 26 });
}

// Check des poings (contact à 0:31,0) : chaque poing part de la dernière position de sa main.
function fistBump(t, who, from) {
  const meet = P(86, 166);
  const ret = easeIn(prog(t, BUMP + 0.08, BUMP + 0.75));
  if (ret >= 1) return null;
  const squash = t >= BUMP ? Math.max(0, bounce(t - BUMP, 5, 12)) : 0;
  const rise = Math.sin(Math.PI * clamp(prog(t, 30.4, BUMP + 0.75)));
  const s = (who === 'child' ? CHILD_S : ADULT_S) * (1 + 0.07 * rise);
  const r = who === 'child' ? -38 : 52;
  const front = [0, -112];
  const gap = 7 + squash * 3;
  const fwd = rot([0, -1], r), back = rot([0, 1], r);
  const tgt = [meet[0] - fwd[0] * gap + back[0] * ret * 420, meet[1] - fwd[1] * gap + back[1] * ret * 420];
  const fist = { kind: who === 'child' ? 'child' : 'maths', pose: 'fist', ...handAt(tgt, front, { r, s }), h: 26 + rise * 50, tool: '' };
  return blend(from, fist, easeIn(prog(t, 30.35, BUMP)));
}
export const bumpBurst = (t) => (t >= BUMP && t < BUMP + 0.45 ? { at: P(86, 166), k: prog(t, BUMP, BUMP + 0.45) } : null);

// ---------- un mois en accéléré (0:32 → 0:36) ----------
// À chaque page tournée, un spécialiste écrit ; sa fiche s'allume sur la table.
export const MONTH_WRITERS = [
  { kind: 'physics', at: [32.55, 33.15], r: 34, card: 1 },
  { kind: 'english', at: [33.55, 34.15], r: 46, card: 2 },
  { kind: 'maths', at: [34.55, 35.15], r: 38, card: 0 },
];
export function monthHand(t, writings) {
  for (let i = 0; i < MONTH_WRITERS.length; i++) {
    const m = MONTH_WRITERS[i];
    if (t < m.at[0] - 0.2 || t > m.at[1] + 0.2) continue;
    const w = writings[i];
    const pen = w.pen(clamp(t, m.at[0], m.at[1]));
    let tip = P(pen.pos[0], pen.pos[1]);
    const inK = easeOut(prog(t, m.at[0] - 0.2, m.at[0]));
    const outK = easeIn(prog(t, m.at[1], m.at[1] + 0.2));
    const off = (1 - inK) + outK;
    const dir = rot([0, 1], m.r);
    tip = [tip[0] + dir[0] * off * 900, tip[1] + dir[1] * off * 900];
    return { kind: m.kind, pose: 'write', ...handAt(tip, WRITE_TIP, { r: m.r, s: ADULT_S }), h: pen.down ? 20 : 28, tool: 'bic' };
  }
  return null;
}

// Le bilan du mois glisse sur la page gauche (0:36,0 → 0:36,5) ; il repart avant la fin (0:48,0).
export function reportPose(t) {
  if (t < 35.9 || t > REPORT_OUT[1]) return null;
  const k = prog(t, ...REPORT_IN);
  const e = easeOut(k);
  const b = bounce(t - REPORT_IN[1], 6, 10);
  const go = easeIn(prog(t, ...REPORT_OUT));
  return {
    x: lerp(REPORT_SPOT.x + 640, REPORT_SPOT.x, e) - go * 1000, y: lerp(REPORT_SPOT.y - 60, REPORT_SPOT.y, e) - go * 60, r: lerp(REPORT_SPOT.r + 18, REPORT_SPOT.r, e) - go * 12,
    s: 1 + Math.sin(Math.PI * k) * 0.05 + (k >= 1 ? b * 0.012 : 0) + Math.sin(Math.PI * go) * 0.04, h: k < 1 ? 3 + Math.sin(Math.PI * k) * 26 : 1.2 + go * 20,
  };
}

// Lumière : lampe (soir), jour (le mois qui passe), extinction finale.
export function lighting(t) {
  // 0 : soir, lampe allumée ; 1 : plein jour
  const day = t < 32.3 || t > 36.4 ? 0 : keys(t, [[32.3, 0], [32.7, 0.15], [32.95, 1], [33.6, 1], [33.9, 0.1], [34.2, 0.95], [35.2, 1], [35.7, 0.3], [36.4, 0]], easeInOut);
  const night = t < 32.3 || t > 36.4 ? 0 : keys(t, [[32.3, 0], [32.6, 0.7], [32.8, 0], [33.75, 0], [33.95, 0.6], [34.15, 0]], easeInOut);
  const off = easeInOut(prog(t, 49.0, 49.5));
  const sun = prog(t, 32.7, 35.9);
  return { day, night, lamp: 1 - off, off, sun };
}
