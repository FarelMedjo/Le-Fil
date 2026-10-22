// Le téléphone du parent : Android générique, clavier AZERTY, écrans génériques (discussion, appel,
// fiche, proposition, paiement). Aucune interface ni aucun logo d'application ou d'opérateur reproduit.
// Repère local : millimètres, centre du téléphone en (0, 0), haut de l'écran vers −y.
// L'écran va de (−35, −75) à (35, 75) ; ses contenus sont dessinés en coordonnées d'écran (0..70, 0..150).
import { el, g, n, prog, ease, easeOut, easeInOut, clamp, lerp, esc, measure, mixColor } from './util.js';
import { rect, circle, path, poly, roundRect } from './draw.js';
import { TXT } from './texts.js';
import { logoMark, portrait } from './props.js';

export const PH = { w: 76, h: 162, sw: 70, sh: 150 };
const INK = '#0B0E1A';
const CHAT_BG = '#F3F3F0';
const F = { inter: 'Inter', grotesk: 'Space Grotesk', mono: 'JetBrains Mono' };

const text = (str, x, y, { size = 3, weight = 500, fill = INK, anchor = 'start', family = F.inter, op = 1, spacing } = {}) =>
  el('text', { x: n(x), y: n(y), 'font-family': family, 'font-weight': weight, 'font-size': size, fill, 'text-anchor': anchor, opacity: op < 1 ? n(op) : undefined, 'letter-spacing': spacing }, esc(str));

// Découpe un texte en lignes d'une largeur donnée (mm), à la taille donnée.
const wrapMemo = new Map();
function wrap(str, width, size, weight = 500) {
  const key = `${str}|${width}|${size}|${weight}`;
  if (wrapMemo.has(key)) return wrapMemo.get(key);
  const font = `${weight} ${size * 10}px Inter`;
  const words = str.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const tryL = cur ? cur + ' ' + w : w;
    if (measure(tryL, font) / 10 > width && cur) { lines.push(cur); cur = w; } else cur = tryL;
  }
  if (cur) lines.push(cur);
  wrapMemo.set(key, lines);
  return lines;
}
const textW = (str, size, weight = 500) => measure(str, `${weight} ${size * 10}px Inter`) / 10;

function statusBar(time, dark = false) {
  const c = dark ? '#F5F7FC' : INK;
  let s = text(time, 5, 4.6, { size: 2.5, weight: 600, fill: c });
  // réseau, batterie
  for (let i = 0; i < 4; i++) s += rect(50 + i * 1.6, 4.4 - (i + 1) * 0.7, 1, (i + 1) * 0.7, { fill: c });
  s += rect(58, 1.9, 6.2, 3, { rx: 0.7, fill: 'none', stroke: c, 'stroke-width': 0.35 }) + rect(58.6, 2.5, 4.2, 1.8, { rx: 0.3, fill: c });
  return s;
}

function header(T, time = T.now) {
  let s = rect(0, 0, 70, 21, { fill: '#FFFFFF' });
  s += statusBar(time);
  s += path('M5.5 13.5l2.6-2.6M5.5 13.5l2.6 2.6M5.5 13.5h5', { stroke: INK, 'stroke-width': 0.6, 'stroke-linecap': 'round', fill: 'none' });
  s += circle(18, 13.5, 4.4, { fill: '#05070F' }) + g({ transform: 'translate(18 13.9) scale(0.072)' }, logoMark({ center: true }));
  s += text(T.contact, 24.5, 13, { size: 3.3, weight: 600 });
  s += text(T.online, 24.5, 16.6, { size: 2.2, weight: 500, fill: '#7A8194' });
  s += rect(0, 20.8, 70, 0.25, { fill: '#E2DED3' });
  return s;
}

