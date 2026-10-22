// Les versions du film : chacune est un montage du master, sans nouvelle animation.
//
// Un segment prend le master à partir de `from` (secondes) et le pose à `at` dans la version ;
// il dure jusqu'au segment suivant. `rate` < 1 ralentit le temps du master (tenue du carton final).
// Toutes les coupes tombent sur la grille de 120 BPM, dans le master comme dans la version :
// la musique garde ainsi sa pulsation d'un segment à l'autre.
import { CARDS } from './texts.js';
import { BEAT, FPS, SYNC, tc } from './timeline.js';

const card = (id) => {
  const c = CARDS.find((x) => x.id === id);
  if (!c) throw new Error(`Carton inconnu : ${id}`);
  return c;
};

export const CUTS = {
  master: {
    id: 'master', name: 'Master 60 s', duration: 60,
    segments: [{ at: 0, from: 0, name: 'Plan-séquence' }],
  },

  // 60 temps. Chaque coupe tombe sur un temps, et à la même place dans la mesure (de 2 s) dans le
  // master et dans la version : la musique garde sa pulsation et ses premiers temps.
  // On garde le blocage, la demande, l'équipe, le déclic, le bilan et la signature ; l'entretien de
  // cadrage, la vérification détaillée, le remplacement et le paiement restent dans le master
  // (le paiement passe en petit sur le carton final).
  '30s': {
    id: '30s', name: 'Version courte 30 s', duration: 30,
    segments: [
      { at: 0, from: 0, name: 'Le blocage' }, // jusqu'au trou et à la gomme qui tombe
      { at: 5.0, from: 7.0, name: 'La demande' }, // le demi-tour vers le téléphone, le message
      { at: 9.5, from: 15.5, name: 'L\'équipe' }, // « Votre proposition », les trois fiches qui s'envolent
      { at: 14.0, from: 26.0, name: 'Le déclic' }, // le scotch, « x = 6 », le check
      { at: 19.5, from: 35.5, name: 'Le bilan' }, // le bilan du mois glisse sur le cahier
      { at: 22.0, from: 52.0, name: 'La signature' }, // slogan, logo sonore, contact
    ],
    // Textes posés au montage, en temps de la version : [carton, entrée, sortie, réglages].
    cards: [
      ['T0', 1.0, 4.6],
      ['T1', 5.5, 9.5],
      // l'entretien de cadrage est coupé : les étapes sont renumérotées
      ['T3', 10.1, 14.0, { hl: 10.75, step: '02' }],
      // pendant le déclic, l'image parle seule : la séance d'essai sort avant le « 12 »
      ['T4', 14.0, 16.5, { hl: 14.9, step: '03', fr: ['# Séance d’essai', '# *à domicile*'], en: ['# Trial session', '# *at home*'] }],
      // « bilan écrit mensuel » : la formulation du flyer, en 4 mots (2,5 s suffisent, étiquette comprise)
      ['T5b', 19.5, 22.0, { hl: 20.3, step: '04', fr: ['# Un *bilan écrit*', '# mensuel'], en: ['# A monthly', '# *written report*'] }],
      ['T7', 22.0, 24.5], // le slogan seul : avec T7b, 12 mots en 2,5 s, sous le temps de lecture
      ['T8', 25.0, 31],
      ['T8n1', 25.5, 31],
      ['T8n2', 26.0, 31],
      ['T8i', 25.5, 31],
      ['T6s', 25.5, 31], // la mention du paiement passe en petit sur le carton final
      ['T8r', 26.5, 31],
    ],
    rows: [
      ['0:05,0', 'Coupe : la caméra fait déjà demi-tour vers le téléphone', '—', 'Nappe, trois notes qui montent'],
      ['0:09,5', 'Coupe : « Votre proposition », les fiches vont s\'envoler', '—', 'Groove'],
      ['0:14,0', 'Coupe : le répétiteur apporte le scotch', '—', 'Coupure : nappe et ostinato seuls'],
      ['0:19,5', 'Coupe : le bilan du mois arrive', '—', 'Groove complet'],
      ['0:22,0', 'Coupe : le logo est formé, le slogan est à l\'écran', '—', 'Final'],
    ],
  },

  // Variante de 64 s : le carton final reste 4,5 s de plus à l'écran (numéros affichés 8,5 s).
  '64s': {
    id: '64s', name: 'Variante 64 s', duration: 64,
    segments: [
      { at: 0, from: 0, name: 'Master' },
      { at: 59.5, from: 59.5, rate: 0.5 / 4.5, name: 'Carton final tenu' },
    ],
    rows: [['1:04,0', 'Fin du carton final tenu', 'La cloche s\'éteint, puis l\'ambiance seule ; fondu', '—']],
  },

  // Version lente de 90 s : tout le master au ralenti ×1,5 (image, gestes, caméra), pour laisser le temps de lire.
  // Chaque texte reste 1,5 fois plus longtemps à l'écran ; ses animations (bandes, cascade, surligneur) gardent
  // leur vitesse. La bande-son est recalculée au ralenti (scripts/build-audio.mjs, tempo) : musique à 80 BPM.
  '90s': {
    id: '90s', name: 'Version lente 90 s', duration: 90, tempo: 1.5,
    segments: [{ at: 0, from: 0, rate: 1 / 1.5, name: 'Master au ralenti ×1,5' }],
    rows: [['0:00,0', 'Version lente : le master au ralenti ×1,5 ; musique à 80 BPM', '—', '—']],
  },
};

