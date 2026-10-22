// Textes du film. Seuls les textes changent d'une langue à l'autre.
//
// CARDS : textes à l'écran (bandes de papier adhésif, puis carton final). Balisage d'une ligne :
//   "! " grand titre · "# " titre d'étape · "~ " sous-titre · "? " question
//   "= " numéro de téléphone · "- " information · ". " mention en petit
//   `…` JetBrains Mono (« 48 h », « 7 jours », téléphones) · *…* passage surligné en lime
// `step` : numéro d'étape (étiquette) ; `hl` : instant du coup de surligneur ; `tilt` : rotation de la bande.
// TXT : textes posés dans l'image (cahier, téléphone, fiches, bilan).

export const CARDS = [
  { id: 'T0', in: 1.0, out: 4.6, slot: 'top', tilt: -2,
    fr: ['! Une matière', '! qui bloque ?'], en: ['! Stuck on', '! a subject?'] },
  { id: 'T1', in: 8.25, out: 11.5, slot: 'top', step: '01', tilt: 1.5,
    fr: ['# Votre demande', '~ WhatsApp ou appel'], en: ['# Your request', '~ WhatsApp or call'] },
  { id: 'T2', in: 12.0, out: 15.75, slot: 'top', step: '02', tilt: -1.5, hl: 12.9,
    fr: ['# Entretien de cadrage', '# sous *`48`\u202Fh*'], en: ['# Scoping interview', '# within *`48`\u202Fh*'] },
  { id: 'T3', in: 16.3, out: 20.0, slot: 'top', step: '03', tilt: 1.2, hl: 17.25,
    fr: ['# Proposition', '# sous `7`\u202Fjours :', '# *un spécialiste*', '# *par matière*'],
    en: ['# Your match', '# within `7`\u202Fdays:', '# *one specialist*', '# *per subject*'] },
  { id: 'T3c', in: 20.0, out: 23.75, slot: 'top', tilt: -1.5, type: 'checks', items: [20.5, 21.0, 21.5, 22.0],
    fr: ['# Répétiteurs vérifiés', 'Identité', 'Parcours', 'Références', 'Entretien'],
    en: ['# Verified tutors', 'Identity', 'Background', 'References', 'Interview'] },
  { id: 'T4', in: 24.5, out: 29.25, slot: 'top', step: '04', tilt: -1.2, hl: 25.4,
    fr: ['# Séance d\'essai', '# *à domicile*,', '~ avant tout engagement', '~ de longue durée'],
    en: ['# Trial session', '# *at home*,', '~ before any long-term', '~ commitment'] },
  { id: 'T5b', in: 36.5, out: 39.6, slot: 'top', step: '05', tilt: 1.4, hl: 37.3,
    fr: ['# Un *bilan écrit*', '# chaque mois'], en: ['# A *written report*', '# every month'] },
  { id: 'T5c', in: 39.6, out: 41.6, slot: 'top', tilt: -1.6,
    fr: ['? Indisponibilité', '? ou insatisfaction ?'], en: ['? Unavailable', '? or unsatisfied?'] },
  { id: 'T5d', in: 41.6, out: 45.0, slot: 'top', tilt: 1.2, hl: 42.2,
    fr: ['# Remplacement *garanti*', '~ un autre spécialiste', '~ vous est proposé'],
    en: ['# Replacement', '# *guaranteed*', '~ we propose', '~ another specialist'] },
  { id: 'T6', in: 45.0, out: 49.3, slot: 'top', tilt: -1.2,
    fr: ['# Paiement mensuel', '~ MTN MoMo · Orange Money', '~ prix unique, sans frais cachés'],
    en: ['# Monthly payment', '~ MTN MoMo · Orange Money', '~ one price, no hidden fees'] },

  // ---- carton final (bleu profond, sans bandes) ----
  { id: 'T7', in: 50.3, out: 54.5, slot: 'end', stack: 'slogan',
    fr: ['! Un spécialiste', '! par matière.'], en: ['! One specialist', '! per subject.'] },
  { id: 'T7b', in: 51.0, out: 54.5, slot: 'end', stack: 'slogan', hl: 51.9,
    fr: ['~ Une équipe pour la *réussite*', '~ de votre enfant.'], en: ['~ A team for your', '~ child’s *success*.'] },
  { id: 'T8', in: 55.0, out: 61, slot: 'cta', stack: 'contact',
    fr: ['# Demandez un répétiteur'], en: ['# Request a tutor'] },
  { id: 'T8n1', in: 55.5, out: 61, slot: 'cta', stack: 'contact', fr: ['= `620 27 39 65`'], en: ['= `620 27 39 65`'] },
  { id: 'T8n2', in: 56.0, out: 61, slot: 'cta', stack: 'contact', fr: ['= `689 39 47 63`'], en: ['= `689 39 47 63`'] },
  { id: 'T8i', in: 55.5, out: 61, slot: 'cta', stack: 'contact', fr: ['- WhatsApp & appels · Yaoundé'], en: ['- WhatsApp & calls · Yaoundé'] },
  { id: 'T8r', in: 56.5, out: 61, slot: 'sign', type: 'pill', fr: ['Réponse sous `48`\u202Fh'], en: ['Reply within `48`\u202Fh'] },

  // ---- version courte : le paiement passe en petit sur le carton final ----
  { id: 'T6s', in: 55.5, out: 61, slot: 'cta', stack: 'contact', cuts: ['30s'],
    fr: ['. Paiement mensuel par Mobile\u00A0Money, prix unique'],
    en: ['. Monthly payment by Mobile\u00A0Money, one price'] },
];

