# TutorLab — « Le Fil »

Animatique codée du spot motion design de 60 secondes destiné aux parents : 9:16, 1080 × 1920, 30 i/s, calé sur une grille de 96 BPM (96 temps exactement). Tout suit le document de production [« Le Fil » : storyboard, textes et conception sonore](https://claude.ai/artifact/XUPU2zBy1M8VHkCnEL7g8D) : textes à l'écran (§ 2), fond sonore (§ 3), storyboard (§ 4), bruitages (§ 5), feuille de synchronisation (§ 6), mixage (§ 7) et version anglaise (§ 8).

C'est l'étape 1 de l'ordre de production : l'animatique, à faire valider par les quatre promoteurs avant l'animation finale et l'enregistrement des objets de la trousse.

## Démarrer

```bash
npm install          # Playwright, pour le rendu vidéo (Chromium et ffmpeg doivent être installés)
npm run audio        # synthétise le son témoin dans out/audio/
npm run dev          # aperçu sur http://localhost:5173
```

L'aperçu lit le film avec le son et affiche, image par image, la ligne correspondante de la feuille de synchronisation. Cliquer une ligne de la feuille amène à son image.

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
| `node scripts/render.mjs --no-text` | `out/le-fil-fr-sans-texte-1080x1920.mp4` | Export sans texte incrusté |
| `npm run stills` | `out/stills/…/f0000.png` | Images-clés pour relecture |

Options : `--lang fr|en`, `--size 1080x1920|720x1280`, `--no-text`, `--no-audio`, `--png` (images sans perte, plus lent), `--jobs 4`, `--from` / `--to` (numéros d'image), `--stills 188,338,975`.

Le master se rend en 3 à 4 minutes sur 4 cœurs, la version légère en 1 minute. Le son est en H.264 + AAC 48 kHz, −14 LUFS intégrés, crête réelle −1,8 dBTP.

## Organisation

| Fichier | Rôle | Section du document |
| --- | --- | --- |
| `src/timeline.js` | Constantes (30 i/s, 96 BPM), les 8 plans, feuille de synchronisation complète | § 4, § 6 |
| `src/texts.js` | Textes à l'écran FR et EN, étiquettes, emplacements à 10 % des bords | § 2, § 8 |
| `src/scene.js` | Les huit plans en SVG, le fil lime continu, les caméras | § 4 |
| `src/figures.js` | Personnages et objets (bustes, main et crayon, gomme, téléphone, coins en L) | § 4 |
| `src/text.js` | Titres en cascade : mots qui montent de 110 % à 0, décalage 60 ms | § 2, § 4 |
| `src/stage.js`, `src/stage.css` | Assemblage du cadre, retournement de page, grain | § 4 |
| `scripts/build-audio.mjs` | Son témoin : 62 bruitages, pulsation, trousse, nappe, ambiance | § 3, § 5, § 7 |
| `scripts/render.mjs` | Rendu image par image (Chromium) et encodage ffmpeg | § 7 |
| `assets/` | Logo TutorLab (fond sombre, détouré), polices Space Grotesk, Inter, JetBrains Mono | — |

Tout le rendu est déterministe : chaque image est une fonction du seul numéro d'image, sans animation CSS. L'aperçu et l'export montrent donc exactement la même chose.

## Modifier

- **Un texte** : `src/texts.js`. `` `…` `` passe en JetBrains Mono, `*…*` reçoit le soulignement lime. Les espaces fines avant « ? ! : ; » sont ajoutées automatiquement.
- **Un minutage** : les impacts sonores sont attachés à l'image et le fond sonore à la grille. Si l'animation est retouchée, on recale l'animation sur la grille, pas l'inverse (§ 6). Après un changement de la feuille dans `src/timeline.js`, relancer `npm run audio`.
- **Un son** : `scripts/build-audio.mjs`, section « pose des bruitages ». Les niveaux du fond suivent la courbe d'intensité du § 3.

## Ce qui reste provisoire

- **Le son est un témoin de synthèse.** Il imite les objets prévus (crayon, gomme, compas, règle, tampon, verre, cloche) pour valider le rythme. La bande-son finale reste à enregistrer avec les objets de la trousse, comme prévu au § 5. Les pistes séparées (bruitages, fond sonore, ambiance) sont dans `out/audio/pistes/`.
- **Les illustrations sont des formes d'animatique.** Elles posent le cadrage, le mouvement et le minutage de chaque plan ; l'illustration finale (2D semi-flat, grain, cadre de vie camerounais) reste à produire.
- **La version anglaise** doit être relue par un locuteur anglophone camerounais avant diffusion (§ 8).
- **Pas encore faits** : la version courte de 30 s (§ 9), l'adaptation 16:9 et la variante de 64 s au carton final allongé (§ 7).

## Licences

Polices sous SIL Open Font License 1.1 (`assets/fonts/LICENCES.txt`). Logo TutorLab : élément de marque de TutorLab, tiré de la charte graphique.
