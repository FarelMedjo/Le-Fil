# TutorLab — « Exercice 3 » : scénario, découpage et conception sonore

Spot de 60 secondes, 9:16, 1080 × 1920, 30 i/s, sans voix off. Grille musicale : 120 BPM (1 temps = 0,5 s = 15 images), mesure de 12/8 : chaque temps se divise en trois croches de 5 images.

Ce document remplace le découpage du premier montage (« Le Fil »). Les promesses, les textes du flyer, les numéros, la palette et les polices restent ceux de la charte ; le récit, la mise en scène et le son sont refaits.

## 1. L'idée

**Un seul plan-séquence, en plongée, au-dessus de la table familiale.** La caméra ne quitte jamais cette table. Elle glisse, tourne et plonge d'un rectangle à l'autre : la page du cahier de l'enfant, l'écran du téléphone du parent, les fiches des répétiteurs, puis le logo. À chaque fois, le rectangle vient remplir le cadre vertical : l'écran du spectateur *devient* la page, puis *devient* le téléphone.

**L'orientation du cadre dit à qui appartient le monde.** L'enfant est assise en bas de la table, le parent en face. Quand on passe de la page au téléphone, la caméra pivote d'un demi-tour : on adopte le point de vue du parent. Quand on revient au cahier, elle pivote dans l'autre sens.

**Une image qui porte le film : le trou dans la page.** À force de gommer la même ligne, l'enfant perce son cahier. Le répétiteur ne la gronde pas : il pose un morceau de scotch sur le trou, et c'est *sur le scotch* qu'elle écrit la bonne réponse. Réparer, puis repartir : tout le service tient dans ce geste.

**Le numérique sort du téléphone.** Les fiches des trois spécialistes s'envolent de l'écran et atterrissent sur la table, tamponnées « vérifié ». Le bilan du mois glisse sur le cahier. Le service est concret, il se pose sur la table de la famille.

**Le lime de TutorLab est un surligneur.** La couleur réservée de la charte devient un objet de la trousse : le surligneur fluo. Il marque ce qui compte (« un spécialiste par matière », la bonne réponse « x = 6 », « réussite », les numéros).

**La fin referme la boucle.** La pièce s'éteint, seul reste le cahier ouvert. Ses deux pages se redressent et deviennent les deux pages du logo TutorLab ; la tache de surligneur de « x = 6 » s'envole et devient le point lime au-dessus du livre. La réussite de l'enfant est le point du logo.

## 2. Le cadre de vie

- **La table** : toile cirée à motifs wax (indigo, ocre, terracotta), comme dans beaucoup de salons de Yaoundé. Verre d'eau, trousse en pagne, manuel de maths ; la lumière chaude d'une lampe, hors champ.
- **Le cahier** : cahier à grands carreaux (réglure Seyès, marge rouge), écriture cursive scolaire au crayon.
- **Les personnages ne sont vus que par leurs mains**, ce qui évite toute ressemblance avec une personne réelle et rend le film universel :
  - l'élève, en classe de 3e, manche de la tenue kaki ;
  - le parent, manche en pagne wax ;
  - le répétiteur de maths, jeune, manchette bleue et montre ; le répétiteur de physique-chimie, plus âgé, manche grise et alliance ; la répétitrice d'anglais, manche wax et bracelets ; puis la remplaçante d'anglais.
- **Le téléphone** est un Android générique, clavier AZERTY (QWERTY dans la version anglaise). Aucune interface ni aucun logo d'application ou d'opérateur n'est reproduit : la discussion, l'appel et le paiement sont des écrans génériques. TutorLab y apparaît avec son propre logo.
- **Les matières** : Mathématiques, Physique-Chimie, Anglais, cohérentes avec une élève de 3e qui prépare le BEPC.

## 3. Structure

