// Calque texte (HTML). Les titres sont posés sur des bandes de papier adhésif qui se collent à l'écran,
// une bande par ligne ; les mots montent en cascade (de 110 % à 0, décalage de 60 ms) ; le surligneur
// lime passe derrière les passages *…*. Le carton final (slots end, cta, sign) abandonne les bandes.
import { ease, easeOut, prog, clamp } from './util.js';

const KIND = { '!': 'hero', '#': 'title', '~': 'sub', '?': 'question', '=': 'num', '-': 'info', '.': 'note' };
const STAGGER = 0.06;
const RISE = 0.5;
const EXIT = 0.22;
const STRIP_GAP = 0.09; // décalage entre deux bandes d'un même carton

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Typographie française : espace fine insécable avant ? ! : ; (le signe ne part jamais seul à la ligne).
function units(text) {
  return text.replace(/ ([?!:;])/g, ' $1').match(/(?:`[^`]*`|\*[^*]*\*|[^ `*]+)+/g) || [];
}

function unitHtml(u) {
  const inner = u.replace(/`([^`]*)`|\*([^*]*)\*|([^`*]+)/g, (m, mono, star, plain) => {
    if (mono !== undefined) return `<span class="mono">${escHtml(mono)}</span>`;
    if (star !== undefined) return unitHtml(star);
    return escHtml(plain);
  });
  return `<span class="w"><span class="wi">${inner}</span></span>`;
}

// Une ligne : les passages *…* deviennent des groupes surlignés.
function lineInner(text) {
  const parts = [];
  const re = /\*([^*]*)\*/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ hl: false, s: text.slice(last, m.index) });
    parts.push({ hl: true, s: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ hl: false, s: text.slice(last) });
  return parts.map((p) => {
    const html = units(p.s.trim()).map(unitHtml).join(' ');
    const lead = /^\s/.test(p.s) ? ' ' : '', trail = /\s$/.test(p.s) ? ' ' : '';
    return p.hl ? `${lead}<span class="hl"><span class="mark"></span>${html}</span>${trail}` : `${lead}${html}${trail}`;
  }).join('');
}

function checkSvg() {
  return '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="23"/><path d="M13 25l7.5 7.5L36 16" pathLength="1"/></svg>';
}

function cardHtml(c, src) {
  if (c.type === 'pill') return `<div class="pill">${units(src[0]).map((u) => u.replace(/`([^`]*)`/g, '<span class="mono">$1</span>')).join(' ')}</div>`;
  if (c.type === 'checks') {
    const [title, ...items] = src;
    return `<div class="strip title" data-i="0">${lineInner(title.slice(2))}</div>` +
      `<div class="checks">${items.map((it) => `<div class="chk">${checkSvg()}<span>${escHtml(it)}</span></div>`).join('')}</div>`;
  }
  const tape = c.slot === 'top';
  let html = '';
  if (c.step) html += `<div class="step">${c.step}</div>`;
  html += src.map((line, i) => {
    const kind = KIND[line[0]];
    const inner = lineInner(line.slice(2));
    const long = line.replace(/[`*]/g, '').length > 24 ? ' long' : '';
    return tape ? `<div class="strip ${kind}${long}" data-i="${i}">${inner}</div>` : `<div class="line ${kind}">${inner}</div>`;
  }).join('');
  return html;
}