function bubble(lines, { out, y, time, size = 3.2, op = 1, dy = 0 }) {
  const lh = size * 1.32;
  const w = Math.max(...lines.map((l) => textW(l, size))) + 6.5;
  const h = lines.length * lh + 6.2;
  const x = out ? 70 - 3 - w : 3;
  let s = path(roundRect(x, y, w, h, 2.6), { fill: out ? INK : '#FFFFFF' });
  lines.forEach((l, i) => { s += text(l, x + 3.2, y + 3.4 + size * 0.86 + i * lh, { size, fill: out ? '#F5F7FC' : INK }); });
  if (time) s += text(time, x + w - 2.4, y + h - 1.3, { size: 1.7, anchor: 'end', fill: out ? '#9AA3B8' : '#8A8F9C' });
  return { svg: g({ opacity: op < 1 ? n(op) : undefined, transform: dy ? `translate(0 ${n(dy)})` : undefined }, s), h };
}

const KEYS_Y = 100;
function keyboard(T, active) {
  let s = rect(0, KEYS_Y - 2, 70, 52, { fill: '#D9DCE3' });
  const rows = T.keyboard;
  const kw = 6.2, kh = 8.4, gap = 0.7;
  const keyPos = {};
  rows.forEach((row, r) => {
    const total = row.length * kw + (row.length - 1) * gap;
    const x0 = (70 - total) / 2 + (r === 2 ? 0 : 0);
    [...row].forEach((ch, i) => {
      const x = x0 + i * (kw + gap), y = KEYS_Y + r * (kh + 1.6);
      keyPos[ch] = [x + kw / 2, y + kh / 2];
      const on = active === ch;
      s += path(roundRect(x, y, kw, kh, 1), { fill: on ? '#AEB5C3' : '#FFFFFF' });
      s += text(ch, x + kw / 2, y + kh / 2 + 1.1, { size: 3, anchor: 'middle', weight: 400 });
    });
  });
  // barre d'espace et touches spéciales
  const yb = KEYS_Y + 3 * (kh + 1.6);
  s += path(roundRect(2.5, yb, 10, kh, 1), { fill: '#B8BEC9' }) + text('?123', 7.5, yb + 5.4, { size: 2.2, anchor: 'middle' });
  s += path(roundRect(14, yb, 38, kh, 1), { fill: active === ' ' ? '#AEB5C3' : '#FFFFFF' });
  s += path(roundRect(53.5, yb, 14, kh, 1), { fill: '#B8BEC9' });
  keyPos[' '] = [33, yb + kh / 2];
  // aperçu de la touche enfoncée
  if (active && active !== ' ' && keyPos[active]) {
    const [kx, ky] = keyPos[active];
    s += path(roundRect(kx - 4.2, ky - 15, 8.4, 10, 1.4), { fill: '#FFFFFF', filter: 'url(#sh0)', opacity: 0.4 });
    s += path(roundRect(kx - 4.2, ky - 15.5, 8.4, 10, 1.4), { fill: '#FFFFFF' });
    s += text(active, kx, ky - 8.4, { size: 4.6, anchor: 'middle', weight: 500 });
  }
  return s;
}

function inputBar(typed, y, caret) {
  const lines = typed ? wrap(typed, 46, 2.75) : [];
  const lh = 2.75 * 1.32;
  const h = Math.max(9, lines.length * lh + 5);
  let s = path(roundRect(3, y - h, 54, h, 4.5), { fill: '#EEEFF2' });
  if (!typed) s += text('Message', 7, y - h / 2 + 1, { size: 2.75, fill: '#9AA0AC' });
  lines.forEach((l, i) => { s += text(l, 7, y - h + 2.5 + 2.4 + i * lh, { size: 2.75 }); });
  if (caret && lines.length) {
    const last = lines.at(-1);
    const cx = 7 + textW(last, 2.75) + 0.4;
    s += rect(cx, y - h + 2.5 + (lines.length - 1) * lh, 0.3, 3.2, { fill: '#2F6FD0' });
  }
  // bouton d'envoi : avion en papier générique
  s += circle(62.5, y - 4.5, 4.5, { fill: INK });
  s += path('M60.2 -2.2L65.2 -4.5L60.2 -6.8L60.9 -4.5Z', { fill: '#F5F7FC', transform: `translate(0 ${n(y)})` });
  return s;
}