| Acte | Temps | Mesures | Ce qu'on comprend | Musique |
| --- | --- | --- | --- | --- |
| I. Le blocage | 0:00 → 0:08 | 1 → 4 | L'exercice ne passe pas ; la page se perce. Le parent pose sa main sur celle de l'enfant. | Silence, horloge, grillons. Une note de balafon quand la main du parent arrive. |
| II. La demande | 0:08 → 0:16 | 5 → 8 | Un message ; l'entretien de cadrage sous 48 h. | Le groove s'installe. |
| III. L'équipe | 0:16 → 0:24 | 9 → 12 | Trois spécialistes, un par matière, vérifiés. | Groove plein. |
| IV. Le déclic | 0:24 → 0:32 | 13 → 16 | Séance d'essai à domicile ; le trou réparé ; « x = 6 ». | Coupure, suspension, puis tout revient. |
| V. Le suivi | 0:32 → 0:48 | 17 → 24 | Un mois de séances, le bilan écrit, le remplacement garanti, le paiement. | Groove plein, une voix disparaît puis revient. |
| VI. La signature | 0:48 → 1:00 | 25 → 30 | Le cahier devient le logo ; slogan ; contact. | Demi-temps de silence, final, logo sonore. |

## 4. Découpage plan par plan

Les temps sont ceux de la feuille de synchronisation (`src/timeline.js`). « Caméra » décrit la caméra unique au-dessus de la table : centre, zoom (en pixels par millimètre de table) et rotation.

### Séquence 1 — L'exercice 3 (0:00 → 0:05)

- **Caméra** : très près de la page (9 px/mm), réglure Seyès plein cadre, lumière chaude de la lampe venant d'en haut à gauche. Léger flottement, comme une caméra tenue.
- **Action** : sur la page, déjà écrits : « Exercice 2 », réussi, puis « Exercice 3 — 2x + 5 = 17 » ; sur la page de gauche, la leçon. La main de l'élève entre et écrit « 2x = 17 + 5 ». Le crayon s'arrête, tapote deux fois la feuille. La main gauche arrive avec une gomme et frotte quatre fois, de plus en plus fort ; à 0:04,0 le papier cède : un trou.
- **Texte** : T0 « Une matière qui bloque ? » (0:01,0 → 0:04,6).
- **Son** : ambiance du soir (pièce, grillons lointains), tic-tac d'une horloge à chaque seconde, graphite dont le grain suit exactement la vitesse de la mine, deux tapotements, quatre allers-retours de gomme, déchirure sèche, puis un temps de silence. La gomme tombe sur la table.

### Séquence 2 — La main du parent (0:05 → 0:08)

- **Caméra** (0:05,0 → 0:05,65) : recul (de 9 à 2,7 px/mm) qui découvre la table : le cahier ouvert, le verre, la trousse, le manuel, le téléphone du parent posé de son côté.
- **Action** : la main du parent entre par le haut du cadre et se pose sur la main de l'enfant (0:06,0). Un temps : elle serre doucement (0:06,5). Puis elle va prendre le téléphone (0:07,0 → 0:07,45) ; l'écran s'allume à son contact, et c'est cette même main qui le tient, par en dessous, pendant toute la discussion.
- **Caméra** (0:07,05 → 0:08,35) : la caméra pivote d'environ 170° en plongeant vers le téléphone, jusqu'à ce que l'écran remplisse le cadre : on passe dans le monde du parent.
- **Son** : frottement de tissu, la main qui se pose ; le téléphone qui glisse sur la toile cirée. **Musique** : à 0:06,0 une note grave de balafon, une nappe qui s'ouvre ; à 0:07,0, trois notes qui montent.

### Séquence 3 — 01 · Votre demande (0:08 → 0:12)

- **Écran** : discussion avec TutorLab (21:04). Pendant la frappe, la caméra se rapproche du champ de saisie et du clavier (0:08,55 → 0:09,15) : le message s'écrit lettre à lettre, chaque touche du clavier AZERTY s'allume : « Bonsoir, ma fille est en 3e et elle bloque en maths. Vous pouvez nous aider ? ». Envoi (0:09,75), recul. « écrit… », puis la réponse, le soir même (21:06) : « Bonsoir ! Nous vous appelons sous 48 h pour l'entretien de cadrage. »
- **Texte** : T1 « 01 · Votre demande — WhatsApp ou appel » (0:08,25 → 0:11,5).
- **Son** : frappes du clavier (le message défile en accéléré : un clic tous les trois caractères) ; envoi ; réception. **Musique** : la trousse (shaker) et l'ostinato de balafon entrent, doucement.

