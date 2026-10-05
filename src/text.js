// Calque texte (HTML) : titres révélés en cascade, mots qui montent de 110 % à 0, décalage 60 ms.
import { CARDS, SLOTS } from './texts.js';
import { ease, prog } from './util.js';

const KIND = { '!': 'hero', '#': 'title', '~': 'sub', '?': 'question', '=': 'num', '-': 'info' };
const STAGGER = 0.06;
const RISE = 0.55;
const EXIT = 0.22;

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Un « mot » = une suite sans espace hors `…` (un numéro de téléphone reste un seul bloc).
// Typographie française : espace fine insécable avant ? ! : ; (le signe ne part jamais seul à la ligne).
function units(text) {
  return text.replace(/ ([?!:;])/g, '\u202F$1').match(/(?:`[^`]*`|\*[^*]*\*|[^ `*]+)+/g) || [];
}

function unitHtml(u) {
  let hl = false;
  const inner = u.replace(/`([^`]*)`|\*([^*]*)\*|([^`*]+)/g, (m, mono, star, plain) => {
    if (mono !== undefined) return `<span class="mono">${escHtml(mono)}</span>`;
    if (star !== undefined) { hl = true; return escHtml(star); }
    return escHtml(plain);
  });
  const w = `<span class="w"><span class="wi">${inner}</span></span>`;
  if (!hl) return w;
  return `<span class="hl">${w}<svg class="ul"><path pathLength="1"/></svg></span>`;
}

function lineHtml(src) {
  const kind = KIND[src[0]];
  const text = src.slice(2);
  return `<div class="line ${kind}">${units(text).map(unitHtml).join(' ')}</div>`;
}

function checksHtml(items) {
  return `<div class="checks">${items.map((it) => `<div class="chk"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="23"/><path d="M13 25l7.5 7.5L36 16" pathLength="1"/></svg><span>${escHtml(it)}</span></div>`).join('')}</div>`;
}

function signatureHtml(src) {
  return `<div class="signature"><img class="logo" src="assets/brand/tutorlab-logo-horizontal-sombre.png" alt="TutorLab"><span class="pill">${units(src).map((u) => u.replace(/`([^`]*)`/g, '<span class="mono">$1</span>')).join(' ')}</span></div>`;
}

export function buildText(containers, lang) {
  const cards = [];
  const slots = {};
  for (const root of Object.values(containers)) root.innerHTML = '';
  for (const c of CARDS) {
    const key = `${c.world}:${c.slot}:${c.stack || c.id}`;
    if (!slots[key]) {
      const pos = SLOTS[c.slot];
      const div = document.createElement('div');
      div.className = 'slot';
      Object.assign(div.style, { left: `${pos.x}px`, top: `${pos.y}px`, width: `${pos.w}px` });
      containers[c.world].appendChild(div);
      slots[key] = div;
    }
    const el = document.createElement('div');
    el.className = `card card-${c.id}`;
    const src = c[lang] || c.fr;
    if (c.type === 'checks') el.innerHTML = checksHtml(src);
    else if (c.type === 'signature') el.innerHTML = signatureHtml(src[0]);
    else el.innerHTML = src.map(lineHtml).join('');
    slots[key].appendChild(el);
    cards.push({
      c, el,
      words: [...el.querySelectorAll('.wi')],
      checks: [...el.querySelectorAll('.chk')],
      ul: el.querySelector('.ul path'),
    });
  }
  return cards;
}

export function updateText(cards, t) {
  for (const { c, el, words, checks, ul } of cards) {
    if (t < c.in - 0.01 || t > c.out + 0.01) { el.style.visibility = 'hidden'; continue; }
    el.style.visibility = 'visible';
    const e = prog(t, c.out - EXIT, c.out);
    el.style.opacity = String(1 - e);
    el.style.transform = `translateY(${-14 * e}px)`;
    words.forEach((w, i) => {
      const k = ease(prog(t, c.in + i * STAGGER, c.in + i * STAGGER + RISE));
      w.style.transform = `translateY(${(1 - k) * 110}%)`;
    });
    checks.forEach((chk, i) => {
      const t0 = c.items[i];
      const k = ease(prog(t, t0 - 0.04, t0 + 0.3));
      chk.style.opacity = String(Math.min(1, k * 2));
      chk.style.transform = `translateY(${(1 - k) * 24}px)`;
      chk.querySelector('path').style.strokeDashoffset = String(1 - ease(prog(t, t0, t0 + 0.28)));
    });
    if (ul) {
      if (!ul.dataset.w) {
        // tracé à la main, dimensionné sur le mot (polices chargées)
        const w = ul.closest('.hl').offsetWidth * 1.06, h = 22;
        ul.ownerSVGElement.setAttribute('width', w);
        ul.ownerSVGElement.setAttribute('height', h);
        ul.setAttribute('d', `M6 ${h * 0.72} Q${w * 0.42} ${h * 0.18} ${w - 6} ${h * 0.42}`);
        ul.dataset.w = w;
      }
      ul.style.strokeDashoffset = String(1 - ease(prog(t, c.underline, c.underline + 0.5)));
    }
    if (c.type === 'signature') {
      const k = ease(prog(t, c.in, c.in + 0.5));
      el.style.opacity = String(k);
      el.style.transform = `translateY(${(1 - k) * 30}px)`;
    }
  }
}
