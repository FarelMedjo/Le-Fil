// Assemble le cadre 1080 × 1920 : monde sombre dessous, page crème dessus (elle se retourne à 0:49,4).
import { DEFS, renderLight, renderDark } from './scene.js';
import { buildText, updateText } from './text.js';
import { FPS, W, H } from './timeline.js';
import { prog, easeInOut } from './util.js';

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

export function createStage(root, { lang = 'fr', text = true, guides = false } = {}) {
  root.innerHTML = `
    <svg width="0" height="0" style="position:absolute">${DEFS}</svg>
    <div class="stage">
      <div class="layer dark"><svg class="art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"></svg><div class="text"></div></div>
      <div class="layer page"><svg class="art" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"></svg><div class="text"></div><div class="shade"></div></div>
      <div class="grain"></div>
      <div class="fade"></div>
      <div class="guides"></div>
    </div>`;
  const stage = root.querySelector('.stage');
  const dark = stage.querySelector('.dark');
  const page = stage.querySelector('.page');
  const darkArt = dark.querySelector('.art');
  const pageArt = page.querySelector('.art');
  const shade = page.querySelector('.shade');
  const fade = stage.querySelector('.fade');
  stage.querySelector('.grain').style.backgroundImage = `url(${grainTile()})`;

  let opt = { lang, text, guides };
  let cards = [];
  const setOptions = (o) => {
    opt = { ...opt, ...o };
    cards = buildText({ page: page.querySelector('.text'), dark: dark.querySelector('.text') }, opt.lang);
    stage.classList.toggle('no-text', !opt.text);
    stage.classList.toggle('show-guides', !!opt.guides);
  };
  setOptions({});

  function renderFrame(frame) {
    const t = frame / FPS;
    // page : retournement de 0:49,3 à 0:50,0
    const turn = easeInOut(prog(t, 49.25, 50.0));
    if (t < 50.0) {
      page.style.display = '';
      pageArt.innerHTML = renderLight(t, opt);
      page.style.transform = turn > 0 ? `perspective(2600px) rotateY(${-96 * turn}deg)` : '';
      shade.style.opacity = String(turn * 0.55);
    } else {
      page.style.display = 'none';
    }
    darkArt.innerHTML = renderDark(t, opt);
    dark.style.display = t < 49.2 ? 'none' : '';
    updateText(cards, t);
    fade.style.opacity = String(1 - prog(t, 0, 0.3));
  }

  return { stage, renderFrame, setOptions, get options() { return opt; } };
}
