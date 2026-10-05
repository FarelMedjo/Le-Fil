// Constantes du film et feuille de synchronisation (section 6 du document de production).
// Les impacts sonores sont attachés à l'image ; le fond sonore est calé sur la grille de 96 BPM.

export const FPS = 30;
export const BPM = 96;
export const BEAT = 60 / BPM; // 0,625 s
export const DURATION = 60; // 96 temps exactement
export const FRAMES = DURATION * FPS; // 1800
export const W = 1080;
export const H = 1920;

export const COLORS = {
  cream: '#FAFAF7',
  paper: '#FDFDFB',
  ink: '#0B0E1A',
  deep: '#05070F',
  lime: '#C8FF3E',
  ok: '#4ADE80',
  grey: '#5B6272',
  mist: '#C9CEDA',
  white: '#F5F7FC',
};

// "0:41,875" -> 41.875
export const tc = (s) => {
  const [m, rest] = s.split(':');
  return Number(m) * 60 + Number(rest.replace(',', '.'));
};
export const frameOf = (sec) => Math.round(sec * FPS);
export const timecode = (frame) => {
  const s = frame / FPS;
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, '0').replace('.', ',')}`;
};

// Les huit plans (section 4).
export const PLANS = [
  { id: 0, from: 0, to: 4, name: 'La ligne qui hésite' },
  { id: 1, from: 4, to: 10, name: '01 · Votre demande' },
  { id: 2, from: 10, to: 17, name: '02 · Entretien de cadrage' },
  { id: 3, from: 17, to: 27, name: '03 · Un spécialiste par matière' },
  { id: 4, from: 27, to: 35, name: '04 · Séance d\'essai' },
  { id: 5, from: 35, to: 45, name: '05 · Suivi mensuel et remplacement' },
  { id: 6, from: 45, to: 50, name: 'Paiement' },
  { id: 7, from: 50, to: 60, name: 'La Trajectoire' },
];

// Feuille de synchronisation : [temps, image, animation et texte, bruitage, fond sonore].
export const SYNC = [
  ['0:00,0', 0, 'Fondu d\'ouverture sur la page de cahier', '—', 'Ambiance de pièce seule'],
  ['0:00,3', 9, 'La ligne démarre en bas à gauche', 'Graphite −5 demi-tons, montant', '—'],
  ['0:00,6', 18, 'T0 « Une matière qui bloque ? » en cascade', '—', '—'],
  ['0:01,875', 56, 'La ligne cale', 'Arrêt net, 6 images de silence', '—'],
  ['0:02,1', 63, 'La ligne redescend', 'Graphite descendant, court', '—'],
  ['0:02,5', 75, 'Gomme, aller', 'Gomme 1', '—'],
  ['0:03,125', 94, 'Gomme, retour', 'Gomme 2', '—'],
  ['0:03,75', 113, 'Début du recul caméra', '—', 'Pulsation entre, très basse'],
  ['0:04,375', 131, 'La ligne quitte le cahier', 'Glissé sur bois jusqu\'à 0:05,6', '—'],
  ['0:05,625', 169, 'La ligne entre dans le téléphone', 'Fin du glissé', '—'],
  ['0:06,25', 188, 'Bulle ; T1 « 01 · Votre demande »', 'Clic de capuchon', '—'],
  ['0:07,5', 225, 'Envoi de la bulle', 'Feuilletage bref (départ image 219)', '—'],
  ['0:09,375', 281, 'La ligne sort par le haut', 'Graphite montant, discret', '—'],
  ['0:10,0', 300, 'Début du cercle autour de « 48 h »', 'Rotation de compas', 'Trousse entre ; nappe entre sur une note grave'],
  ['0:11,25', 338, 'Cercle fermé ; T2 « 02 · Entretien de cadrage »', 'Clic de compas', '—'],
  ['0:13,125', 394, 'Étiquette « Classe »', 'Tapotement 1', '—'],
  ['0:13,75', 413, 'Étiquette « Matières »', 'Tapotement 2', '—'],
  ['0:14,375', 431, 'Étiquette « Objectifs »', 'Tapotement 3', '—'],
  ['0:15,0', 450, 'Étiquette « Disponibilités »', 'Tapotement 4', '—'],
  ['0:16,25', 488, 'La ligne se tend vers le haut', 'Graphite tendu, aigu', 'La nappe monte sur un temps'],
  ['0:17,5', 525, 'Division en trois fils ; T3 « 03 · Sous 7 jours… »', 'Twang triple', 'Nappe en trois sons ; pulsation et trousse pleines'],
  ['0:18,125', 544, 'Fil 1 : « Mathématiques »', 'Timbre crayon', '—'],
  ['0:18,75', 563, 'Fil 2 : « Anglais »', 'Timbre craie', '—'],
  ['0:19,375', 581, 'Fil 3 : « Physics »', 'Timbre feutre', '—'],
  ['0:21,875', 656, 'T3c « Répétiteurs vérifiés »', '—', '—'],
  ['0:23,75', 713, 'Coche « Identité »', 'Coche 1', '—'],
  ['0:24,375', 731, 'Coche « Parcours »', 'Coche 2', '—'],
  ['0:25,0', 750, 'Coche « Références »', 'Coche 3', '—'],
  ['0:25,625', 769, 'Coche « Entretien »', 'Coche 4', '—'],
  ['0:26,875', 806, 'Un fil dessine la maison', 'Graphite neutre jusqu\'à 0:28,1', 'Pulsation allégée, trousse coupée'],
  ['0:28,75', 863, 'Ombre derrière la porte', 'Toc 1', '—'],
  ['0:29,06', 872, '—', 'Toc 2', '—'],
  ['0:29,375', 881, 'Porte ouverte ; T4 « 04 · Séance d\'essai… »', 'Grincement très léger', '—'],
  ['0:30,0', 900, 'Installation à la table', 'Chaise', '—'],
  ['0:31,0', 930, '—', '—', 'Pulsation coupée ; nappe seule'],
  ['0:31,25', 938, 'Le crayon de l\'enfant reprend la ligne', 'Graphite, hauteur d\'origine', '—'],
  ['0:32,3', 969, 'Approche du point de blocage', 'Graphite s\'amincit', 'La nappe baisse'],
  ['0:32,5', 975, 'Franchissement', 'Graphite +2 demi-tons, traîne de réverbération', 'Tout revient ; nappe un ton plus haut'],
  ['0:34,375', 1031, 'La ligne monte vers le calendrier', 'Graphite montant', '—'],
  ['0:35,0', 1050, 'Calendrier, semaine 1', 'Feuilletage 1', '—'],
  ['0:35,625', 1069, 'Semaine 2', 'Feuilletage 2', '—'],
  ['0:36,25', 1088, 'Semaine 3', 'Feuilletage 3', '—'],
  ['0:36,875', 1106, 'Semaine 4', 'Feuilletage 4', '—'],
  ['0:37,5', 1125, 'Feuille « Bilan du mois » ; libellés T5', 'Glissement de papier', '—'],
  ['0:38,75', 1163, 'Coup de tampon ; T5b « 05 · Un bilan écrit chaque mois »', 'Tampon', '—'],
  ['0:40,0', 1200, 'Un fil s\'estompe ; T5c « Indisponibilité ou insatisfaction ? »', 'Gomme douce', 'Un son de la nappe disparaît'],
  ['0:41,875', 1256, 'Nouveau fil raccordé ; T5d « Remplacement garanti… »', 'Agrafeuse', 'Le son de la nappe revient'],
  ['0:43,75', 1313, 'La ligne file vers le téléphone', 'Graphite discret', 'Pulsation allégée'],
  ['0:45,0', 1350, 'Écran du téléphone', '—', 'Nappe basse'],
  ['0:45,3', 1359, 'T6 « Paiement mensuel… »', '—', '—'],
  ['0:46,25', 1388, 'Coche verte', 'Carillon 1', '—'],
  ['0:46,875', 1406, '—', 'Carillon 2', '—'],
  ['0:49,375', 1481, 'La page se retourne', 'Feuilletage large (départ image 1475)', '—'],
  ['0:49,7', 1491, '—', '—', 'Fond coupé : demi-seconde de silence'],
  ['0:50,0', 1500, 'Fond sombre, grille ; tressage des fils', 'Convergence des trois timbres', '—'],
  ['0:50,3', 1509, 'Tracé de la Trajectoire pleine largeur', 'Glissando de graphite', '—'],
  ['0:50,625', 1519, 'Pastille 01', 'Capuchon', '—'],
  ['0:50,94', 1528, 'Pastille 02', 'Compas', '—'],
  ['0:51,25', 1538, 'Pastille 03', 'Twang', '—'],
  ['0:51,56', 1547, 'Pastille 04', 'Toc', '—'],
  ['0:51,875', 1556, 'Pastille 05', 'Tampon', '—'],
  ['0:52,5', 1575, 'T7 « Un spécialiste par matière. »', 'Accord de résolution', 'Pulsation, trousse et nappe reviennent, plus claires'],
  ['0:53,4', 1602, 'T7b « Une équipe pour la réussite de votre enfant. »', '—', '—'],
  ['0:54,4', 1632, 'Soulignement de « réussite »', 'Graphite court montant', '—'],
  ['0:56,875', 1706, 'T8 « Demandez un répétiteur »', '—', '—'],
  ['0:57,5', 1725, 'Numéro 620 27 39 65', 'Tapotement feutré', '—'],
  ['0:58,125', 1744, 'Numéro 689 39 47 63', 'Tapotement feutré', '—'],
  ['0:58,75', 1763, 'Logo TutorLab ; « Réponse sous 48 h »', 'Cloche à main', 'Tout s\'arrête sur la cloche'],
  ['1:00,0', 1800, 'Fin', 'Ambiance seule, fondu', '—'],
].map(([time, frame, anim, sfx, bed]) => ({ time, t: tc(time), frame, anim, sfx, bed }));

// Temps exact (grille) d'un point de synchronisation, par son image.
export const at = (frame) => {
  const row = SYNC.find((r) => r.frame === frame);
  if (!row) throw new Error(`Image ${frame} absente de la feuille de synchronisation`);
  return row.t;
};