export function buildText(container, lang, schedule, positions, wide = false) {
  const cards = [];
  const slots = {};
  container.innerHTML = '';
  for (const c of schedule) {
    const key = `${c.slot}:${c.stack || c.id}`;
    if (!slots[key]) {
      const pos = positions[c.slot];
      const div = document.createElement('div');
      div.className = `slot slot-${c.slot}${pos.align === 'center' ? ' center' : ''}`;
      Object.assign(div.style, { left: `${pos.x}px`, top: `${pos.y}px`, width: `${pos.w}px` });
      container.appendChild(div);
      slots[key] = div;
    }
    const el = document.createElement('div');
    el.className = `card card-${c.id}${c.slot === 'top' ? ' taped' : ''}`;
    const src = (wide && c.wide?.[lang]) || c[lang] || c.fr;
    el.innerHTML = cardHtml(c, src);
    slots[key].appendChild(el);
    // rotation propre à chaque bande, alternée autour de l'inclinaison du carton
    const strips = [...el.querySelectorAll('.strip')];
    // la bande du dessus recouvre la suivante, pas l'inverse : les jambages (g, p, q) ne sont pas mangés
    strips.forEach((s, i) => { s.style.zIndex = String(20 - i); });
    strips.forEach((s, i) => { s.dataset.rot = String((c.tilt || 0) * (i % 2 ? -0.6 : 1) + (i ? (i % 2 ? 0.8 : -0.5) : 0)); s.dataset.dx = String(i % 2 ? 26 : 0); });
    cards.push({
      c, el, strips,
      step: el.querySelector('.step'),
      words: [...el.querySelectorAll('.wi')],
      checks: [...el.querySelectorAll('.chk')],
      marks: [...el.querySelectorAll('.mark')],
    });
  }
  return cards;
}

export function updateText(cards, t) {
  for (const { c, el, strips, step, words, checks, marks } of cards) {
    if (t < c.in - 0.01 || t > c.out + 0.01) { el.style.visibility = 'hidden'; continue; }
    el.style.visibility = 'visible';
    const e = ease(prog(t, c.out - EXIT, c.out));
    el.style.opacity = String(1 - e);
    el.style.transform = `translateY(${-24 * e}px)`;
    // bandes : elles se « collent » (léger écrasement, rotation qui se pose)
    strips.forEach((s, i) => {
      const t0 = c.in + i * STRIP_GAP;
      const k = prog(t, t0, t0 + 0.16);
      const r = Number(s.dataset.rot), dx = Number(s.dataset.dx);
      const sc = 1.1 - 0.1 * easeOut(k);
      s.style.opacity = String(clamp(k * 3));
      s.style.transform = `translateX(${dx}px) rotate(${r + (1 - easeOut(k)) * 3}deg) scale(${sc})`;
    });
    if (step) {
      const k = prog(t, c.in - 0.04, c.in + 0.14);
      step.style.opacity = String(clamp(k * 3));
      step.style.transform = `rotate(${-4 + (1 - easeOut(k)) * -8}deg) scale(${1.15 - 0.15 * easeOut(k)})`;
    }
    // mots en cascade
    let wi = 0;
    words.forEach((w) => {
      const strip = w.closest('.strip');
      const base = strip ? c.in + Number(strip.dataset.i) * STRIP_GAP + 0.04 : c.in;
      const k = ease(prog(t, base + wi * STAGGER, base + wi * STAGGER + RISE));
      w.style.transform = `translateY(${(1 - k) * 110}%)`;
      wi++;
    });
    // surligneur
    marks.forEach((m) => {
      const t0 = c.hl ?? c.in + 0.5;
      const k = easeOut(prog(t, t0, t0 + 0.32));
      m.style.transform = `scaleX(${k})`;
      // sur fond sombre, le mot reste blanc jusqu'au passage du surligneur, puis passe à l'encre
      m.parentElement.classList.toggle('on', k > 0.99);
    });
    checks.forEach((chk, i) => {
      const t0 = c.items[i];
      const k = ease(prog(t, t0 - 0.04, t0 + 0.26));
      chk.style.opacity = String(clamp(k * 2.5));
      chk.style.transform = `translateY(${(1 - k) * 18}px) rotate(${(i % 2 ? 1 : -1) * (1 - k) * 4}deg)`;
      chk.querySelector('path').style.strokeDashoffset = String(1 - ease(prog(t, t0 + 0.02, t0 + 0.24)));
    });
    if (c.type === 'pill') {
      const k = ease(prog(t, c.in, c.in + 0.45));
      el.style.opacity = String(k * (1 - e));
      el.style.transform = `translateY(${(1 - k) * 26}px)`;
    }
  }
}
