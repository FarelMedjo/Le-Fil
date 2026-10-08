# TutorLab — « Le Fil »

Animatique codée du spot motion design de 60 secondes destiné aux parents : 9:16, 1080 × 1920, 30 i/s, calé sur une grille de 96 BPM (96 temps exactement). Tout suit le document de production [« Le Fil » : storyboard, textes et conception sonore](https://claude.ai/artifact/XUPU2zBy1M8VHkCnEL7g8D) : textes à l'écran (§ 2), fond sonore (§ 3), storyboard (§ 4), bruitages (§ 5), feuille de synchronisation (§ 6), mixage (§ 7) et version anglaise (§ 8).

C'est l'étape 1 de l'ordre de production : l'animatique, à faire valider par les quatre promoteurs avant l'animation finale et l'enregistrement des objets de la trousse.

Le dépôt monte aussi les déclinaisons prévues par le document, toutes tirées du master sans nouvelle animation : la version courte de 30 s (§ 9), la variante de 64 s au carton final tenu (§ 7) et l'adaptation 16:9 (§ 7). Voir [Les versions](#les-versions).

## Démarrer

```bash
npm install          # Playwright, pour le rendu vidéo (Chromium et ffmpeg doivent être installés)
npm run audio        # synthétise le son témoin des trois versions dans out/audio/
npm run dev          # aperçu sur http://localhost:5173
```

L'aperçu lit le film avec le son et affiche, image par image, la ligne correspondante de la feuille de synchronisation. Cliquer une ligne de la feuille amène à son image. Deux menus choisissent la version (master 60 s, version courte 30 s, variante 64 s) et le format (9:16 ou 16:9) ; la feuille affichée est alors celle de la version, coupes comprises.

| Touche | Action |
| --- | --- |
| Espace | Lecture / pause |
| ← / → | Image précédente / suivante |
| Maj + ← / → | Temps précédent / suivant (grille de 96 BPM) |

Les options de l'aperçu affichent la version anglaise, masquent les textes ou montrent les zones sûres à 10 % des bords.

## Exporter

| Commande | Fichier produit | Usage (§ 7) |
| --- | --- | --- |
| `npm run render` | `out/le-fil-fr-1080x1920.mp4` | Master : archive, Facebook, TikTok |
| `npm run render:light` | `out/le-fil-fr-720x1280.mp4` | Diffusion légère : WhatsApp |
| `npm run render:en` | `out/le-fil-en-1080x1920.mp4` | Version anglaise |
| `npm run render:30s` | `out/le-fil-fr-30s-720x1280.mp4` | Version courte 30 s : statuts WhatsApp, publicité |
| `npm run render:64s` | `out/le-fil-fr-64s-1080x1920.mp4` | Variante 64 s : supports où les parents notent le numéro |
| `npm run render:16x9` | `out/le-fil-fr-1920x1080.mp4` | Adaptation 16:9 : Facebook, YouTube, écran en agence |
| `node scripts/render.mjs --no-text` | `out/le-fil-fr-sans-texte-1080x1920.mp4` | Export sans texte incrusté |
| `npm run stills` | `out/stills/…/f0000.png` | Images-clés pour relecture |

Options : `--cut master|30s|64s`, `--format 9:16|16:9`, `--lang fr|en`, `--size 1080x1920|720x1280|1920x1080`, `--no-text`, `--no-audio`, `--png` (images sans perte, plus lent), `--jobs 4`, `--from` / `--to` (numéros d'image), `--stills 188,338,975`. Elles se combinent : `--cut 30s --format 16:9 --lang en` donne la version courte anglaise en 16:9. Sans `--stills` explicite, une version produit une image de chaque côté de chaque coupe et une par seconde.

Le master se rend en 2 min 30 environ sur 4 cœurs, la version légère en 1 minute, la version courte en 40 secondes, la variante 64 s en 2 min 45 et le 16:9 en 2 min 20. Vidéo H.264, son AAC 48 kHz à −14 LUFS intégrés, crête réelle −1,8 dBTP. Débits du § 7 : 6 Mb/s au plus et AAC 192 kb/s pour le master, la variante 64 s et le 16:9 ; 1,5 Mb/s et AAC 128 kb/s pour les exports 720 × 1280, dont la version courte.

## Les versions

Chaque version est un montage du master, décrit dans `src/cuts.js` : une suite de segments (« à tel instant de la version, montrer le master à partir de tel instant »). Toutes les coupes tombent sur la grille de 96 BPM, dans le master comme dans la version, si bien que le fond sonore garde sa pulsation. Les bruitages suivent leur image, les textes sont posés au montage, et la feuille de synchronisation de la version est recalculée (coupes en vert lime dans l'aperçu).

### Version courte 30 s (§ 9)

48 temps, six segments dans l'ordre du § 9. Les plans 2 (cadrage) et 6 (paiement) sont sacrifiés ; la mention du paiement passe en petit sur le carton final.

| Segment | Version | Master | Textes | Sons clés |
| --- | --- | --- | --- | --- |
| Accroche | 0:00 → 0:03,125 | 0:00 → 0:03,125 | T0 | Graphite qui cale, une seule gomme ; ambiance seule |
| Demande | 0:03,125 → 0:07,5 | 0:05 → 0:09,375 | T1 | Capuchon, feuilletage ; la pulsation entre |
| Spécialistes | 0:07,5 → 0:13,75 | 0:17,5 → 0:21,25 puis 0:23,75 → 0:26,25 | T3, T3c, T3d | Twang triple, quatre coches ; fond plein |
| Résolution | 0:13,75 → 0:18,125 | 0:28,75 → 0:33,125 | aucun | Toc-toc ; fond coupé, puis franchissement à 0:17,5 |
| Suivi | 0:18,125 → 0:21,875 | 0:38,75 → 0:39,375 puis 0:40 → 0:43,125 | T5b, T5d | Tampon, agrafeuse |
| Clôture | 0:21,875 → 0:30 | 0:50,625 → 0:58,75 | T7, T7b, T8, mention T6 | Logo sonore, accord, cloche ; tout s'arrête à 0:28,75 |

Les deux coupes internes (0:11,25 et 0:18,75) tombent sur des images fixes : seule la couche texte change.

Écarts au tableau du § 9, à faire valider avec l'animatique :

- **Limites recalées sur la grille.** Les temps du § 9 (0:03, 0:19, 0:23) ne tombent pas sur un temps de 96 BPM ; les coupes passent au temps le plus proche.
- **Spécialistes raccourci de 2 temps (6,25 s au lieu de 7,5 s), Clôture allongée d'autant (8,125 s au lieu de 7 s).** Avec 7 s, le slogan et le bloc contact ne tenaient pas ensemble. Résolution et Suivi glissent donc d'environ 1 s plus tôt.
- **T5d en bas de l'écran**, sous la feuille de bilan, pour rester affiché avec T5b : les deux engagements tiennent dans les 3,75 s du segment.
- **Temps de lecture.** La règle du § 2 (1 s + 0,3 s par mot) est tenue partout, sauf pour T7b (2,75 s pour 3,4 s), T5d (3,05 s pour 3,4 s) et la mention du paiement en petit (2,5 s pour 11 mots). Le carton contact garde les durées du master : numéros 2,5 s et 1,9 s, logo 1,25 s.

### Variante 64 s (§ 7)

Identique au master jusqu'à 0:59,5 : mêmes images, mêmes sons (seul le gain de normalisation diffère, de 0,2 dB). Le carton final reste ensuite à l'écran jusqu'à 1:04. Il est affiché 7,1 s depuis l'apparition de T8, et les numéros 6,5 s et 5,9 s. Le son s'arrête toujours sur la cloche à 0:58,75 ; l'ambiance de la pièce porte la tenue jusqu'au fondu.

### Adaptation 16:9 (§ 7)

1920 × 1080, même montage et même son que le master. Les textes passent dans une colonne à gauche (marges de 10 %), sur un panneau crème qui se fond dans l'image ; l'image est une fenêtre sur le cadre 9:16, à l'échelle 0,9, dont le cadrage suit l'action plan par plan (`wideView` dans `src/scene.js`). Le monde sombre du plan 7 occupe tout l'écran, avec ses coins de cadrage. T4, T5b et T6 ont des retours à la ligne propres au 16:9 (`wide` dans `src/texts.js`) ; les mots ne changent pas, seul le point entre « MTN MoMo » et « Orange Money » devient un retour à la ligne.

## Organisation

| Fichier | Rôle | Section du document |
| --- | --- | --- |
| `src/timeline.js` | Constantes (30 i/s, 96 BPM), les 8 plans, feuille de synchronisation complète | § 4, § 6 |
| `src/cuts.js` | Les versions : segments de montage, textes posés au montage, feuille de synchronisation de chaque version | § 7, § 9 |
| `src/texts.js` | Textes à l'écran FR et EN, étiquettes, emplacements à 10 % des bords (9:16 et 16:9) | § 2, § 8 |
| `src/scene.js` | Les huit plans en SVG, le fil lime continu, les caméras, le cadrage 16:9 | § 4 |
| `src/figures.js` | Personnages et objets (bustes, main et crayon, gomme, téléphone, coins en L) | § 4 |
| `src/text.js` | Titres en cascade : mots qui montent de 110 % à 0, décalage 60 ms | § 2, § 4 |
| `src/stage.js`, `src/stage.css` | Assemblage du cadre (9:16 ou 16:9), instant du master montré par la version, retournement de page, grain | § 4 |
| `scripts/build-audio.mjs` | Son témoin de chaque version : 62 bruitages, pulsation, trousse, nappe, ambiance | § 3, § 5, § 7 |
| `scripts/render.mjs` | Rendu image par image (Chromium) et encodage ffmpeg | § 7 |
| `assets/` | Logo TutorLab (fond sombre, détouré), polices Space Grotesk, Inter, JetBrains Mono | — |

Tout le rendu est déterministe : chaque image est une fonction du seul numéro d'image, sans animation CSS. L'aperçu et l'export montrent donc exactement la même chose. Une version ne fait que choisir quel instant du master montrer : le master reste la seule animation.

## Modifier

- **Un texte** : `src/texts.js`. `` `…` `` passe en JetBrains Mono, `*…*` reçoit le soulignement lime. Les espaces fines avant « ? ! : ; » sont ajoutées automatiquement.
- **Un minutage** : les impacts sonores sont attachés à l'image et le fond sonore à la grille. Si l'animation est retouchée, on recale l'animation sur la grille, pas l'inverse (§ 6). Après un changement de la feuille dans `src/timeline.js`, relancer `npm run audio`.
- **Un son** : `scripts/build-audio.mjs`, section « bruitages du master ». Les niveaux du fond suivent la courbe d'intensité du § 3 ; chaque version la reprend à l'image montrée.
- **Une version** : `src/cuts.js`. Un segment se règle par son départ dans la version (`at`) et dans le master (`from`), tous deux sur la grille. `cards` pose les textes en temps de la version, `recue` déplace un son attaché à un texte (numéros, cloche), `edit` corrige la feuille de synchronisation. Relancer ensuite `npm run audio`.

## Ce qui reste provisoire

- **Le son est un témoin de synthèse.** Il imite les objets prévus (crayon, gomme, compas, règle, tampon, verre, cloche) pour valider le rythme. La bande-son finale reste à enregistrer avec les objets de la trousse, comme prévu au § 5. Les pistes séparées (bruitages, fond sonore, ambiance) sont dans `out/audio/pistes/`, `pistes-30s/` et `pistes-64s/`, en WAV 32 bits flottants : au gain du mix mais avant le limiteur, elles dépassent 0 dBFS sur les attaques, et leur somme refait le mix non limité.
- **Les illustrations sont des formes d'animatique.** Elles posent le cadrage, le mouvement et le minutage de chaque plan ; l'illustration finale (2D semi-flat, grain, cadre de vie camerounais) reste à produire.
- **La version anglaise** doit être relue par un locuteur anglophone camerounais avant diffusion (§ 8).
- **Le 16:9 recadre les illustrations du 9:16.** Il suffit pour valider le rythme et la mise en page ; l'illustration finale gagnera à composer ses décors en largeur, surtout pour la table du soir (plan 1) et la maison (plan 4).
- **Les écarts de la version courte au § 9** (limites, durée de Clôture, place de T5d, trois textes sous le temps de lecture) sont à valider avec l'animatique.

## Licences

Polices sous SIL Open Font License 1.1 (`assets/fonts/LICENCES.txt`). Logo TutorLab : élément de marque de TutorLab, tiré de la charte graphique.