// Emplacements, en pixels du cadre 9:16 (marges de 10 % : zones masquées par WhatsApp et Facebook).
export const SLOTS = {
  top: { x: 108, y: 196, w: 864 },
  end: { x: 108, y: 760, w: 864, align: 'center' },
  cta: { x: 108, y: 520, w: 864, align: 'center' },
  sign: { x: 108, y: 1500, w: 864, align: 'center' },
};
// Adaptation 16:9 (1920 × 1080) : colonne de texte à gauche, mêmes marges.
export const SLOTS_WIDE = {
  top: { x: 192, y: 120, w: 760 },
  end: { x: 192, y: 330, w: 760, align: 'left' },
  cta: { x: 192, y: 170, w: 760, align: 'left' },
  sign: { x: 192, y: 850, w: 760, align: 'left' },
};

export const TXT = {
  fr: {
    ex2: 'Exercice 2', ex3: 'Exercice 3', solve: 'Résous :', level: '3e',
    lesson: ['Équations du 1er degré', 'Pour isoler x, on fait la même', 'opération des deux côtés.', 'x + 3 = 7  donc  x = 7 − 3 = 4'],
    contact: 'TutorLab', online: 'en ligne', now: '21:04', typing: 'écrit…',
    msg: 'Bonsoir, ma fille est en 3e et elle bloque en maths. Vous pouvez nous aider\u202F?',
    day: 'Mercredi', reply: 'Bonsoir\u202F! Nous vous appelons sous 48\u202Fh pour l’entretien de cadrage.',
    placeholder: 'Message',
    incoming: 'Appel entrant', callTitle: 'Entretien de cadrage', calling: 'en cours',
    form: 'Votre demande',
    fields: [['Classe', '3e'], ['Matières', 'Maths · Physique-Chimie · Anglais'], ['Objectif', 'BEPC'], ['Disponibilités', 'mer. 16 h · sam. 10 h']],
    sent: 'Envoyée', proposal: 'Votre proposition', proposalSub: '3 spécialistes',
    subjects: ['Mathématiques', 'Physique-Chimie', 'Anglais'], spec: 'Spécialiste', stamp: 'VÉRIFIÉ',
    topics: ['Algèbre · Géométrie', 'Électricité · Chimie', 'Grammaire · Oral'], cardLevel: '3e · BEPC',
    report: 'BILAN DU MOIS', rows: ['Séances réalisées', 'Travail couvert', 'Progression'],
    covered: ['Équations, Thalès', 'Loi d\'Ohm', 'Present perfect'],
    pay: 'Paiement mensuel', confirm: 'Confirmer', paid: 'Paiement effectué',
    payRows: [['À', 'TutorLab'], ['Paiement', 'mensuel'], ['Tarif', 'prix unique'], ['Frais cachés', 'aucun'], ['Moyen', 'Mobile Money']],
    keyboard: ['azertyuiop', 'qsdfghjklm', 'wxcvbn'],
  },
  en: {
    ex2: 'Exercise 2', ex3: 'Exercise 3', solve: 'Solve:', level: 'Form 4',
    lesson: ['Linear equations', 'To isolate x, do the same', 'operation on both sides.', 'x + 3 = 7  so  x = 7 − 3 = 4'],
    contact: 'TutorLab', online: 'online', now: '21:04', typing: 'typing…',
    msg: 'Good evening, my daughter is in Form 4 and she is stuck in maths. Can you help us?',
    day: 'Wednesday', reply: 'Good evening! We will call you within 48\u202Fh for the scoping interview.',
    placeholder: 'Message',
    incoming: 'Incoming call', callTitle: 'Scoping interview', calling: 'ongoing',
    form: 'Your request',
    fields: [['Class', 'Form 4'], ['Subjects', 'Maths · Physics & Chemistry · English'], ['Goal', 'O Level'], ['Availability', 'Wed 4 pm · Sat 10 am']],
    sent: 'Sent', proposal: 'Your match', proposalSub: '3 specialists',
    subjects: ['Mathematics', 'Physics & Chemistry', 'English'], spec: 'Specialist', stamp: 'VERIFIED',
    topics: ['Algebra · Geometry', 'Electricity · Chemistry', 'Grammar · Speaking'], cardLevel: 'Form 4 · O Level',
    report: 'MONTHLY REPORT', rows: ['Sessions held', 'Work covered', 'Progress'],
    covered: ['Equations, Thales', 'Ohm\'s law', 'Present perfect'],
    pay: 'Monthly payment', confirm: 'Confirm', paid: 'Payment complete',
    payRows: [['To', 'TutorLab'], ['Payment', 'monthly'], ['Price', 'one price'], ['Hidden fees', 'none'], ['Method', 'Mobile Money']],
    keyboard: ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'],
  },
};