// ---------- écrans ----------

// Discussion : frappe du message (0:08,25 → 0:09,6), envoi (0:09,75), réponse le soir même (0:10,75).
export const TYPE = [8.25, 9.6];
export const SEND = 9.75, REPLY = 10.75;
export function typedAt(t, T) {
  const k = prog(t, TYPE[0], TYPE[1]);
  return T.msg.slice(0, Math.round(k * T.msg.length));
}
// Instants de frappe de chaque caractère (pour les sons du clavier).
export function keyTimes(lang = 'fr') {
  const msg = TXT[lang].msg;
  return [...msg].map((ch, i) => ({ t: TYPE[0] + ((i + 0.5) / msg.length) * (TYPE[1] - TYPE[0]), ch }));
}

function chat(t, T) {
  let s = rect(0, 0, 70, 150, { fill: CHAT_BG });
  const typing = t < SEND;
  const kbUp = 1 - ease(prog(t, SEND, SEND + 0.3));
  // clavier fermé, la discussion s'arrête au-dessus de la marge basse du cadre (le bas de l'écran est hors zone sûre)
  const bottom = lerp(132, KEYS_Y - 3, kbUp);
  // bulles, empilées depuis le bas de la zone de discussion
  const items = [];
  if (t >= SEND) {
    const lines = wrap(T.msg, 50, 3.2);
    items.push({ kind: 'out', lines, time: '21:04', at: SEND });
  }
  if (t >= REPLY) items.push({ kind: 'in', lines: wrap(T.reply, 50, 3.2), time: '21:06', at: REPLY });
  let y = bottom - 13;
  const parts = [];
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    const k = easeOut(prog(t, it.at, it.at + 0.35));
    const b = bubble(it.lines, { out: it.kind === 'out', y: 0, time: it.time });
    y -= b.h;
    parts.push(g({ transform: `translate(0 ${n(y + (1 - k) * 6)})`, opacity: n(clamp(k * 1.4)) }, b.svg));
    y -= 2.2;
  }
  s += parts.join('');
  // « écrit… » avant la réponse
  if (t > SEND + 0.45 && t < REPLY) {
    const ph = (t * 3) % 1;
    let dots = '';
    for (let i = 0; i < 3; i++) dots += circle(9 + i * 2.4, bottom - 17.5, 0.75, { fill: '#8A8F9C', opacity: n(0.4 + 0.6 * Math.max(0, Math.sin((ph - i / 3) * Math.PI * 2))) });
    s += path(roundRect(3, bottom - 21, 15, 7, 3), { fill: '#FFFFFF' }) + dots;
  }
  s += rect(0, bottom - 13, 70, 163 - bottom, { fill: '#FFFFFF' });
  s += inputBar(typing ? typedAt(t, T) : '', bottom - 2, typing && t > TYPE[0]);
  if (kbUp > 0.001) {
    const typed = typedAt(t, T);
    const active = typing && t > TYPE[0] && t < TYPE[1] ? (typed.at(-1) || '').toLowerCase() : null;
    s += g({ transform: `translate(0 ${n((1 - kbUp) * 60)})` }, keyboard(T, active && /[a-z ]/.test(active) ? active : null));
  }
  s += header(T, t < REPLY ? T.now : '21:06');
  return s;
}

