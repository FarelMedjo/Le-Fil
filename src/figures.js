// Personnages et objets en 2D semi-flat : formes simples, sans ressemblance avec une personne réelle.
import { g, el } from './util.js';

export const SKIN = ['#7A4A2E', '#8D5A3B', '#5A3522', '#6B4226'];
const HAIR = '#17110D';

// Buste vu de face. Origine : milieu de la base du buste.
export function bust({ x, y, s = 1, skin = SKIN[0], top = '#45506A', hair = 'short', glasses = false, collar = '#F5F7FC', op = 1 }) {
  const shade = 'rgba(11,14,26,0.12)';
  let h = '';
  // torse
  h += el('path', { d: 'M-128 0 L-120 -150 Q-114 -208 -56 -218 L56 -218 Q114 -208 120 -150 L128 0 Z', fill: top });
  h += el('path', { d: 'M40 -218 Q114 -208 120 -150 L128 0 L70 0 Z', fill: shade });
  // cou et col
  h += el('rect', { x: -21, y: -258, width: 42, height: 52, rx: 12, fill: skin });
  h += el('rect', { x: -21, y: -232, width: 42, height: 20, fill: 'rgba(0,0,0,0.12)' });
  h += el('path', { d: 'M-44 -218 L0 -168 L44 -218 L28 -222 L0 -190 L-28 -222 Z', fill: collar });
  // tête
  if (hair === 'wrap') {
    h += el('ellipse', { cx: -62, cy: -300, rx: 11, ry: 17, fill: skin });
    h += el('ellipse', { cx: 62, cy: -300, rx: 11, ry: 17, fill: skin });
  } else {
    h += el('ellipse', { cx: -60, cy: -302, rx: 12, ry: 18, fill: skin });
    h += el('ellipse', { cx: 60, cy: -302, rx: 12, ry: 18, fill: skin });
  }
  h += el('ellipse', { cx: 0, cy: -305, rx: 60, ry: 70, fill: skin });
  h += el('path', { d: 'M20 -372 Q62 -360 60 -305 Q58 -250 0 -235 Q40 -270 38 -310 Q36 -350 20 -372Z', fill: 'rgba(0,0,0,0.10)' });
  // cheveux
  if (hair === 'short') h += el('path', { d: 'M-62 -312 Q-66 -384 0 -383 Q66 -384 62 -312 Q54 -350 0 -352 Q-54 -350 -62 -312Z', fill: HAIR });
  if (hair === 'grey') h += el('path', { d: 'M-63 -305 Q-68 -378 0 -380 Q68 -378 63 -305 Q60 -330 48 -345 Q20 -330 -2 -350 Q-30 -334 -52 -342 Q-60 -330 -63 -305Z', fill: '#B9BEC6' });
  if (hair === 'wrap') {
    h += el('path', { d: 'M-70 -298 Q-92 -404 -4 -424 Q92 -420 74 -300 Q58 -352 2 -358 Q-50 -356 -70 -298Z', fill: '#2B3245' });
    h += el('ellipse', { cx: 44, cy: -418, rx: 34, ry: 22, fill: '#353D55', transform: 'rotate(-18 44 -418)' });
    h += el('path', { d: 'M-66 -322 Q0 -366 70 -326', fill: 'none', stroke: '#5B6584', 'stroke-width': 5 });
  }
  if (hair === 'bun') {
    h += el('circle', { cx: 0, cy: -392, r: 30, fill: HAIR });
    h += el('path', { d: 'M-63 -300 Q-70 -380 0 -382 Q70 -380 63 -300 Q56 -348 0 -350 Q-56 -348 -63 -300Z', fill: HAIR });
  }
  // visage
  h += el('ellipse', { cx: -22, cy: -300, rx: 6, ry: 7.5, fill: '#120D0A' });
  h += el('ellipse', { cx: 22, cy: -300, rx: 6, ry: 7.5, fill: '#120D0A' });
  h += el('path', { d: 'M-18 -264 Q0 -252 18 -264', fill: 'none', stroke: '#120D0A', 'stroke-width': 4, 'stroke-linecap': 'round' });
  if (glasses) {
    h += el('rect', { x: -44, y: -318, width: 36, height: 30, rx: 9, fill: 'none', stroke: '#0B0E1A', 'stroke-width': 4 });
    h += el('rect', { x: 8, y: -318, width: 36, height: 30, rx: 9, fill: 'none', stroke: '#0B0E1A', 'stroke-width': 4 });
    h += el('path', { d: 'M-8 -304 L8 -304', stroke: '#0B0E1A', 'stroke-width': 4 });
  }
  return g({ transform: `translate(${x} ${y}) scale(${s})`, opacity: op }, h);
}

