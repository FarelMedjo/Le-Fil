# TutorLab — « Exercice 3 »

Spot de 60 secondes destiné aux parents : 9:16, 1080 × 1920, 30 i/s, sans voix off, calé sur une grille de 120 BPM (120 temps exactement). Le scénario, le découpage plan par plan, la typographie, la musique et les bruitages sont décrits dans [`SCENARIO.md`](SCENARIO.md).

Ce dépôt remplace l'animatique « Le Fil » par un film entièrement refait. Le nouveau concept :

- **Un plan-séquence en plongée au-dessus de la table familiale.** La caméra glisse, tourne et plonge d'un rectangle à l'autre : la page du cahier de l'élève, l'écran du téléphone du parent, les fiches des répétiteurs. L'écran du spectateur devient tour à tour la page et le téléphone ; quand on passe du monde de l'enfant à celui du parent, le cadre fait un demi-tour.
- **Un récit avec une image forte.** L'élève gomme tant qu'elle perce sa page. Le répétiteur pose un morceau de scotch sur le trou, et c'est sur le scotch qu'elle écrit le bon résultat, « 12 », avant « x = 6 ».
- **Le lime de la charte devient un surligneur**, qui marque chaque engagement. À la fin, le cahier se redresse et devient le pictogramme du logo ; la tache de surligneur de « x = 6 » devient le point lime.
- **Une écriture manuscrite vivante** (polices à trait unique), dont le son est calculé à partir de la vitesse réelle de la mine.
- **Une musique d'inspiration bikutsi**, la musique de Yaoundé, jouée au balafon et avec les objets de la table.

Les promesses, les numéros, la palette, les polices et le logo restent ceux de la charte et du flyer.

## Démarrer

```bash
npm install          # Playwright pour le rendu (Chromium et ffmpeg doivent être installés)
npm run audio        # bande-son des trois versions dans out/audio/ (environ 30 s)
npm run dev          # aperçu sur http://localhost:5173
```

L'aperçu lit le film avec le son et affiche, image par image, la ligne correspondante de la feuille de synchronisation. Cliquer une ligne amène à son image. Deux menus choisissent la version (master 60 s, version courte 30 s, variante 64 s) et le format (9:16 ou 16:9).

| Touche | Action |
| --- | --- |
| Espace | Lecture / pause |
| ← / → | Image précédente / suivante |
| Maj + ← / → | Temps précédent / suivant (grille de 120 BPM) |

Les options de l'aperçu affichent la version anglaise, masquent les textes ou montrent les zones sûres à 10 % des bords.

## Exporter

| Commande | Fichier produit | Usage |
| --- | --- | --- |
| `npm run render` | `out/exercice-3-fr-1080x1920.mp4` | Master : archive, Facebook, TikTok |
| `npm run render:light` | `out/exercice-3-fr-720x1280.mp4` | Diffusion légère : WhatsApp |
| `npm run render:en` | `out/exercice-3-en-1080x1920.mp4` | Version anglaise (après `npm run audio:en`) |
| `npm run render:30s` | `out/exercice-3-fr-30s-720x1280.mp4` | Version courte 30 s : statuts WhatsApp, publicité |
| `npm run render:64s` | `out/exercice-3-fr-64s-1080x1920.mp4` | Variante 64 s : le contact reste plus longtemps à l'écran |
| `npm run render:16x9` | `out/exercice-3-fr-1920x1080.mp4` | Adaptation 16:9 : Facebook, YouTube, écran en agence |
| `node scripts/render.mjs --no-text` | `out/exercice-3-fr-sans-texte-1080x1920.mp4` | Export sans texte incrusté |
| `npm run stills` | `out/stills/…/f0000.png` | Images-clés pour relecture |

