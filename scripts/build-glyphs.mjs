// Extrait les glyphes à trait unique des polices Hershey / EMS (paquet hersheytext) vers src/glyphs.js.
//
//   npm run glyphs
//
// Deux mains : « script » (Hershey Script 1-stroke, cursive scolaire de l'élève) et « print »
// (EMS Readability Italic, écriture d'adulte des répétiteurs). Chaque glyphe devient une liste de
// traits (polylignes) en unités de la police, y vers le bas, ligne de base à 0.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'node_modules', 'hersheytext', 'svg_fonts');
const FONTS = {
  script: { file: 'HersheyScript1.svg', name: 'Hershey Script 1-stroke' },
  print: { file: 'EMSReadabilityItalic.svg', name: 'EMS Readability Italic' },
};
// ASCII imprimable et lettres accentuées du français.
const WANT = new Set([...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)), ...'àâäçéèêëîïôöùûüÿÀÂÇÉÈÊËÎÏÔÖÙÛÜ’«»—–°']);

const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&amp;/g, '&').replace(/&apos;/g, '\'').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// Chemin SVG (M, L, C absolus) → traits ; les courbes sont échantillonnées.
function strokes(d) {
  const tok = d.match(/[MLC]|-?[\d.]+(?:e-?\d+)?/gi) || [];
  const out = [];
  let cur = null, cmd = 'M', i = 0, p = [0, 0];
  const num = () => Number(tok[i++]);
  while (i < tok.length) {
    if (/[MLC]/i.test(tok[i])) cmd = tok[i++].toUpperCase();
    if (cmd === 'M') { p = [num(), num()]; cur = [p]; out.push(cur); cmd = 'L'; }
    else if (cmd === 'L') { p = [num(), num()]; cur.push(p); }
    else if (cmd === 'C') {
      const a = [num(), num()], b = [num(), num()], c = [num(), num()];
      for (let k = 1; k <= 8; k++) {
        const u = k / 8, v = 1 - u;
        cur.push([0, 1].map((j) => v * v * v * p[j] + 3 * v * v * u * a[j] + 3 * v * u * u * b[j] + u * u * u * c[j]));
      }
      p = c;
    }
  }
  // y vers le bas, arrondi au dixième d'unité
  return out.filter((s) => s.length > 1).map((s) => s.flatMap(([x, y]) => [Math.round(x * 10) / 10, Math.round(-y * 10) / 10]));
}

let js = `// Généré par scripts/build-glyphs.mjs à partir du paquet hersheytext (licences : assets/fonts/LICENCES.txt).
// Glyphes à trait unique : [avance, [[x0, y0, x1, y1, …], …]], unités de la police, y vers le bas, ligne de base à 0.
export const GLYPHS = {\n`;
for (const [id, f] of Object.entries(FONTS)) {
  const src = fs.readFileSync(path.join(DIR, f.file), 'utf8');
  const adv0 = Number(/<font[^>]*horiz-adv-x="([\d.]+)"/.exec(src)[1]);
  const glyphs = {};
  for (const m of src.matchAll(/<glyph ([^>]*?)\/>/g)) {
    const a = m[1];
    const u = /unicode="([^"]*)"/.exec(a);
    if (!u) continue;
    const ch = decode(u[1]);
    if (!WANT.has(ch) || glyphs[ch]) continue;
    const adv = Number((/horiz-adv-x="([\d.]+)"/.exec(a) || [0, adv0])[1]);
    const d = (/ d="([^"]*)"/.exec(a) || [0, ''])[1];
    glyphs[ch] = [adv, strokes(d)];
  }
  // hauteur d'x : sommet du « x »
  const xh = -Math.min(...glyphs.x[1].flat().filter((_, k) => k % 2 === 1));
  js += `  ${id}: { name: ${JSON.stringify(f.name)}, xh: ${xh}, glyphs: ${JSON.stringify(glyphs)} },\n`;
  console.log(`${id} : ${Object.keys(glyphs).length} glyphes, hauteur d'x ${xh}`);
}
js += '};\n';
fs.writeFileSync(path.join(ROOT, 'src', 'glyphs.js'), js);
console.log(`→ src/glyphs.js (${(js.length / 1024).toFixed(0)} ko)`);
