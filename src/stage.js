// Assemble le cadre : monde sombre dessous, page crème dessus (elle se retourne à 0:49,4 du master).
// Chaque image d'une version montre l'instant du master que son montage désigne (src/cuts.js) ;
// les textes, posés au montage, suivent le temps de la version.
import { DEFS, renderLight, renderDark, wideView, darkCorners } from './scene.js';
import { buildText, updateText } from './text.js';
import { cutOf, masterTime, cardsFor } from './cuts.js';
import { SLOTS, SLOTS_WIDE } from './texts.js';
import { FPS, W, H } from './timeline.js';
import { prog, easeInOut } from './util.js';
import { corners } from './figures.js';

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
  let stage, dark, page, darkArt, pageArt, shade, fade, frameCorners, cards = [];
  let opt = { lang, text, guides, cut, format };
  let built = null;

  function build() {
    const { w, h } = FORMATS[opt.format];
    const wide = opt.format === '16:9';
    root.innerHTML = `
      <svg width="0" height="0" style="position:absolute">${DEFS}</svg>
      <div class="stage${wide ? ' wide' : ''}" style="width:${w}px;height:${h}px">
        <div class="layer dark"><svg class="art" viewBox="0 0 ${W} ${H}" width="${w}" height="${h}"></svg>${wide ? `<svg class="frame" width="${w}" height="${h}"></svg>` : ''}<div class="text"></div></div>
        <div class="layer page"><svg class="art" viewBox="0 0 ${W} ${H}" width="${w}" height="${h}"></svg>${wide ? '<div class="panel"></div>' : ''}<div class="text"></div><div class="shade"></div></div>
        <div class="grain"></div>
        <div class="fade"></div>
        <div class="guides"></div>
      </div>`;
    stage = root.querySelector('.stage');
    dark = stage.querySelector('.dark');
    page = stage.querySelector('.page');
    darkArt = dark.querySelector('.art');
    pageArt = page.querySelector('.art');
    frameCorners = dark.querySelector('.frame');
    shade = page.querySelector('.shade');
    fade = stage.querySelector('.fade');
    stage.querySelector('.grain').style.backgroundImage = `url(${grainTile()})`;
    built = opt.format;
  }

  const setOptions = (o) => {
    opt = { ...opt, ...o };
    if (built !== opt.format) build();
    const slots = opt.format === '16:9' ? SLOTS_WIDE : SLOTS;
    cards = buildText({ page: page.querySelector('.text'), dark: dark.querySelector('.text') }, opt.lang, cardsFor(cutOf(opt.cut)), slots, opt.format === '16:9');
    stage.classList.toggle('no-text', !opt.text);
    stage.classList.toggle('show-guides', !!opt.guides);
  };
  setOptions({});

  function renderFrame(frame) {
    const t = frame / FPS; // temps de la version
    const m = masterTime(cutOf(opt.cut), t); // instant du master montré
    if (opt.format === '16:9') {
      const vb = wideView(m).viewBox.join(' ');
      pageArt.setAttribute('viewBox', vb);
      darkArt.setAttribute('viewBox', vb);
      frameCorners.innerHTML = corners({ x: 54, y: 54, w: 1812, h: 972, len: 54, width: 4, op: darkCorners(m) });
    }
    // page : retournement de 0:49,3 à 0:50,0 du master
    const turn = easeInOut(prog(m, 49.25, 50.0));
    if (m < 50.0) {
      page.style.display = '';
      pageArt.innerHTML = renderLight(m, opt);
      // même géométrie de retournement quel que soit le format : perspective proportionnelle à la largeur
      page.style.transform = turn > 0 ? `perspective(${2600 * FORMATS[opt.format].w / W}px) rotateY(${-96 * turn}deg)` : '';
      shade.style.opacity = String(turn * 0.55);
    } else {
      page.style.display = 'none';
    }
    darkArt.innerHTML = renderDark(m, opt);
    dark.style.display = m < 49.2 ? 'none' : '';
    updateText(cards, t);
    fade.style.opacity = String(1 - prog(t, 0, 0.3));
  }

  return { get stage() { return stage; }, renderFrame, setOptions, get options() { return opt; } };
}