export const cutOf = (id) => CUTS[id] || CUTS[{ 30: '30s', 64: '64s', 90: '90s' }[id]] || CUTS.master;

// Segments complétés : fin dans la version (`end`) et fin dans le master (`to`).
const done = new WeakMap();
export function segments(cut) {
  if (done.has(cut)) return done.get(cut);
  const segs = cut.segments.map((s, i) => {
    const end = i + 1 < cut.segments.length ? cut.segments[i + 1].at : cut.duration;
    const rate = s.rate ?? 1;
    return { ...s, rate, end, to: s.from + (end - s.at) * rate };
  });
  done.set(cut, segs);
  return segs;
}

// Instant du master montré à l'instant t de la version.
export function masterTime(cut, t) {
  const segs = segments(cut);
  let s = segs[0];
  for (const x of segs) if (t >= x.at - 1e-9) s = x;
  return s.from + (t - s.at) * s.rate;
}

// Instant de la version où passe l'instant m du master (null s'il est coupé au montage).
export function versionTime(cut, m) {
  for (const s of segments(cut)) {
    if (m >= s.from - 1e-9 && m < s.to - 1e-9) return s.at + (m - s.from) / s.rate;
  }
  const last = segments(cut).at(-1);
  return m >= last.to - 1e-9 && last.rate !== 1 ? Infinity : null;
}

// Textes de la version, en temps de la version.
export function cardsFor(cut) {
  if (cut.cards) {
    return cut.cards.map(([id, inT, outT, extra = {}]) => ({ ...card(id), in: inT, out: outT, ...extra }));
  }
  const master = CARDS.filter((c) => !c.cuts);
  if (cut.id === 'master') return master;
  const map = (m) => versionTime(cut, m) ?? Infinity;
  return master.map((c) => ({
    ...c, in: map(c.in), out: c.out > 60 ? Infinity : map(c.out),
    ...(c.items ? { items: c.items.map(map) } : {}),
    ...(c.hl !== undefined ? { hl: map(c.hl) } : {}),
  }));
}

// 21.875 -> "0:21,875", comme dans le document (les temps de la grille ne tombent pas tous sur une image).
export function clock(t) {
  const m = Math.floor(t / 60 + 1e-9);
  const s = Math.round((t - m * 60) * 1000) / 1000;
  const [int, dec = '0'] = String(s).split('.');
  return `${m}:${int.padStart(2, '0')},${dec}`;
}

// Feuille de synchronisation de la version : lignes du master qui restent, recalées, plus les lignes propres au montage.
export function syncFor(cut) {
  if (cut.id === 'master') return SYNC.map((r) => ({ ...r, cut: false }));
  const rows = [];
  for (const r of SYNC) {
    const t = versionTime(cut, r.t);
    if (t === null || t === Infinity || t >= cut.duration) continue;
    rows.push({ ...r, t, frame: Math.round(t * FPS), time: clock(t), cut: false, rank: 2 });
  }
  for (const s of segments(cut).slice(1)) {
    if (s.rate !== 1) continue;
    rows.push({ t: s.at, frame: Math.round(s.at * FPS), time: clock(s.at), anim: `Coupe → ${s.name} (master ${clock(s.from)})`, sfx: '—', bed: '—', cut: true, rank: 0 });
  }
  for (const [time, anim, sfx, bed] of cut.rows || []) {
    const t = tc(time);
    rows.push({ t, frame: Math.round(t * FPS), time, anim, sfx, bed, cut: false, rank: 1 });
  }
  // à image égale : la coupe, puis les lignes propres au montage, puis celles du master
  return rows.sort((a, b) => a.frame - b.frame || a.rank - b.rank);
}

export const beatsOf = (cut) => Math.round(cut.duration / BEAT);