### Séquence 4 — 02 · Entretien de cadrage (0:12 → 0:16)

- **Écran** : le lendemain (« Mercredi », 08:40), appel entrant « TutorLab — Entretien de cadrage ». La sonnerie *est* le motif de balafon. Décroché à 0:13,0 : le chronomètre part de 00:00 et file en accéléré ; une fiche « Votre demande » se remplit, un champ par temps : Classe 3e · Matières Maths, Physique-Chimie, Anglais · Objectif BEPC · Disponibilités mer. 16 h, sam. 10 h. Elle part (« Envoyée ✓ », 0:15,1) ; quelques jours plus tard, « Votre proposition » (0:15,5).
- **Texte** : T2 « 02 · Entretien de cadrage sous 48 h » (0:12,0 → 0:15,75).
- **Son** : sonnerie-balafon, décroché, quatre coches. **Musique** : basse et pulsation (main à plat sur la table) entrent à 0:12,0.

### Séquence 5 — 03 · Un spécialiste par matière (0:16 → 0:24)

- **Action** : à 0:16,0 les trois fiches se soulèvent de l'écran, grandissent (elles montent vers la caméra, au-dessus du téléphone) et s'envolent. La caméra recule et pivote à nouveau vers le point de vue de l'enfant ; les fiches atterrissent sur la table, une par temps (0:16,5 · 0:17,0 · 0:17,5) : Mathématiques, Physique-Chimie, Anglais, chacune avec le portrait illustré du spécialiste, ce qu'il couvre (« Algèbre · Géométrie »…) et le niveau (« 3e · BEPC »). Le parent repose le téléphone (0:17,7 → 0:18,5) ; la caméra pousse lentement sur les fiches.
- Puis la vérification : un tampon « VÉRIFIÉ » frappe chaque fiche, et la liste Identité · Parcours · Références · Entretien se coche, un élément par temps (0:20,5 → 0:22,0).
- À 0:22,5, la fiche de maths s'entoure de lime : c'est ce spécialiste qui vient.
- **Textes** : T3 « 03 · Proposition sous 7 jours : un spécialiste par matière » (0:16,3 → 0:20,0), surligné sur « un spécialiste par matière » ; T3c « Répétiteurs vérifiés » et sa liste (0:20,0 → 0:23,75).
- **Son** : souffle de papier, trois claquements de fiches sur la table, trois tampons, quatre coches. **Musique** : groove complet à 0:16,0 (règle claquée sur les temps 2 et 4), mélodie de balafon.

### Séquence 6 — 04 · Séance d'essai (0:24 → 0:32)

- **Caméra** : retour au cahier, point de vue de l'enfant, cadré sur le trou.
- **Action** : on frappe à la porte (hors champ, 0:24,0 et 0:24,25), une porte grince, une chaise. La gomme est poussée de côté. À 0:25,35 la main du répétiteur de maths entre avec un morceau de scotch (on l'a entendu se dérouler et se déchirer), le pose sur le trou (0:26,5) et le lisse du plat des doigts : les miettes de gomme disparaissent. Il écrit au stylo bleu « | −5 » au bout de l'égalité (0:27,5), puis se retire : l'élève continue seule. Elle écrit **sur le scotch** « 12 » (0:28,5) — la ligne devient « 2x = 12 » — puis, dessous, « x = 6 » (0:29,45). Tout se tait (0:29,5). À 0:30,0 le répétiteur revient avec le surligneur et le passe sur « x = 6 », dans le silence. La caméra recule pour montrer les deux bras ; à 0:31,0, check des poings entre l'élève et le répétiteur.
- **Texte** : T4 « 04 · Séance d'essai à domicile, avant tout engagement de longue durée » (0:24,5 → 0:29,25). Rien pendant le déclic : l'image parle seule.
- **Son** : toc-toc, grincement, chaise ; scotch qui se déroule (crépitement collant), qui se déchire, qu'on lisse ; stylo bille, plus lisse que le crayon ; crayon de l'élève. **Musique** : coupée à 0:24,0 sauf la nappe et un ostinato discret, puis **silence total à 0:29,5** : on n'entend que le crayon, puis le surligneur. À 0:30,33, le trait fini, tout revient avec la mélodie : c'est le moment émotionnel du film.

### Séquence 7 — 05 · Le suivi du mois (0:32 → 0:40)

- **Action** : la caméra s'élève. Un mois passe en accéléré : la lumière tourne du soir au jour et revient, les pages se tournent (0:32,2 · 0:33,2 · 0:34,2), chacune datée (mar. 4, jeu. 13, sam. 22), et à chaque page une autre main de spécialiste écrit un titre souligné : physique-chimie (loi d'Ohm, un circuit), anglais (« I have lived in Yaoundé since 2015. »), maths (Thalès) ; sa fiche s'entoure de lime pendant qu'il écrit. À 0:35,95, la feuille « Bilan du mois » glisse sur le cahier : séances réalisées (une coche par séance), travail couvert, progression dessinée au surligneur, sans aucune note chiffrée. Tampon à 0:38,0.
- **Texte** : T5b « 05 · Un bilan écrit chaque mois » (0:36,5 → 0:39,6).
- **Son** : feuilletages sur les temps, stylos, glissement de la feuille, coches, surligneur, tampon.