Options : `--cut master|30s|64s`, `--format 9:16|16:9`, `--lang fr|en`, `--size 1080x1920|720x1280|1920x1080`, `--no-text`, `--no-audio`, `--png` (images sans perte, plus lent), `--jobs 4`, `--from` / `--to` (numéros d'image), `--stills 27,195,534`. Elles se combinent : `--cut 30s --format 16:9 --lang en` donne la version courte anglaise en 16:9.

Le master se rend en 13 minutes environ sur 4 cœurs. Vidéo H.264, son AAC stéréo 48 kHz à −14 LUFS intégrés ; la bande-son est limitée à −2,3 dBTP en crête réelle ; l'encodeur AAC peut encore la faire dépasser, alors l'export mesure la crête réelle du MP4 et, au-delà de −1 dBTP, réencode le son quelques dixièmes de dB plus bas ; 6 Mb/s au plus et AAC 192 kb/s pour le master, la variante 64 s et le 16:9 ; 1,5 Mb/s et AAC 128 kb/s pour les exports 720 × 1280.

## Les versions

Chaque version est un montage du master, décrit dans `src/cuts.js` : une suite de segments (« à tel instant de la version, montrer le master à partir de tel instant »). Les coupes tombent sur un temps de la grille, et à la même place dans la mesure de 2 s, dans le master comme dans la version : la musique garde sa pulsation et ses premiers temps. Le son d'une version est remonté à partir des pistes du master, segment par segment, avec un fondu enchaîné à puissance constante à chaque coupe (24 ms pour la musique et l'ambiance, 3 ms pour les bruitages) ; pas de fondu dans la tenue de la variante 64 s, où le son continue en temps réel. Les sons des textes à l'écran (bandes collées, étiquettes, surligneur) sont posés aux instants de la version.

### Version courte 30 s

| Segment | Version | Master | Textes |
| --- | --- | --- | --- |
| Le blocage | 0:00 → 0:05 | 0:00 → 0:05 | T0 |
| La demande | 0:05 → 0:09,5 | 0:07 → 0:11,5 | T1 |
| L'équipe | 0:09,5 → 0:14 | 0:15,5 → 0:20 | T3 (étape 02) |
| Le déclic | 0:14 → 0:19,5 | 0:26 → 0:31,5 | T4 raccourci (étape 03) |
| Le bilan | 0:19,5 → 0:22 | 0:35,5 → 0:38 | T5b (étape 04) |
| La signature | 0:22 → 0:30 | 0:52 → 1:00 | T7, T8, mention du paiement en petit |

