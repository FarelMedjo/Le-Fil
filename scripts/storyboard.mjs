// Storyboard du film, en une page HTML autonome, à partir des vraies images du master.
//
//   npm run storyboard        → out/storyboard.html (rend les images-clés, puis les intègre)
//
// Chaque séquence de SCENARIO.md y figure avec ses images, son minutage, l'action, les textes à l'écran
// et le son. La page est faite pour être partagée aux promoteurs qui valident le film.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { FPS } from '../src/timeline.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');

// Les dix séquences : images (secondes du master), action, textes, son.
const SEQ = [
  {
    n: 1, title: 'L\'exercice 3', from: '0:00', to: '0:05', act: 'Le blocage', shots: [0.9, 3.5, 4.75],
    camera: 'Très près de la page, réglure Seyès plein cadre, lumière chaude de la lampe.',
    action: 'L\'élève écrit « 2x = 17 + 5 », s\'arrête, tapote la feuille. La gomme frotte quatre fois, de plus en plus fort, et la page se perce.',
    text: ['Une matière qui bloque ?'],
    sound: 'Pièce le soir, grillons, horloge. Crayon calculé sur la vitesse de la mine, deux tapotements, quatre allers-retours de gomme, déchirure, puis silence.',
  },
  {
    n: 2, title: 'La main du parent', from: '0:05', to: '0:08', act: 'Le blocage', shots: [5.6, 6.5, 8.05],
    camera: 'Recul qui découvre la table familiale et sa toile cirée wax, puis demi-tour vers le téléphone : on passe dans le monde du parent.',
    action: 'La main du parent se pose sur celle de l\'enfant. Un temps. Puis elle prend le téléphone.',
    text: [],
    sound: 'Manche qui glisse, main qui se pose. Première note grave de balafon et nappe ; trois notes qui montent.',
  },
  {
    n: 3, title: '01 · Votre demande', from: '0:08', to: '0:12', act: 'La demande', shots: [9.2, 11.0],
    camera: 'L\'écran du téléphone remplit le cadre.',
    action: 'Le message s\'écrit lettre à lettre sur un clavier AZERTY ; envoi ; « Mercredi » ; réponse de TutorLab.',
    text: ['01 · Votre demande', 'WhatsApp ou appel'],
    sound: 'Frappes du clavier sur les croches, envoi, réception sur une note de balafon. La trousse et l\'ostinato entrent.',
  },
  {
    n: 4, title: '02 · Entretien de cadrage', from: '0:12', to: '0:16', act: 'La demande', shots: [12.4, 14.9],
    camera: 'Écran du téléphone.',
    action: 'Appel entrant de TutorLab ; la fiche « Votre demande » se remplit, un champ par temps : classe, matières, objectif, disponibilités.',
    text: ['02 · Entretien de cadrage sous 48 h'],
    sound: 'La sonnerie est le motif de balafon. Quatre coches. Pulsation et basse entrent.',
  },
  {
    n: 5, title: '03 · Un spécialiste par matière', from: '0:16', to: '0:24', act: 'L\'équipe', shots: [16.35, 18.0, 22.2],
    camera: 'Les fiches s\'envolent de l\'écran ; demi-tour vers la table, côté enfant, puis lente poussée.',
    action: 'Trois fiches atterrissent une par temps : Mathématiques, Physique-Chimie, Anglais. Tampon « Vérifié » sur chacune.',
    text: ['03 · Sous 7 jours, un spécialiste par matière', 'Répétiteurs vérifiés : identité, parcours, références, entretien'],
    sound: 'Souffles de papier, trois fiches qui claquent, trois tampons, quatre coches. Groove complet, mélodie de balafon.',
  },
  {
    n: 6, title: '04 · Séance d\'essai', from: '0:24', to: '0:32', act: 'Le déclic', shots: [24.9, 26.7, 29.8, 30.2, 31.0],
    camera: 'Retour au cahier, cadré sur le trou.',
    action: 'On frappe à la porte. Le répétiteur pose un morceau de scotch sur le trou et indique « | −5 ». L\'élève écrit sur le scotch « 2x = 12 », puis « x = 6 ». Surligneur lime, check des poings.',
    text: ['04 · Séance d\'essai à domicile, avant tout engagement de longue durée'],
    sound: 'Toc-toc hors champ, porte, chaise ; scotch déroulé, déchiré, lissé ; stylo bille ; silence total à 0:29,5 ; tout revient à 0:30.',
  },
  {
    n: 7, title: '05 · Le suivi du mois', from: '0:32', to: '0:40', act: 'Le suivi', shots: [33.0, 34.8, 37.7],
    camera: 'La caméra s\'élève : un mois en accéléré, la lumière tourne du soir au jour.',
    action: 'Les pages se tournent ; à chaque page, la main d\'un autre spécialiste : physique-chimie, anglais, maths. Le bilan du mois glisse sur le cahier, sans aucune note chiffrée.',
    text: ['05 · Un bilan écrit chaque mois'],
    sound: 'Feuilletages sur les temps, stylos, feuille qui glisse, coches, surligneur, tampon.',
  },
  {
    n: 8, title: 'Remplacement garanti', from: '0:40', to: '0:44', act: 'Le suivi', shots: [40.5, 42.9],
    camera: 'Les trois fiches.',
    action: 'La fiche d\'anglais se ternit et s\'en va ; une nouvelle fiche arrive à sa place et reçoit son tampon.',
    text: ['Indisponibilité ou insatisfaction ?', 'Remplacement garanti, un autre spécialiste vous est proposé'],
    sound: 'La mélodie disparaît avec la fiche et revient avec la nouvelle.',
  },
  {
    n: 9, title: 'Paiement', from: '0:44', to: '0:48', act: 'Le suivi', shots: [45.8, 46.9],
    camera: 'Demi-tour vers le téléphone du parent.',
    action: 'Écran de paiement générique, « Confirmer », coche verte. Aucun logo d\'opérateur.',
    text: ['Paiement mensuel, MTN MoMo · Orange Money, prix unique, sans frais cachés'],
    sound: 'Toucher d\'écran, deux verres frappés (la, puis ré). Groove allégé.',
  },
  {
    n: 10, title: 'La signature', from: '0:48', to: '1:00', act: 'La signature', shots: [49.3, 49.9, 52.5, 57.5],
    camera: 'Retour à la table ; la pièce s\'éteint, seul le cahier reste.',
    action: 'Les deux pages se redressent et deviennent le logo ; la tache de surligneur devient le point lime. Slogan, puis contact.',
    text: ['Un spécialiste par matière.', 'Une équipe pour la réussite de votre enfant.', 'Demandez un répétiteur · 620 27 39 65 · 689 39 47 63', 'Réponse sous 48 h'],
    sound: 'Interrupteur, demi-temps de silence, glissando de crayon. Final, logo sonore en cinq notes, accord et cloche à 0:58.',
  },
];