### Séquence 8 — Remplacement garanti (0:40 → 0:45,5)

- **Action** : la fiche d'anglais se ternit (0:40,0) et glisse hors de la table (0:40,3). À 0:42,0 une nouvelle fiche d'anglais arrive à sa place, se pose (0:42,5) et reçoit le tampon « VÉRIFIÉ » (0:43,0).
- **Textes** : T5c « Indisponibilité ou insatisfaction ? » (0:39,6 → 0:41,6) ; T5d « Remplacement garanti — un autre spécialiste vous est proposé » (0:41,6 → 0:45,0), « garanti » surligné à 0:42,2.
- **Musique** : la mélodie de balafon disparaît avec la fiche et revient avec la nouvelle : le remplacement s'entend.

### Séquence 9 — Paiement (0:44 → 0:48)

- **Caméra** : la main du parent reprend le téléphone (0:44,0) ; demi-tour, plongée dans l'écran.
- **Écran** : « Paiement mensuel » générique, avec un récapitulatif qui ne reprend que les promesses du flyer : À TutorLab · Paiement mensuel · Tarif prix unique · Frais cachés aucun · Moyen Mobile Money. Le pouce du parent appuie sur « Confirmer » (0:46,25) ; le bouton devient une coche verte #4ADE80 (0:46,5). Aucun logo d'opérateur.
- **Texte** : T6 « Paiement mensuel — MTN MoMo · Orange Money — prix unique, sans frais cachés » (0:45,0 → 0:49,3).
- **Son** : toucher d'écran, deux verres frappés au crayon (la, puis ré). Groove allégé.

### Séquence 10 — La signature (0:48 → 1:00)

- **Caméra** : recul du téléphone vers la table, retour au point de vue de l'enfant, au-dessus du cahier ouvert (0:47,85 → 0:48,55).
- **Action** : le bilan quitte le cahier, le parent repose le téléphone (0:48,0) ; on feuillette en arrière jusqu'à la page de l'exercice 3 et son « x = 6 » surligné (0:48,6 → 0:49,05). À 0:49,0 la pièce s'éteint ; tout disparaît dans le bleu profond #05070F sauf le cahier. Les deux pages se redressent et deviennent les deux pages du logo ; la tache lime de « x = 6 » se resserre, s'envole et devient le point du logo (0:49,55 → 0:50,45), qui respire ensuite doucement, sur la mesure.
- **Textes** : T7 « Un spécialiste par matière. » (0:50,3 → 0:54,5), T7b « Une équipe pour la réussite de votre enfant. » (0:51,0 → 0:54,5), « réussite » surligné à 0:51,9. À 0:54,5, le logo rejoint sa place en bas et le mot TutorLab se déploie ; T8 « Demandez un répétiteur », puis 620 27 39 65 (0:55,5) et 689 39 47 63 (0:56,0) en JetBrains Mono lime, « WhatsApp & appels · Yaoundé », « Réponse sous 48 h » (0:56,5). Les numéros restent à l'écran jusqu'à la fin (4,5 s et 4 s ; 8,5 s et 8 s dans la variante 64 s).
- **Son** : pages feuilletées, la pièce s'éteint (interrupteur de la lampe), demi-temps de silence à 0:49,5, glissando de graphite qui monte pendant la métamorphose. **Musique** : final plus clair à 0:50,0 ; logo sonore à 0:54,5, seul (la mélodie s'est tue à 0:54) ; accord final et cloche à 0:58,0 ; la cloche s'éteint sur l'ambiance de la pièce.