// Crayon tenu par une main. Origine : la mine ; le crayon part vers le bas à droite.
export function pencilHand({ x, y, angle = 58, skin = SKIN[3], sleeve = '#A9BEDA', op = 1, s = 1 }) {
  let h = '';
  h += el('polygon', { points: '300,-34 980,-60 980,250 330,150', fill: sleeve });
  h += el('polygon', { points: '300,-34 980,-60 980,-10 320,10', fill: 'rgba(255,255,255,0.18)' });
  h += el('polygon', { points: '0,0 28,-7 28,7', fill: '#2E333F' });
  h += el('polygon', { points: '28,-7 76,-16 76,16 28,7', fill: '#EAD4AE' });
  h += el('rect', { x: 76, y: -16, width: 360, height: 32, fill: '#1F2638' });
  h += el('rect', { x: 76, y: -16, width: 360, height: 9, fill: '#323B55' });
  h += el('rect', { x: 436, y: -17, width: 30, height: 34, fill: '#B9BFCA' });
  h += el('rect', { x: 466, y: -16, width: 32, height: 32, rx: 7, fill: '#E7B5A4' });
  // main
  h += el('ellipse', { cx: 250, cy: 52, rx: 92, ry: 66, fill: skin });
  h += el('ellipse', { cx: 168, cy: 22, rx: 66, ry: 21, fill: skin, transform: 'rotate(-6 168 22)' });
  h += el('ellipse', { cx: 182, cy: 58, rx: 58, ry: 20, fill: skin, transform: 'rotate(10 182 58)' });
  h += el('ellipse', { cx: 196, cy: -22, rx: 56, ry: 22, fill: skin, transform: 'rotate(-22 196 -22)' });
  h += el('path', { d: 'M150 40 Q190 34 228 50', fill: 'none', stroke: 'rgba(0,0,0,0.18)', 'stroke-width': 4, 'stroke-linecap': 'round' });
  return g({ transform: `translate(${x} ${y}) rotate(${angle}) scale(${s})`, opacity: op }, h);
}

// Gomme blanche.
export function eraser({ x, y, angle = -18, op = 1 }) {
  let h = '';
  h += el('rect', { x: -70, y: -40, width: 140, height: 80, rx: 12, fill: '#FFFFFF', stroke: '#C9CED8', 'stroke-width': 3 });
  h += el('rect', { x: -14, y: -42, width: 84, height: 84, rx: 6, fill: '#2B3245' });
  h += el('rect', { x: -14, y: -42, width: 84, height: 14, fill: '#3A4562' });
  return g({ transform: `translate(${x} ${y}) rotate(${angle})`, opacity: op }, h);
}

// Smartphone Android générique (aucun logo, aucune interface de marque).
export function phone({ x, y, w, h, r = 30, screen = '#F5F7FC', inner = '' }) {
  const b = Math.max(10, w * 0.05);
  let s = '';
  s += el('rect', { x: x + 6, y: y + 14, width: w, height: h, rx: r, fill: 'rgba(11,14,26,0.16)', filter: 'url(#blur)' });
  s += el('rect', { x, y, width: w, height: h, rx: r, fill: '#0B0E1A' });
  s += el('rect', { x: x + b, y: y + b * 2, width: w - 2 * b, height: h - 4 * b, rx: r * 0.6, fill: screen });
  s += el('circle', { cx: x + w / 2, cy: y + b, r: b * 0.32, fill: '#2B3245' });
  return s + inner;
}

// Coins de cadrage en L.
export function corners({ x, y, w, h, len = 46, color = '#C8FF3E', width = 5, op = 1 }) {
  const p = [
    `M${x} ${y + len}V${y}H${x + len}`,
    `M${x + w - len} ${y}H${x + w}V${y + len}`,
    `M${x + w} ${y + h - len}V${y + h}H${x + w - len}`,
    `M${x + len} ${y + h}H${x}V${y + h - len}`,
  ].join('');
  return el('path', { d: p, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-opacity': op, 'stroke-linecap': 'square' });
}

// Pastille d'avatar (suivi mensuel).
export function avatar({ x, y, r = 34, variant = 0, op = 1, ring = '#C8FF3E' }) {
  let h = el('circle', { r, fill: '#0B0E1A' });
  h += el('circle', { cy: -6, r: r * 0.32, fill: '#F5F7FC' });
  h += el('path', { d: `M${-r * 0.55} ${r * 0.62} Q0 ${r * 0.05} ${r * 0.55} ${r * 0.62}Z`, fill: '#F5F7FC' });
  if (variant === 1) h += el('circle', { cy: -6 - r * 0.42, r: r * 0.16, fill: '#F5F7FC' });
  h += el('circle', { r: r + 5, fill: 'none', stroke: ring, 'stroke-width': 5 });
  return g({ transform: `translate(${x} ${y})`, opacity: op }, h);
}
