// Assemble le cadre : l'image (SVG), le calque texte (HTML), le grain.
// Chaque image d'une version montre l'instant du master que son montage désigne (src/cuts.js) ;
// les textes, posés au montage, suivent le temps de la version.
import { DEFS, renderScene } from './scene.js';
import { buildText, updateText } from './text.js';
import { cutOf, masterTime, cardsFor } from './cuts.js';
import { SLOTS, SLOTS_WIDE } from './texts.js';
import { FPS, W, H } from './timeline.js';
import { prog } from './util.js';

export const FORMATS = {
  '9:16': { w: W, h: H },
  '16:9': { w: H, h: W },
};

function grainTile() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(256, 256);
  let s = 12345;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const v = s >>> 24;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

export function createStage(root, { lang = 'fr', text = true, guides = false, cut = 'master', format = '9:16' } = {}) {
  let stage, art, layer, cards = [];
  let opt = { lang, text, guides, cut, format };
  let built = null;

  function build() {
    const { w, h } = FORMATS[opt.format];
    root.innerHTML = `
      <svg width="0" height="0" style="position:absolute">${DEFS()}</svg>
      <div class="stage${opt.format === '16:9' ? ' wide' : ''}" style="width:${w}px;height:${h}px">
        <svg class="art" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"></svg>
        <div class="text"></div>
        <div class="grain"></div>
        <div class="fade"></div>
        <div class="guides"></div>
      </div>`;
    stage = root.querySelector('.stage');
    art = stage.querySelector('.art');
    layer = stage.querySelector('.text');
    stage.querySelector('.grain').style.backgroundImage = `url(${grainTile()})`;
    built = opt.format;
  }

  const setOptions = (o) => {
    opt = { ...opt, ...o };
    if (built !== opt.format) build();
    const wide = opt.format === '16:9';
    cards = buildText(layer, opt.lang, cardsFor(cutOf(opt.cut)), wide ? SLOTS_WIDE : SLOTS, wide);
    stage.classList.toggle('no-text', !opt.text);
    stage.classList.toggle('show-guides', !!opt.guides);
  };
  setOptions({});

  function renderFrame(frame) {
    const t = frame / FPS; // temps de la version
    const cut = cutOf(opt.cut);
    const m = masterTime(cut, t); // instant du master montré
    const { w, h } = FORMATS[opt.format];
    art.innerHTML = renderScene(m, opt, { w, h });
    updateText(cards, t);
    stage.querySelector('.fade').style.opacity = String(1 - prog(t, 0, 0.35));
  }

  return { get stage() { return stage; }, renderFrame, setOptions, get options() { return opt; } };
}
