// Constantes du film et feuille de synchronisation (SCENARIO.md, section 4).
// 120 BPM : 1 temps = 0,5 s = 15 images ; mesure de 12/8, chaque temps se divise en trois croches de 5 images.
// Les bruitages sont attachés à l'image ; la musique est calée sur la grille.

export const FPS = 30;
export const BPM = 120;
export const BEAT = 60 / BPM; // 0,5 s
export const DURATION = 60; // 120 temps, 30 mesures
export const FRAMES = DURATION * FPS; // 1800
export const W = 1080;
export const H = 1920;

export const COLORS = {
  cream: '#FAFAF7',
  ink: '#0B0E1A',
  deep: '#05070F',
  lime: '#C8FF3E',
  ok: '#4ADE80',
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

// Les dix séquences.
export const PLANS = [
  { id: 1, from: 0, to: 5, name: 'L\'exercice 3' },
  { id: 2, from: 5, to: 8, name: 'La main du parent' },
  { id: 3, from: 8, to: 12, name: '01 · Votre demande' },
  { id: 4, from: 12, to: 16, name: '02 · Entretien de cadrage' },
  { id: 5, from: 16, to: 24, name: '03 · Un spécialiste par matière' },
  { id: 6, from: 24, to: 32, name: '04 · Séance d\'essai' },
  { id: 7, from: 32, to: 40, name: '05 · Le suivi du mois' },
  { id: 8, from: 40, to: 44, name: 'Remplacement garanti' },
  { id: 9, from: 44, to: 48, name: 'Paiement' },
  { id: 10, from: 48, to: 60, name: 'La signature' },
];

// Feuille de synchronisation : [temps, animation et texte, bruitage, musique].
export const SYNC = [
  ['0:00,0', 'Ouverture : la page du cahier, très près', 'Ambiance du soir, grillons ; horloge à chaque seconde', '—'],
  ['0:00,3', 'La main de l\'élève entre', 'Frottement de manche', '—'],
  ['0:00,6', 'Elle écrit « 2x = 17 + 5 »', 'Crayon, piloté par la vitesse de la mine', '—'],
  ['0:01,0', 'T0 « Une matière qui bloque ? »', 'Bande collée', '—'],
  ['0:02,0', 'Le crayon tapote la feuille', 'Tapotement 1', '—'],
  ['0:02,5', '—', 'Tapotement 2', '—'],
  ['0:02,72', 'La main gauche arrive avec une gomme', 'Frottement de manche', '—'],
  ['0:03,0', 'La gomme frotte, quatre allers-retours', 'Gomme ×4, sur les croches', '—'],
  ['0:04,0', 'Le papier cède : un trou', 'Déchirure', 'Silence'],
  ['0:04,62', 'La gomme tombe sur la page', 'Chute de la gomme', '—'],
  ['0:05,0', 'Recul : la table, le verre, la trousse, le téléphone', '—', '—'],
  ['0:06,0', 'La main du parent se pose sur celle de l\'élève', 'Main qui se pose', 'Note grave de balafon, nappe'],
  ['0:07,0', 'Elle va vers le téléphone ; la caméra fait demi-tour', '—', 'Trois notes qui montent'],
  ['0:07,45', 'Elle le prend : l\'écran s\'allume, le téléphone monte', 'Téléphone qui glisse ; écran', '—'],
  ['0:08,0', 'L\'écran remplit le cadre : discussion avec TutorLab', '—', 'Trousse et ostinato de balafon entrent'],
  ['0:08,25', 'T1 « 01 · Votre demande » ; le message s\'écrit', 'Frappes du clavier', '—'],
  ['0:08,55', 'La caméra se rapproche du clavier', '—', '—'],
  ['0:09,75', 'Envoi ; recul', 'Envoi', '—'],
  ['0:10,2', '« écrit… »', '—', '—'],
  ['0:10,75', 'Réponse le soir même (21:06) : « … sous 48 h … »', 'Réception', '—'],
  ['0:12,0', 'Le lendemain, appel entrant ; T2 « 02 · Entretien de cadrage sous 48 h »', 'Sonnerie : le motif de balafon', 'Pulsation et basse entrent'],
  ['0:13,0', 'Décroché ; chronomètre ; la fiche « Votre demande »', 'Décroché', '—'],
  ['0:13,25', 'Classe : 3e', 'Coche 1', '—'],
  ['0:13,75', 'Matières', 'Coche 2', '—'],
  ['0:14,25', 'Objectif : BEPC', 'Coche 3', '—'],
  ['0:14,75', 'Disponibilités', 'Coche 4', '—'],
  ['0:15,1', 'Fiche envoyée', 'Envoi', '—'],
  ['0:15,5', '« Votre proposition »', '—', 'Note de réception'],
  ['0:16,0', 'Les trois fiches s\'envolent du téléphone ; demi-tour', 'Souffle de papier', 'Groove complet'],
  ['0:16,3', 'T3 « 03 · Proposition sous 7 jours… »', 'Bandes collées', '—'],
  ['0:16,5', 'Fiche Mathématiques', 'Fiche qui claque', '—'],
  ['0:17,0', 'Fiche Physique-Chimie', 'Fiche qui claque', '—'],
  ['0:17,25', 'Surligneur sur « un spécialiste par matière »', 'Surligneur', '—'],
  ['0:17,5', 'Fiche Anglais', 'Fiche qui claque', '—'],
  ['0:17,7', 'Le parent repose le téléphone ; lente poussée sur les fiches', '—', '—'],
  ['0:20,0', 'T3c « Répétiteurs vérifiés »', 'Bande collée', '—'],
  ['0:20,5', 'Tampon « Vérifié » ; Identité', 'Tampon, coche', '—'],
  ['0:21,0', 'Tampon ; Parcours', 'Tampon, coche', '—'],
  ['0:21,5', 'Tampon ; Références', 'Tampon, coche', '—'],
  ['0:22,0', 'Entretien', 'Coche', '—'],
  ['0:22,5', 'La fiche de maths s\'entoure de lime', '—', '—'],
  ['0:23,5', 'Retour au cahier', '—', '—'],
  ['0:24,0', 'On frappe à la porte', 'Toc 1', 'Coupure : nappe et ostinato seuls'],
  ['0:24,25', '—', 'Toc 2', '—'],
  ['0:24,5', 'T4 « 04 · Séance d\'essai à domicile… »', 'Bandes collées', '—'],
  ['0:24,75', '—', 'Porte qui grince', '—'],
  ['0:25,25', '—', 'Chaise', '—'],
  ['0:25,35', 'La main du répétiteur entre avec un morceau de scotch ; la gomme est poussée', 'Scotch déroulé (0:24,8) et déchiré (0:25,18), hors champ', '—'],
  ['0:26,5', 'Le scotch couvre le trou', 'Scotch posé', '—'],
  ['0:26,8', 'Il le lisse du plat des doigts ; les miettes disparaissent', 'Frottement', '—'],
  ['0:27,5', '« | −5 » au bout de l\'égalité, au stylo bleu', 'Stylo bille', '—'],
  ['0:28,25', 'Le répétiteur se retire', '—', '—'],
  ['0:28,5', 'L\'élève écrit « 12 » sur le scotch', 'Crayon sur scotch', '—'],
  ['0:29,45', '« x = 6 »', 'Crayon', 'Silence total à 0:29,5'],
  ['0:30,0', 'Le répétiteur passe le surligneur sur « x = 6 »', 'Surligneur, dans le silence', '—'],
  ['0:30,33', 'Recul : les deux bras', '—', 'Tout revient, avec la mélodie'],
  ['0:31,0', 'Check des poings', 'Check', '—'],
  ['0:31,6', 'La caméra s\'élève : un mois en accéléré', '—', '—'],
  ['0:32,2', 'Page tournée : physique-chimie (mar. 4)', 'Feuilletage, stylo', '—'],
  ['0:33,2', 'Page tournée : anglais (jeu. 13)', 'Feuilletage, stylo', '—'],
  ['0:34,2', 'Page tournée : maths (sam. 22)', 'Feuilletage, stylo', '—'],
  ['0:35,95', 'Le bilan du mois glisse sur le cahier', 'Feuille qui glisse', '—'],
  ['0:36,5', 'T5b « 05 · Un bilan écrit chaque mois »', 'Feuille posée ; bandes collées', '—'],
  ['0:36,75', 'Séances réalisées, une coche par séance', 'Coches', '—'],
  ['0:37,5', 'Progression, au surligneur', 'Surligneur', '—'],
  ['0:38,0', 'Tampon', 'Tampon', '—'],
  ['0:39,6', 'T5c « Indisponibilité ou insatisfaction ? »', 'Bandes collées', '—'],
  ['0:40,0', 'La fiche d\'anglais se ternit', '—', 'La mélodie s\'arrête'],
  ['0:40,3', 'Elle s\'en va', 'Fiche qui glisse', '—'],
  ['0:41,6', 'T5d « Remplacement garanti »', 'Bandes collées', '—'],
  ['0:41,95', 'Une nouvelle fiche arrive', 'Souffle de papier', '—'],
  ['0:42,0', '—', '—', 'La mélodie revient'],
  ['0:42,2', 'Surligneur sur « garanti »', 'Surligneur', '—'],
  ['0:42,5', 'Elle se pose', 'Fiche qui claque', '—'],
  ['0:43,0', 'Tampon « Vérifié »', 'Tampon', '—'],
  ['0:44,0', 'Le parent reprend le téléphone ; demi-tour', 'Téléphone qui glisse', 'Groove allégé'],
  ['0:45,0', 'Paiement mensuel ; T6', 'Bandes collées', '—'],
  ['0:46,25', 'Le pouce appuie sur « Confirmer »', 'Toucher d\'écran', '—'],
  ['0:46,5', 'Le bouton devient une coche verte', 'Verre 1 (la)', '—'],
  ['0:47,0', '—', 'Verre 2 (ré)', '—'],
  ['0:48,0', 'Le bilan quitte le cahier ; le téléphone est reposé ; retour au-dessus du cahier', 'Feuille et téléphone qui glissent', '—'],
  ['0:48,6', 'On feuillette en arrière jusqu\'à l\'exercice 3', 'Pages ×3', '—'],
  ['0:49,0', 'La lampe s\'éteint ; tout disparaît sauf le cahier', 'Interrupteur', '—'],
  ['0:49,5', 'Le cahier devient le logo ; la tache de « x = 6 » devient le point', 'Glissando de graphite', 'Demi-temps de silence'],
  ['0:50,0', '—', '—', 'Final, plus clair'],
  ['0:50,3', 'T7 « Un spécialiste par matière. »', '—', '—'],
  ['0:51,0', 'T7b « Une équipe pour la réussite de votre enfant. »', '—', '—'],
  ['0:51,9', 'Surligneur sur « réussite »', 'Surligneur', '—'],
  ['0:54,5', 'Le logo rejoint sa place ; TutorLab se déploie', '—', 'Logo sonore'],
  ['0:55,0', 'T8 « Demandez un répétiteur »', '—', '—'],
  ['0:55,5', '620 27 39 65', 'Tapotement', '—'],
  ['0:56,0', '689 39 47 63', 'Tapotement', '—'],
  ['0:56,5', '« Réponse sous 48 h »', '—', '—'],
  ['0:58,0', '—', 'Cloche', 'Accord final : tout s\'arrête'],
  ['1:00,0', 'Fin', 'La cloche s\'éteint sur l\'ambiance', '—'],
].map(([time, anim, sfx, bed]) => ({ time, t: tc(time), frame: frameOf(tc(time)), anim, sfx, bed }));