## 5. Typographie à l'écran

- Les titres sont posés sur des **bandes de papier adhésif** (masking tape crème, bords déchirés, légère rotation) qui se collent à l'écran. Space Grotesk 700, révélé en cascade (mots qui montent de 110 % à 0, décalage de 60 ms). Le numéro d'étape est une étiquette JetBrains Mono, crème sur encre. Dans « 48 h » et « 7 jours », seul le nombre passe en JetBrains Mono, suivi d'une espace fine.
- Le **surligneur lime** passe derrière les mots qui portent un engagement. Le lime n'apparaît nulle part ailleurs : ni dans les écrans du téléphone, ni sur les étiquettes, ni sur les coches.
- Taille minimale : 64 px pour les titres, 44 px pour les sous-titres, sur un cadre de 1080 px. Marges de 10 % (zones de WhatsApp et Facebook).
- Durée d'affichage : au moins 1 s + 0,3 s par mot pour chaque carton.
- Le carton final abandonne les bandes : blanc et lime sur bleu profond, comme la charte.

## 6. Musique : un bikutsi joué avec la trousse

Le bikutsi est la musique de Yaoundé : un 12/8 rapide, porté par le balafon. La bande-son en reprend l'esprit avec les objets de la table :

| Couche | Matière | Rôle |
| --- | --- | --- |
| Balafon | Lames de bois, résonateurs en calebasse avec leur bourdonnement | Ostinato en croches de 12/8, mélodie, logo sonore |
| Pulsation | Main à plat sur la table | Chaque temps |
| Claquement | Règle plate claquée sur la table | Temps 2 et 4 |
| Trousse | Trousse en pagne secouée (modèle de grains) | Toutes les croches |
| Basse | Corde grave, harmoniques pour les petits haut-parleurs | Fondamentales |
| Nappe | Verre chanté, accord ouvert | Émotion, suspension |

Tonalité de ré majeur (pentatonique), comme la charte sonore précédente. Le logo sonore : cinq notes de balafon qui montent (ré, fa dièse, la, si, ré), jouées en triolets.

## 7. Bruitages

Tous les bruitages sont synthétisés à partir de modèles physiques simples, calés à l'image près. Le crayon et le stylo ne sont pas des boucles : leur grain est calculé à partir de la vitesse réelle de la mine dans l'animation (levers de crayon compris), si bien que le son écrit vraiment les lettres qu'on voit.

Ambiance du soir (pièce, grillons lointains), horloge, crayon, gomme, déchirure, chute de gomme, main qui se pose, téléphone qui glisse, clavier, envoi, réception, décroché, coches, souffle de papier, fiches qui claquent, tampons, toc-toc, porte, chaise, scotch (déroulé, déchiré, lissé), stylo bille, surligneur, check des poings, feuilletages, feuille qui glisse, pouce sur l'écran, verres, interrupteur, cloche.

## 8. Points à valider

- Les trois matières montrées (Maths, Physique-Chimie, Anglais) et le niveau (3e, BEPC).
- T5c « Indisponibilité ou insatisfaction ? » : texte repris du document de production ; vérifier que le flyer couvre bien le cas de l'insatisfaction.
- Le message du parent et la réponse de TutorLab, qui reprennent le vocabulaire du flyer.
- La musique d'inspiration bikutsi, à faire jouer par un balafoniste pour la version finale.