// Appel entrant (0:12,0), décroché (0:13,0), fiche remplie un champ par temps, envoi, proposition.
export const RING = 12.0, ANSWER = 13.0, FIELDS = [13.25, 13.75, 14.25, 14.75], SENT = 15.1, PROPOSAL = 15.5;
function call(t, T) {
  let s = '';
  const inCall = t >= ANSWER;
  s += rect(0, 0, 70, 150, { fill: '#0E1430' });
  s += el('ellipse', { cx: 35, cy: 40, rx: 60, ry: 50, fill: '#1E2A5C', opacity: 0.6 });
  s += statusBar('08:40', true);
  const shrink = ease(prog(t, ANSWER, ANSWER + 0.45));
  // le lendemain : le jour s'affiche en haut de l'écran d'appel
  if (shrink < 1) s += text(T.day, 35, 11, { size: 2.4, weight: 600, fill: '#AEB8D6', anchor: 'middle', op: 1 - shrink });
  // avatar
  const ay = lerp(42, 15, shrink), ar = lerp(11, 4.6, shrink);
  if (!inCall || shrink < 1) {
    const pulse = !inCall ? (t - RING) % 0.5 / 0.5 : 0;
    if (!inCall) s += circle(35, ay, ar + 3 + pulse * 7, { fill: 'none', stroke: '#F5F7FC', 'stroke-width': 0.4, opacity: n(0.8 * (1 - pulse)) });
  }
  s += circle(lerp(35, 10, shrink), ay, ar, { fill: '#05070F', stroke: '#2B3560', 'stroke-width': 0.4 });
  s += g({ transform: `translate(${n(lerp(35, 10, shrink))} ${n(ay + ar * 0.08)}) scale(${n(ar * 0.0164)})` }, logoMark({ center: true }));
  // nom et sous-titre glissent du centre vers la gauche (calés par leur bord gauche : pas de saut)
  const nameSize = lerp(4.6, 3, shrink), subSize = lerp(2.6, 2.1, shrink);
  s += text(T.contact, lerp(35 - textW(T.contact, 4.6, 600) / 2, 17, shrink), lerp(60, 14, shrink), { size: nameSize, weight: 600, fill: '#F5F7FC' });
  // l'entretien passe en accéléré : le chronomètre part de 00:00
  const sec = Math.floor(Math.max(0, t - ANSWER) * 96);
  const chrono = `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  const sub = inCall ? `${T.callTitle} · ${chrono}` : `${T.incoming} · ${T.callTitle}`;
  const sub0 = `${T.incoming} · ${T.callTitle}`;
  s += text(sub, lerp(35 - textW(sub0, 2.6) / 2, 17, shrink), lerp(66, 17.8, shrink), { size: subSize, fill: '#AEB8D6' });
  if (!inCall || shrink < 1) {
    const o = 1 - shrink;
    const tap = clamp(1 - Math.abs(t - (ANSWER - 0.05)) * 8);
    s += g({ opacity: n(o) }, circle(18, 128, 6.5, { fill: '#E5484D' }) + path('M15 128.6h6', { stroke: '#FFF', 'stroke-width': 1, 'stroke-linecap': 'round' }) +
      circle(52, 128, 6.5 + tap * 1.2, { fill: '#3BB273' }) + path('M49.5 126.5q2.5 4 5 0', { stroke: '#FFF', 'stroke-width': 1, fill: 'none', 'stroke-linecap': 'round' }));
  }
  // fiche « Votre demande »
  if (inCall) {
    const k = easeOut(prog(t, ANSWER + 0.1, ANSWER + 0.5));
    const prop = ease(prog(t, PROPOSAL, PROPOSAL + 0.3));
    let f = path(roundRect(4, 25, 62, 96, 3), { fill: '#FFFFFF' });
    f += text(T.form, 9, 34, { size: 3.4, weight: 700, family: F.grotesk });
    T.fields.forEach(([lab, val], i) => {
      const y = 44 + i * 18;
      const on = prog(t, FIELDS[i], FIELDS[i] + 0.25);
      f += text(lab.toUpperCase(), 9, y, { size: 1.9, weight: 600, fill: '#7A8194', spacing: 0.2 });
      f += rect(9, y + 6.3, 52, 0.25, { fill: '#E1E4EA' });
      if (on > 0) {
        const lines = wrap(val, 46, 2.7, 600);
        lines.forEach((l, j) => { f += text(l, 9, y + 4.2 + j * 3.4, { size: 2.7, weight: 600, op: clamp(on * 2) }); });
        // coche
        const ck = ease(prog(t, FIELDS[i], FIELDS[i] + 0.2));
        f += circle(59, y + 1.5, 2.2, { fill: '#0B0E1A', opacity: n(ck) }) +
          path('M57.9 101.6l0.8 0.8 1.6-1.7', { transform: `translate(0 ${n(y + 1.5 - 101.4)})`, stroke: '#F5F7FC', 'stroke-width': 0.55, fill: 'none', 'stroke-linecap': 'round', opacity: n(ck) });
      }
    });
    const snt = ease(prog(t, SENT, SENT + 0.25));
    if (snt > 0) f += g({ opacity: n(snt) }, path(roundRect(9, 109, 52, 8, 4), { fill: '#0B0E1A' }) + text(`${T.sent} ✓`, 35, 114.2, { size: 2.6, weight: 600, fill: '#F5F7FC', anchor: 'middle' }));
    s += g({ transform: `translate(0 ${n((1 - k) * 30 - prop * 120)})`, opacity: n(k) }, f);
  }
  return s;
}

// Proposition : trois fiches miniatures ; à 0:16,0 elles se soulèvent de l'écran et deviennent les
// fiches posées sur la table (src/world.js, cardPoses).
export const MINI = (i) => [35, 53 + i * 26];
function proposal(t, T) {
  let s = rect(0, 0, 70, 150, { fill: CHAT_BG });
  s += header(T, '18:15'); // quelques jours plus tard
  const k = ease(prog(t, PROPOSAL, PROPOSAL + 0.35));
  s += g({ opacity: n(k) }, text(T.proposal, 6, 31, { size: 3.6, weight: 700, family: F.grotesk }) + text(T.proposalSub, 6, 35.6, { size: 2.3, fill: '#6B7180' }));
  const colors = ['#3157A6', '#2F8A68', '#C65A36'];
  for (let i = 0; i < 3; i++) {
    const ki = easeOut(prog(t, PROPOSAL + 0.08 * i, PROPOSAL + 0.08 * i + 0.3));
    const lifted = t >= 16.0 + i * 0.12;
    if (ki <= 0 || lifted) continue;
    const [cx, cy] = MINI(i);
    let c = path(roundRect(cx - 29, cy - 11, 58, 22, 2.4), { fill: '#FFFFFF' });
    c += path(`M${cx - 29} ${cy - 8.6}a2.4 2.4 0 0 1 2.4 -2.4h3.6v22h-3.6a2.4 2.4 0 0 1 -2.4 -2.4z`, { fill: colors[i] });
    c += g({ transform: `translate(${cx - 14} ${cy})` }, portrait(i, 6.4));
    c += text(T.subjects[i], cx - 5, cy - 0.6, { size: 3, weight: 700, family: F.grotesk });
    c += text(T.spec + ' · ✓', cx - 5, cy + 4.2, { size: 2.1, fill: '#6B7180' });
    s += g({ opacity: n(ki), transform: `translate(0 ${n((1 - ki) * 8)})` }, c);
  }
  return s;
}

// Paiement mensuel (0:45,5 → 0:48).
export const PAY_TAP = 46.25, PAY_OK = 46.5;
function payment(t, T) {
  let s = rect(0, 0, 70, 150, { fill: '#FFFFFF' });
  s += statusBar('19:30');
  s += text(T.pay, 6, 18, { size: 4.2, weight: 700, family: F.grotesk });
  s += rect(6, 22, 58, 0.25, { fill: '#E1E4EA' });
  // récapitulatif : uniquement les promesses du flyer
  T.payRows.forEach(([lab, val], i) => {
    const y = 31 + i * 8.4;
    s += text(lab, 6, y, { size: 2.4, fill: '#7A8194' }) + text(val, 64, y, { size: 2.8, weight: 600, anchor: 'end' });
    s += rect(6, y + 3, 58, 0.2, { fill: '#EEF0F3' });
  });
  const tap = Math.exp(-(((t - PAY_TAP) / 0.07) ** 2)); // le pouce appuie
  const k = easeInOut(prog(t, PAY_OK, PAY_OK + 0.32)); // le bouton devient la coche
  const bw = lerp(58, 26, k) * (1 - 0.04 * tap), bh = lerp(11, 26, k) * (1 - 0.08 * tap), cy = lerp(129.5, 90, k);
  s += path(roundRect(35 - bw / 2, cy - bh / 2, bw, bh, Math.min(bw, bh) / 2), { fill: mixColor('#0B0E1A', '#4ADE80', k) });
  if (tap > 0.05 && k <= 0) s += path(roundRect(35 - bw / 2, cy - bh / 2, bw, bh, bh / 2), { fill: '#FFFFFF', opacity: n(0.18 * tap) });
  if (k < 0.5) s += text(T.confirm, 35, cy + 1.7, { size: 3, weight: 600, fill: '#F5F7FC', anchor: 'middle', op: 1 - k * 2 });
  if (k > 0) {
    const ck = ease(prog(t, PAY_OK + 0.25, PAY_OK + 0.5));
    s += path('M29 90.5l4.4 4.4 8-8.8', { fill: 'none', stroke: '#0B0E1A', 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': 20, 'stroke-dashoffset': n(20 * (1 - ck)) });
    s += text(T.paid, 35, 113, { size: 3.2, weight: 600, anchor: 'middle', op: ease(prog(t, PAY_OK + 0.3, PAY_OK + 0.6)) });
    const ring = prog(t, 47.0, 47.7);
    if (ring > 0 && ring < 1) s += circle(35, 90, 13 + 12 * ease(ring), { fill: 'none', stroke: '#4ADE80', 'stroke-width': 0.8, opacity: n(1 - ring) });
  }
  return s;
}

// Contenu de l'écran à l'instant t.
export function screen(t, lang, mode) {
  const T = TXT[lang];
  if (mode === 'pay') return payment(t, T);
  if (mode === 'off') return rect(0, 0, 70, 150, { fill: '#0A0D16' });
  if (t < RING) return chat(t, T);
  if (t < PROPOSAL) return call(t, T);
  return proposal(t, T);
}

// L'écran seul : il émet sa propre lumière, il n'est pas assombri par la pièce.
export function phoneScreen(t, lang, { mode = 'chat', on = 1 } = {}) {
  if (on <= 0) return '';
  return `<clipPath id="scr2"><path d="${roundRect(-35, -75, 70, 150, 6)}"/></clipPath>` +
    g({ 'clip-path': 'url(#scr2)', opacity: on < 1 ? n(on) : undefined },
      g({ transform: 'translate(-35 -75)' }, screen(t, lang, mode)) + path('M-35 -75 L10 -75 L-35 10 Z', { fill: '#FFFFFF', opacity: 0.045 }));
}

// Le téléphone entier ; `on` : écran allumé (0 → 1).
export function phone(t, lang, { mode = 'chat', on = 1 } = {}) {
  let s = '';
  s += path(roundRect(-38, -81, 76, 162, 9), { fill: '#141823' });
  s += path(roundRect(-37.3, -80.3, 74.6, 160.6, 8.4), { fill: 'none', stroke: '#3A4152', 'stroke-width': 0.6 });
  // boutons latéraux
  s += rect(38, -40, 1.2, 14, { rx: 0.6, fill: '#2A2F3B' }) + rect(38, -20, 1.2, 8, { rx: 0.6, fill: '#2A2F3B' });
  s += `<clipPath id="scr"><path d="${roundRect(-35, -75, 70, 150, 6)}"/></clipPath>`;
  s += g({ 'clip-path': 'url(#scr)' },
    rect(-35, -75, 70, 150, { fill: '#0A0D16' }) +
    (on > 0 ? g({ transform: 'translate(-35 -75)', opacity: on < 1 ? n(on) : undefined }, screen(t, lang, mode)) : '') +
    // reflet de la vitre
    path('M-35 -75 L10 -75 L-35 10 Z', { fill: '#FFFFFF', opacity: 0.045 }));
  s += circle(0, -71.6, 1.3, { fill: '#05070F' });
  return s;
}