L'entretien de cadrage, la liste des vérifications, le remplacement et l'écran de paiement restent dans le master ; les étapes sont renumérotées (01 à 04). Pendant le déclic, la séance d'essai ne garde que « Séance d'essai à domicile » et sort avant le « 12 » : l'image parle seule, comme dans le master. Le bilan devient « Un bilan écrit mensuel », la formulation du flyer, en 4 mots. Le slogan T7b n'a pas la place de tenir son temps de lecture (12 mots avec T7 en 2,5 s) : la version courte garde T7 seul. Tous les textes respectent le temps de lecture de la charte (1 s + 0,3 s par mot, étiquette d'étape comprise). Les numéros restent 4,5 s et 4 s à l'écran.

### Variante 64 s

Identique au master jusqu'à 0:59,5 ; le carton final reste ensuite à l'écran jusqu'à 1:04 (numéros affichés 8,5 s et 8 s). La musique s'arrête toujours sur la cloche à 0:58 ; pendant la tenue, le son continue en temps réel : la cloche s'éteint, puis l'ambiance de la pièce porte la fin.

### Adaptation 16:9

1920 × 1080, même montage et même son que le master. La table est vue à la même hauteur que dans le 9:16, et plus large : l'action est posée à droite (le centre du cadre 9:16 tombe en x = 1290) et les textes passent dans une colonne à gauche, à 10 % des bords, aux tailles minimales de la charte (64 px pour les titres, 44 px pour les sous-titres). Le carton final garde le logo à droite et le texte à gauche. Limite connue : le téléphone tient dans la hauteur du cadre, si bien que les textes de ses écrans y sont plus petits qu'en 9:16 ; ils restent lisibles en plein écran, pas en vignette.

### Version anglaise

Seuls les textes changent, à l'écran comme dans l'image (cahier, téléphone, fiches, bilan) ; `npm run audio:en` refait les sons d'écriture, qui suivent les lettres écrites. Les textes anglais sont à faire relire par un locuteur anglophone camerounais (classe « Form 4 », objectif « O Level »).

## Organisation

| Fichier | Rôle |
| --- | --- |
| `SCENARIO.md` | Le scénario, le découpage, la typographie, la musique, les bruitages |
| `src/timeline.js` | Constantes (30 i/s, 120 BPM), les dix séquences, la feuille de synchronisation |
| `src/world.js` | La chorégraphie : décor, caméra, mains, téléphone, fiches, lumière, instant par instant |
| `src/scene.js` | La composition d'une image : la table vue par la caméra, la lumière, la signature finale, le 16:9 |
| `src/notebook.js` | Le cahier : réglure Seyès, écritures, gomme, trou, scotch, surligneur |
| `src/month.js` | Le mois en accéléré : pages tournées, écritures des trois spécialistes |
| `src/hands.js` | Les mains (élève, parent, trois répétiteurs) et les outils tenus |
| `src/phone.js` | Le téléphone et ses écrans génériques (discussion, appel, fiche, proposition, paiement) |
| `src/props.js` | Objets de la table, fiches des répétiteurs, bilan du mois, tampons, logo vectorisé |
| `src/write.js`, `src/glyphs.js` | L'écriture à la main trait par trait, et ses glyphes (générés par `npm run glyphs`) |
| `src/draw.js` | Définitions SVG (ombres, motifs wax, réglure), ombres portées |
| `src/text.js`, `src/texts.js` | Les textes à l'écran (bandes adhésives, surligneur, carton final), FR et EN |
| `src/stage.js`, `src/stage.css` | Assemblage du cadre, grain |
| `src/cuts.js` | Les versions : segments de montage, textes posés au montage |
| `scripts/build-audio.mjs` | La bande-son : bruitages, musique, ambiance, mixage |
| `scripts/render.mjs` | Rendu image par image (Chromium) et encodage ffmpeg |
| `assets/` | Logo TutorLab, polices Space Grotesk, Inter, JetBrains Mono |

Tout le rendu est déterministe : chaque image est une fonction du seul instant du master, sans animation CSS. L'aperçu et l'export montrent donc exactement la même chose.

## Modifier

- **Un texte à l'écran** : `src/texts.js` (`CARDS`). `` `…` `` passe en JetBrains Mono, `*…*` reçoit le surligneur lime, `hl` fixe l'instant du coup de surligneur. Les textes posés dans l'image (cahier, téléphone, fiches, bilan) sont dans `TXT`.
- **Un minutage** : la chorégraphie est dans `src/world.js` ; les instants partagés avec le son y sont exportés (`CARD_LAND`, `STAMPS`, `FLIPS`…). Après une retouche, relancer `npm run audio` : les bruitages se recalent d'eux-mêmes sur l'animation.
- **La musique** : `scripts/build-audio.mjs`, fonction `arrangement()` (couches par mesure), accords `CH`, phrases `PHRASE_A` et `PHRASE_B`.
- **Une version** : `src/cuts.js`. Un segment se règle par son départ dans la version (`at`) et dans le master (`from`), sur la grille et à la même place dans la mesure ; `cards` pose les textes en temps de la version.

## Ce qui reste à valider

- **T5c « Indisponibilité ou insatisfaction ? »** : texte repris du document de production ; vérifier que le flyer couvre bien l'insatisfaction.
- **La bande-son est entièrement synthétisée.** Elle sonne juste en rythme et en intention, mais rien ne remplacera une séance d'enregistrement : un balafoniste pour la musique, les objets de la table pour les bruitages. Les pistes séparées (bruitages, musique, ambiance) sont dans `out/audio/pistes/`, en WAV 32 bits flottants stéréo.
- **Les matières montrées** (Maths, Physique-Chimie, Anglais), le niveau (3e, BEPC) et le texte du message du parent.
- **La version anglaise**, à faire relire.
- **La version courte sans T7b** (le slogan « Une équipe pour la réussite de votre enfant » n'y tient pas son temps de lecture).

## Licences

Polices sous SIL Open Font License 1.1 ; glyphes manuscrits Hershey et EMS (`assets/fonts/LICENCES.txt`). Logo TutorLab : élément de marque de TutorLab, tiré de la charte graphique.
