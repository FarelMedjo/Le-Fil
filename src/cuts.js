// Les versions du film (sections 7 et 9) : chacune est un montage de plans du master, sans nouvelle animation.
//
// Un segment prend le master à partir de `from` (secondes) et le pose à `at` dans la version ;
// il dure jusqu'au segment suivant. `rate` < 1 ralentit le temps du master (tenue du carton final).
// Toutes les coupes tombent sur la grille de 96 BPM, dans le master comme dans la version :
// le fond sonore garde ainsi sa pulsation d'un segment à l'autre.
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

  // Section 9 : 48 temps. Ordre, plans, textes et sons du tableau de la section 9 ; les limites
  // sont posées sur la grille et ajustées pour la lecture (voir README).
  '30s': {
    id: '30s', name: 'Version courte 30 s', duration: 30,
    segments: [
      { at: 0, from: 0, name: 'Accroche' }, // plan 0 raccourci : une seule gomme
      { at: 3.125, from: 5.0, name: 'Demande' }, // plan 1, recul déjà engagé
      { at: 7.5, from: 17.5, name: 'Spécialistes' }, // division en trois fils, T3
      { at: 11.25, from: 23.75, name: 'Spécialistes · vérification' }, // image fixe : la coupe ne se voit pas
      { at: 13.75, from: 28.75, name: 'Résolution' }, // plan 4, des coups à la porte au franchissement
      { at: 18.125, from: 38.75, name: 'Suivi' }, // coup de tampon
      { at: 18.75, from: 40.0, name: 'Suivi · remplacement' }, // le fil s'estompe, le nouveau se raccorde
      { at: 21.875, from: 50.625, name: 'Clôture' }, // plan 7 dès la pastille 01
    ],
    // Textes posés au montage, en temps de la version : [carton, entrée, sortie, réglages].
    cards: [
      ['T0', 0.6, 3.05],
      ['T1', 4.375, 7.45],
      ['T3', 7.5, 11.2],
      ['T3c', 11.25, 13.7],
      ['T3d', 11.25, 13.7, { items: [11.25, 11.875, 12.5, 13.125] }],
      ['T5b', 18.125, 21.8],
      ['T5d', 18.75, 21.8, { slot: 'lower' }], // sous la feuille, pour rester avec T5b
      ['T7', 23.75, 27.4],
      ['T7b', 24.65, 27.4, { underline: 25.65 }],
      ['T8', 27.5, 31],
      ['T8n1', 27.5, 31],
      ['T8n2', 28.125, 31],
      ['T8i', 27.5, 31],
      ['T6s', 27.5, 31], // la mention du paiement passe en petit sur le carton final
      ['T8r', 28.75, 31],
    ],
    // Sons attachés à un texte déplacé : image du master → instant dans la version.
    recue: { 1725: 27.5, 1744: 28.125, 1763: 28.75 },
    bedIn: 3.125, // la pulsation entre avec la demande
    bell: 28.75, stop: 28.75, // tout s'arrête sur la cloche
    // Lignes du master qui changent de texte dans la version (null : ligne retirée).
    edit: {
      656: null, // T3c reposé à la coupe de 0:11,25
      881: { anim: 'Porte ouverte (T4 non repris)' },
      1200: { anim: 'Un fil s\'estompe ; T5d « Remplacement garanti… » en bas de l\'écran' },
      1256: { anim: 'Nouveau fil raccordé' },
      1706: null, // T8 avancé à 0:27,5
    },
    rows: [
      ['0:03,125', 'Recul déjà engagé ; la ligne glisse sur la table', 'Glissé sur bois, pris en cours', 'Pulsation entre, très basse'],
      ['0:11,25', 'T3c « Répétiteurs vérifiés »', '—', '—'],
      ['0:21,875', 'Fond sombre ; la Trajectoire est déjà tracée au dixième', 'Glissando de graphite, pris en cours', 'Fond coupé : le logo sonore joue seul jusqu\'à l\'accord'],
      ['0:27,5', 'T8 « Demandez un répétiteur », 620 27 39 65, mention du paiement', 'Tapotement feutré', '—'],
      ['0:28,125', 'Numéro 689 39 47 63', 'Tapotement feutré', '—'],
      ['0:28,75', 'Logo TutorLab ; « Réponse sous 48 h »', 'Cloche à main', 'Tout s\'arrête sur la cloche'],
      ['0:30,0', 'Fin', 'Ambiance seule, fondu', '—'],
    ],
  },

  // Section 7 : variante de 64 s, carton final 7 s à l'écran (de 0:56,875 à 1:04).
  '64s': {
    id: '64s', name: 'Variante 64 s', duration: 64,
    segments: [
      { at: 0, from: 0, name: 'Master' },
      { at: 59.5, from: 59.5, rate: 0.5 / 4.5, name: 'Carton final tenu' },
    ],
    rows: [['1:04,0', 'Fin du carton final tenu', 'Ambiance seule, fondu', '—']],
  },
};

export const cutOf = (id) => CUTS[id] || CUTS[{ 30: '30s', 64: '64s' }[id]] || CUTS.master;

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
    ...(c.underline ? { underline: map(c.underline) } : {}),
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
  const recued = new Set(Object.keys(cut.recue || {}).map(Number));
  const edit = cut.edit || {};
  const rows = [];
  for (const r of SYNC) {
    if (recued.has(r.frame) || edit[r.frame] === null) continue;
    const t = versionTime(cut, r.t);
    if (t === null || t === Infinity || t >= cut.duration) continue;
    rows.push({ ...r, ...edit[r.frame], t, frame: Math.round(t * FPS), time: clock(t), cut: false, rank: 2 });
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
