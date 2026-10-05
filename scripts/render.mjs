// Rendu image par image (Chromium headless) puis encodage H.264 + AAC avec ffmpeg.
//
//   node scripts/render.mjs                      master FR 1080 × 1920, son témoin
//   node scripts/render.mjs --lang en            version anglaise
//   node scripts/render.mjs --size 720x1280      diffusion légère (WhatsApp)
//   node scripts/render.mjs --no-text            export sans texte incrusté
//   node scripts/render.mjs --stills             images-clés en PNG (out/stills)
//   node scripts/render.mjs --stills 188,338,975 images choisies
//   node scripts/render.mjs --png                images PNG sans perte (plus lent)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { FRAMES, FPS, SYNC } from '../src/timeline.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const lang = arg('lang', 'fr');
const [width, height] = String(arg('size', '1080x1920')).split('x').map(Number);
const text = !argv.includes('--no-text');
const audioOn = !argv.includes('--no-audio');
const jobs = Number(arg('jobs', 4));
const from = Number(arg('from', 0));
const to = Number(arg('to', FRAMES));
const stills = arg('stills', false);
const light = width < 1080;
const suffix = `${lang}${text ? '' : '-sans-texte'}-${width}x${height}`;
const out = arg('out', path.join(ROOT, 'out', `le-fil-${suffix}.mp4`));
const AUDIO = path.join(ROOT, 'out', 'audio', 'le-fil-temoin.wav');

fs.mkdirSync(path.dirname(out), { recursive: true });

const server = await serve(0);
const url = `http://127.0.0.1:${server.address().port}/index.html?render=1&lang=${lang}&text=${text ? 1 : 0}&scale=${width / 1080}`;
const browser = await chromium.launch();

async function openPage() {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('Erreur dans la page :', e.message); process.exitCode = 1; });
  await page.goto(url);
  await page.waitForFunction(() => window.LeFil);
  await page.evaluate(() => window.LeFil.ready);
  return page;
}

// Images JPEG qualité 95 pour la vidéo (5 à 6 fois plus rapides à capturer que le PNG), PNG pour les images-clés.
const PNG = argv.includes('--png');
async function shot(page, frame, type = 'png') {
  await page.evaluate((f) => window.LeFil.renderFrame(f), frame);
  return page.screenshot({ type, clip: { x: 0, y: 0, width, height }, ...(type === 'jpeg' ? { quality: 95 } : {}) });
}

try {
  if (stills) {
    const list = stills === true
      ? [...new Set([0, 30, 56, 80, 100, 150, 188, 240, 300, 330, 460, 540, 600, 700, 780, 830, 870, 890, 920, 960, 990, 1020, 1060, 1110, 1150, 1180, 1230, 1280, 1330, 1380, 1420, 1470, 1488, 1505, 1540, 1600, 1650, 1720, 1799])]
      : String(stills).split(',').map(Number);
    const dir = path.join(ROOT, 'out', 'stills', suffix);
    fs.mkdirSync(dir, { recursive: true });
    const page = await openPage();
    for (const f of list) {
      fs.writeFileSync(path.join(dir, `f${String(f).padStart(4, '0')}.png`), await shot(page, f));
    }
    console.log(`${list.length} images → ${path.relative(ROOT, dir)}`);
  } else {
    const withAudio = audioOn && fs.existsSync(AUDIO);
    if (audioOn && !withAudio) console.warn('Son témoin absent (npm run audio) : rendu muet.');
    const ff = [
      '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', PNG ? 'png' : 'mjpeg', '-i', '-',
      ...(withAudio ? ['-ss', String(from / FPS), '-t', String((to - from) / FPS), '-i', AUDIO] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
      ...(light ? ['-crf', '23', '-maxrate', '1500k', '-bufsize', '3000k'] : ['-crf', '18', '-maxrate', '6M', '-bufsize', '12M']),
      ...(withAudio ? ['-c:a', 'aac', '-b:a', light ? '128k' : '192k', '-ar', '48000', '-shortest'] : []),
      '-movflags', '+faststart', out,
    ];
    const enc = spawn('ffmpeg', ff, { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => enc.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg ${c}`)))));
    const pages = await Promise.all(Array.from({ length: jobs }, openPage));
    const buf = new Map();
    let next = from, written = from;
    const started = Date.now();
    const write = (b) => new Promise((res) => (enc.stdin.write(b) ? res() : enc.stdin.once('drain', res)));
    await Promise.all(pages.map(async (page) => {
      while (next < to) {
        const f = next++;
        while (f - written > jobs * 4) await new Promise((r) => setTimeout(r, 5));
        buf.set(f, await shot(page, f, PNG ? 'png' : 'jpeg'));
        while (buf.has(written)) {
          const b = buf.get(written);
          buf.delete(written);
          const n = ++written;
          if (n % 150 === 0) {
            const row = [...SYNC].reverse().find((r) => r.frame <= n);
            console.log(`${n}/${to} images · ${((Date.now() - started) / 1000).toFixed(0)} s · ${row ? row.time : ''}`);
          }
          await write(b);
        }
      }
    }));
    enc.stdin.end();
    await done;
    console.log(`→ ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1e6).toFixed(1)} Mo)`);
  }
} finally {
  await browser.close();
  server.close();
}