const times = SEQ.flatMap((s) => s.shots);
const frames = times.map((t) => Math.round(t * FPS));
const dir = path.join(OUT, 'stills', 'fr-540x960');
const missing = frames.filter((f) => !fs.existsSync(path.join(dir, `f${String(f).padStart(4, '0')}.png`)));
if (missing.length) {
  const r = spawnSync('node', [path.join(ROOT, 'scripts', 'render.mjs'), '--stills', missing.join(','), '--size', '540x960', '--no-audio'], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status);
}
const jpeg = (f) => {
  const src = path.join(dir, `f${String(f).padStart(4, '0')}.png`);
  const r = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', src, '-vf', 'scale=360:640', '-q:v', '4', '-f', 'mjpeg', '-'], { maxBuffer: 1 << 26 });
  return `data:image/jpeg;base64,${r.stdout.toString('base64')}`;
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clock = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0').replace('.', ',')}`;

const acts = [...new Set(SEQ.map((s) => s.act))];
const secs = (c) => { const [m, s] = c.split(':').map(Number); return m * 60 + s; };
const bar = SEQ.map((s) => `<a class="seg a${acts.indexOf(s.act)}" href="#s${s.n}" style="flex:${secs(s.to) - secs(s.from)}"><span>${s.n}</span></a>`).join('');

const cards = SEQ.map((s) => `
<section class="seq" id="s${s.n}">
  <header class="seq-head">
    <span class="num">${String(s.n).padStart(2, '0')}</span>
    <h2>${esc(s.title)}</h2>
    <span class="tc">${s.from} → ${s.to}</span>
    <span class="act">${esc(s.act)}</span>
  </header>
  <div class="frames">${s.shots.map((t) => `<figure><img src="${jpeg(Math.round(t * FPS))}" alt="${esc(s.title)}, image à ${clock(t)}" width="360" height="640" loading="lazy"><figcaption>${clock(t)}</figcaption></figure>`).join('')}</div>
  <dl class="notes">
    <div><dt>Caméra</dt><dd>${esc(s.camera)}</dd></div>
    <div><dt>Action</dt><dd>${esc(s.action)}</dd></div>
    <div><dt>À l'écran</dt><dd>${s.text.length ? s.text.map((x) => `<span class="strip">${esc(x)}</span>`).join(' ') : '<span class="none">Aucun texte : l\'image parle seule.</span>'}</dd></div>
    <div><dt>Son</dt><dd>${esc(s.sound)}</dd></div>
  </dl>
</section>`).join('');

const html = `<title>Storyboard Exercice 3</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
/* Mise en page : une planche de production — la frise du film en tête, puis une séquence par bloc, images 9:16 et notes. */
:root {
  --paper: #F3F1EA; --card: #FCFBF7; --ink: #0B0E1A; --muted: #5B6272; --rule: #DAD6CA; --tape: #EFE6D0;
  --lime: #C8FF3E; --mark: #B9EE2C; --a0: #2B3A63; --a1: #C58B3C; --a2: #3157A6; --a3: #A9533A; --a4: #2F8A68; --a5: #0B0E1A;
  --display: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif; --body: 'Inter', 'Helvetica Neue', Arial, sans-serif; --mono: 'JetBrains Mono', ui-monospace, Menlo, monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper: #0B0E1A; --card: #121729; --ink: #ECEEF4; --muted: #9AA2B6; --rule: #262D45; --tape: #2A2F40; --mark: #C8FF3E; color-scheme: dark } }
:root[data-theme="dark"] { --paper: #0B0E1A; --card: #121729; --ink: #ECEEF4; --muted: #9AA2B6; --rule: #262D45; --tape: #2A2F40; --mark: #C8FF3E; color-scheme: dark }
body { background: var(--paper); color: var(--ink); font: 400 16px/1.55 var(--body); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); padding-block: 32px 64px; }
main { max-width: 1180px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
.top { display: flex; flex-direction: column; gap: 10px; }
.eyebrow { font: 600 12px/1 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
h1 { font: 700 clamp(34px, 6vw, 60px)/1.02 var(--display); letter-spacing: -0.03em; margin: 0; text-wrap: balance; }
h1 mark { background: linear-gradient(transparent 18%, var(--mark) 18%, var(--mark) 88%, transparent 88%); color: inherit; padding: 0 .08em; }
.lede { max-width: 68ch; margin: 0; color: var(--ink); }
.facts { display: flex; flex-wrap: wrap; gap: 8px 18px; font: 500 13px/1.4 var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.timeline { display: flex; gap: 3px; height: 46px; border-radius: 6px; overflow: hidden; }
.seg { display: flex; align-items: flex-end; padding: 6px; color: #fff; text-decoration: none; font: 700 13px/1 var(--mono); min-width: 0; }
.seg:focus-visible { outline: 3px solid var(--lime); outline-offset: -3px; }
.a0 { background: var(--a0) } .a1 { background: var(--a1) } .a2 { background: var(--a2) } .a3 { background: var(--a3) } .a4 { background: var(--a4) } .a5 { background: var(--a5); box-shadow: inset 0 0 0 1px var(--rule) }
.legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font: 500 13px/1.3 var(--body); color: var(--muted); }
.legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 6px; vertical-align: -1px; }
.seq { background: var(--card); border: 1px solid var(--rule); border-radius: 10px; padding: 18px; display: grid; gap: 16px; scroll-margin-top: 16px; }
.seq-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 14px; }
.num { font: 700 14px/1 var(--mono); background: var(--ink); color: var(--lime); padding: 6px 8px; border-radius: 4px; }
h2 { font: 700 24px/1.15 var(--display); letter-spacing: -0.015em; margin: 0; flex: 1 1 260px; text-wrap: balance; }
.tc { font: 600 14px/1 var(--mono); font-variant-numeric: tabular-nums; }
.act { font: 600 12px/1 var(--body); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.frames { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; }
figure { margin: 0; flex: 0 0 auto; width: clamp(130px, 22vw, 200px); display: flex; flex-direction: column; gap: 6px; }
figure img { width: 100%; height: auto; aspect-ratio: 9 / 16; border-radius: 6px; display: block; background: #05070F; box-shadow: 0 1px 0 var(--rule); }
figcaption { font: 500 12px/1 var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.notes { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px 22px; margin: 0; }
.notes div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
dt { font: 600 11px/1.2 var(--mono); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
dd { margin: 0; max-width: 62ch; }
.strip { display: inline-block; background: var(--tape); color: var(--ink); font: 600 14px/1.35 var(--display); padding: 3px 9px; margin: 2px 2px 2px 0; transform: rotate(-0.6deg); }
.none { color: var(--muted); font-style: italic; }
.foot { font-size: 14px; color: var(--muted); max-width: 70ch; }
@media (prefers-reduced-motion: no-preference) { .seg { transition: filter .15s } .seg:hover { filter: brightness(1.15) } }
</style>
<main>
  <div class="top">
    <span class="eyebrow">TutorLab · spot de 60 s · storyboard de validation</span>
    <h1>Exercice <mark>3</mark></h1>
    <p class="lede">Un plan-séquence au-dessus de la table familiale. L'élève perce sa page à force de gommer ; un répétiteur répare le trou au scotch, et la bonne réponse s'écrit dessus. À la fin, le cahier devient le logo TutorLab.</p>
    <div class="facts"><span>60 s · 9:16 · 1080 × 1920</span><span>30 i/s · 120 BPM (12/8)</span><span>sans voix off</span><span>versions : 30 s, 64 s, 16:9, anglais</span></div>
  </div>
  <nav class="timeline" aria-label="Les dix séquences, à l'échelle du film">${bar}</nav>
  <div class="legend">${acts.map((a, i) => `<span><i class="a${i}"></i>${esc(a)}</span>`).join('')}</div>
  ${cards}
  <p class="foot">Images tirées du rendu du master. La bande-son est synthétisée (balafon, trousse, objets de la table) ; elle est à réenregistrer avec un balafoniste et les vrais objets pour la version finale.</p>
</main>`;

fs.writeFileSync(path.join(OUT, 'storyboard.html'), html);
console.log(`→ out/storyboard.html (${(html.length / 1e6).toFixed(2)} Mo, ${times.length} images)`);
