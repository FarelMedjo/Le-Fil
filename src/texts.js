// Textes à l'écran (sections 2 et 8). Seuls les textes changent entre les langues.
//
// Balisage d'une ligne :
//   "! " grand titre · "# " titre d'étape · "~ " sous-titre · "? " question
//   "= " numéro de téléphone · "- " information
//   `…` JetBrains Mono (numéros d'étape, « 48 h », « 7 jours », téléphones)
//   *…* mot souligné par la ligne (« réussite »)
// Les retours à la ligne sont de la mise en page : le vocabulaire reste celui du flyer.

export const CARDS = [
  // ---- monde clair (fond crème) ----
  { id: 'T0', in: 0.6, out: 3.7, world: 'page', slot: 'top',
    fr: ['! Une matière qui bloque ?'],
    en: ['! A subject holding them back?'] },
  { id: 'T1', in: 6.25, out: 9.4, world: 'page', slot: 'top',
    fr: ['# `01` · Votre demande', '~ WhatsApp ou appel'],
    en: ['# `01` · Your request', '~ WhatsApp or call'] },
  { id: 'T2', in: 11.25, out: 16.2, world: 'page', slot: 'top',
    fr: ['# `02` · Entretien de cadrage sous `48 h`'],
    en: ['# `02` · Scoping interview within `48 h`'] },
  { id: 'T3', in: 17.5, out: 21.8, world: 'page', slot: 'top',
    fr: ['# `03` · Sous `7 jours`, un spécialiste par matière'],
    en: ['# `03` · Within `7 days`, one specialist per subject'] },
  { id: 'T3c', in: 21.875, out: 26.8, world: 'page', slot: 'top', stack: 'verif',
    fr: ['# Répétiteurs vérifiés'],
    en: ['# Verified tutors'] },
  { id: 'T3d', in: 23.75, out: 26.8, world: 'page', slot: 'top', stack: 'verif', type: 'checks',
    items: [23.75, 24.375, 25.0, 25.625],
    fr: ['Identité', 'Parcours', 'Références', 'Entretien'],
    en: ['Identity', 'Background', 'References', 'Interview'] },
  { id: 'T4', in: 29.4, out: 34.2, world: 'page', slot: 'topNarrow',
    fr: ['# `04` · Séance d\'essai à domicile,', '~ avant tout engagement de longue durée'],
    en: ['# `04` · Trial session at home,', '~ before any long-term commitment'] },
  { id: 'T5b', in: 38.75, out: 41.8, world: 'page', slot: 'top',
    fr: ['# `05` · Un bilan écrit chaque mois'],
    en: ['# `05` · A written report every month'] },
  { id: 'T5c', in: 40.0, out: 41.8, world: 'page', slot: 'lower',
    fr: ['? Indisponibilité ou insatisfaction ?'],
    en: ['? Tutor unavailable or not the right fit?'] },
  { id: 'T5d', in: 41.875, out: 45.2, world: 'page', slot: 'top',
    fr: ['# Remplacement garanti', '~ un autre spécialiste vous est proposé'],
    en: ['# Guaranteed replacement', '~ another specialist is proposed'] },
  { id: 'T6', in: 45.3, out: 49.4, world: 'page', slot: 'top',
    fr: ['# Paiement mensuel', '# MTN MoMo · Orange Money', '~ prix unique, sans frais cachés'],
    en: ['# Monthly payment', '# MTN MoMo · Orange Money', '~ one price, no hidden fees'] },

  // ---- monde sombre (plan 7) ----
  { id: 'T7', in: 52.5, out: 56.8, world: 'dark', slot: 'top', stack: 'slogan',
    fr: ['! Un spécialiste', '! par matière.'],
    en: ['! One specialist', '! per subject.'] },
  { id: 'T7b', in: 53.4, out: 56.8, world: 'dark', slot: 'top', stack: 'slogan', underline: 54.4,
    fr: ['~ Une équipe pour la *réussite* de votre enfant.'],
    en: ['~ A team for your child\'s *success*.'] },
  { id: 'T8', in: 56.875, out: 61, world: 'dark', slot: 'top', stack: 'contact',
    fr: ['# Demandez un répétiteur'],
    en: ['# Request a tutor'] },
  { id: 'T8n1', in: 57.5, out: 61, world: 'dark', slot: 'top', stack: 'contact',
    fr: ['= `620 27 39 65`'], en: ['= `620 27 39 65`'] },
  { id: 'T8n2', in: 58.125, out: 61, world: 'dark', slot: 'top', stack: 'contact',
    fr: ['= `689 39 47 63`'], en: ['= `689 39 47 63`'] },
  { id: 'T8i', in: 56.875, out: 61, world: 'dark', slot: 'top', stack: 'contact',
    fr: ['- WhatsApp & appels · Yaoundé'],
    en: ['- WhatsApp & calls · Yaoundé'] },
  { id: 'T8r', in: 58.75, out: 61, world: 'dark', slot: 'bottom', type: 'signature',
    fr: ['Réponse sous `48 h`'],
    en: ['Reply within `48 h`'] },
];

// Étiquettes posées dans l'illustration (elles suivent la caméra).
export const LABELS = {
  T2b: { fr: ['Classe', 'Matières', 'Objectifs', 'Disponibilités'], en: ['Class', 'Subjects', 'Goals', 'Availability'] },
  T3b: { fr: ['Mathématiques', 'Anglais', 'Physics'], en: ['Mathematics', 'English', 'Physics'] },
  T5: { fr: ['Séances réalisées', 'Travail couvert', 'Progression'], en: ['Sessions held', 'Work covered', 'Progress'] },
  sheet: { fr: 'BILAN DU MOIS', en: 'MONTHLY REPORT' },
};

// Emplacements (10 % des bords minimum : zones masquées par WhatsApp et Facebook).
export const SLOTS = {
  top: { x: 108, y: 216, w: 864 },
  topNarrow: { x: 108, y: 216, w: 770 },
  lower: { x: 108, y: 1540, w: 864 },
  bottom: { x: 108, y: 1576, w: 864 },
};
