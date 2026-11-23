// Shared UI bits: HUD, gobstopper sockets, candy buttons, speech bubbles,
// input icons and Wonka popping in to comment.
import { P } from './palette.js';
import { W, H, rect, ellipse, circle, text, stripeRect, seg, ease, FONT, sparkle } from './engine.js';
import { drawTicket } from './chocroom.js';
import { drawWonka } from './kids.js';
import { sfx } from './audio.js';
import { MAX_LEVEL } from './save.js';

export const hit = (r, x, y) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/* --------------------------------------------------------- gobstoppers */
const GOB = [
  [P.pink1, P.pink3], [P.lilac1, P.lilac3], [P.mint1, P.mint3], [P.red2, P.pink4], [P.gold1, P.gold3],
];
export function drawGobstopper(ctx, x, y, r, filled, i = 0, t = 0, pulse = false) {
  x = Math.round(x); y = Math.round(y);
  if (!filled) {
    // empty socket
    circle(ctx, x, y, r + 1, P.ink);
    circle(ctx, x, y, r, P.choc1);
    circle(ctx, x, y + 1, r - 1, P.choc0);
    if (pulse && Math.sin(t * 8) > 0) { ctx.globalAlpha = 0.6; circle(ctx, x, y, r, P.pink3); ctx.globalAlpha = 1; }
    return;
  }
  const [c1, c2] = GOB[i % GOB.length];
  circle(ctx, x, y, r + 1, P.ink);
  circle(ctx, x, y, r, c1);
  circle(ctx, x, y, Math.max(1, r - 2), c2);
  if (r >= 4) circle(ctx, x, y, Math.max(1, r - 4), c1);
  rect(ctx, x - Math.ceil(r / 2), y - Math.ceil(r / 2), 2, 1, P.white);
}
// A row of 5 sockets centred on x.
export function drawSlots(ctx, cx, y, filled, o = {}) {
  const r = o.r ?? 3, gap = o.gap ?? 2, t = o.t ?? 0;
  const w = MAX_LEVEL * (r * 2 + 1) + (MAX_LEVEL - 1) * gap;
  let x = cx - w / 2 + r;
  for (let i = 0; i < MAX_LEVEL; i++) {
    const pop = o.popIdx === i ? 1 + Math.max(0, 1 - (o.popT ?? 1) * 3) * 0.8 : 1;
    drawGobstopper(ctx, x, y, Math.round(r * pop), i < filled, i, t, o.pulseIdx === i);
    x += r * 2 + 1 + gap;
  }
}

/* ----------------------------------------------------------------- HUD */
export const MENU_BTN = { x: 3, y: 3, w: 20, h: 18 };
export function drawMenuButton(ctx, t = 0) {
  const b = MENU_BTN;
  rect(ctx, b.x, b.y, b.w, b.h, P.ink);
  rect(ctx, b.x + 1, b.y + 1, b.w - 2, b.h - 2, P.pink1);
  rect(ctx, b.x + 1, b.y + 1, b.w - 2, 2, P.pink3);
  for (let i = 0; i < 3; i++) rect(ctx, b.x + 5, b.y + 5 + i * 4, b.w - 10, 2, P.white);
}

// Level + that game's gobstoppers on the left, golden tickets on the right.
export function drawHud(ctx, o) {
  const t = o.t ?? 0;
  if (o.level) {
    rect(ctx, 26, 3, 116, 18, 'rgba(58,20,40,0.55)');
    text(ctx, `Level ${o.level}`, 31, 13, { size: 8, align: 'left', color: P.cream, outline: P.ink, ow: 1 });
    drawSlots(ctx, 116, 12, o.filled ?? 0, { r: 3, gap: 1, t, pulseIdx: o.level - 1, popIdx: o.popIdx, popT: o.popT });
  } else if (o.label) {
    rect(ctx, 26, 3, o.label.length * 8 + 10, 18, 'rgba(58,20,40,0.55)');
    text(ctx, o.label, 31, 13, { size: 8, align: 'left', color: P.cream, outline: P.ink, ow: 1 });
  }
  if (o.lives != null) drawLives(ctx, W - 14, 12, o.lives, t, o);
}
export function drawLives(ctx, rightX, y, lives, t = 0, o = {}) {
  for (let i = 0; i < 3; i++) {
    const x = rightX - (2 - i) * 23;
    const alive = i < lives;
    if (o.lostIdx === i && (o.lostK ?? 1) < 1) {
      const k = o.lostK;
      drawTicket(ctx, x + k * 10, y + k * 30, { rot: k * 4, scale: 1 + k * 0.4, alpha: 1 - k, t });
    }
    drawTicket(ctx, x, y + (alive ? Math.round(Math.sin(t * 5 + i)) : 0), { dull: !alive, t: t + i * 0.4, alpha: alive ? 1 : 0.55 });
  }
}

/* -------------------------------------------------------------- buttons */
export function drawButton(ctx, r, label, o = {}) {
  const c1 = o.color ?? P.pink1, c2 = o.color2 ?? P.white;
  const press = o.pressed ? 1 : 0;
  rect(ctx, r.x, r.y + 3, r.w, r.h, P.ink);
  rect(ctx, r.x, r.y + press, r.w, r.h, P.ink);
  stripeRect(ctx, r.x + 2, r.y + 2 + press, r.w - 4, r.h - 4, c1, c2, 3, o.t ? o.t * 10 : 0);
  rect(ctx, r.x + 4, r.y + 4 + press, r.w - 8, r.h - 8, o.fill ?? P.cream);
  text(ctx, label, r.x + r.w / 2, r.y + r.h / 2 + 1 + press, { size: o.size ?? 8, color: o.textColor ?? P.ink });
}

/* -------------------------------------------------------------- bubbles */
export function wrap(s, maxChars) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}
// Speech bubble; `shown` = number of characters revealed (typewriter).
export function drawBubble(ctx, x, y, s, o = {}) {
  const maxChars = o.maxChars ?? 20;
  const lines = wrap(s, maxChars);
  const longest = Math.max(...lines.map((l) => l.length));
  const w = longest * 8 + 14, h = lines.length * 12 + 10;
  const bx = Math.round(o.align === 'right' ? x - w : o.align === 'center' ? x - w / 2 : x);
  const by = Math.round(y - h);
  rect(ctx, bx - 1, by - 1, w + 2, h + 2, P.ink);
  rect(ctx, bx, by, w, h, P.cream);
  rect(ctx, bx, by, w, 2, P.white);
  // tail
  const tx = o.tailX ?? (o.align === 'right' ? bx + w - 16 : bx + 14);
  for (let i = 0; i < 6; i++) { rect(ctx, tx - 1 + (o.tailDir ?? 1) * i, by + h + i - 1, 8 - i, 1, P.ink); rect(ctx, tx + (o.tailDir ?? 1) * i, by + h + i - 1, 6 - i, 1, P.cream); }
  let left = o.shown ?? Infinity;
  lines.forEach((ln, i) => {
    const part = ln.slice(0, Math.max(0, left));
    left -= ln.length + 1;
    text(ctx, part, bx + 7, by + 11 + i * 12, { size: 8, align: 'left', color: o.color ?? P.ink });
  });
  return { x: bx, y: by, w, h };
}

/* ---------------------------------------------------------- input icons */
// Tiny pixel icons explaining the control: 'tap', 'hold', 'drag'.
function finger(ctx, x, y, press = 0) {
  y += press;
  rect(ctx, x - 1, y - 1, 7, 15, P.ink);
  rect(ctx, x, y, 5, 13, P.skin);
  rect(ctx, x + 1, y + 1, 3, 2, P.pink4);
  rect(ctx, x - 5, y + 7, 15, 10, P.ink);
  rect(ctx, x - 4, y + 8, 13, 8, P.skin);
  rect(ctx, x - 4, y + 12, 13, 1, P.skinShade);
  rect(ctx, x - 4, y + 16, 13, 3, P.pearl);
}
export function drawInputIcon(ctx, kind, x, y, t) {
  x = Math.round(x); y = Math.round(y);
  rect(ctx, x - 22, y - 20, 44, 44, P.ink);
  rect(ctx, x - 21, y - 19, 42, 42, P.lilac4);
  if (kind === 'tap') {
    const ph = (t * 1.6) % 1;
    const press = ph < 0.25 ? 3 : 0;
    if (ph < 0.6) { ctx.globalAlpha = 1 - ph / 0.6; ellipse(ctx, x, y - 8, 5 + ph * 18, 2 + ph * 7, P.pink2); ctx.globalAlpha = 1; }
    circle(ctx, x, y - 8, 3, P.pink1);
    finger(ctx, x - 2, y - 7, press);
  } else if (kind === 'hold') {
    const ph = (t * 0.7) % 1;
    const n = Math.floor(ph * 12);
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 + (i / 12) * Math.PI * 2;
      rect(ctx, x + Math.cos(a) * 12 - 1, y - 6 + Math.sin(a) * 12 - 1, 3, 3, i <= n ? P.pink1 : P.lilac2);
    }
    finger(ctx, x - 2, y - 7, 3);
  } else {
    const ph = (t * 0.9) % 1;
    const dx = Math.sin(ph * Math.PI * 2) * 10;
    for (let i = 1; i < 5; i++) rect(ctx, x + dx - Math.cos(ph * Math.PI * 2) * i * 3 - 1, y - 8, 2, 2, P.pink2);
    circle(ctx, x + dx, y - 8, 3, P.pink1);
    finger(ctx, x + dx - 2, y - 7, 3);
  }
}

/* ---------------------------------------------------------- Wonka pops */
// Wonka hops in at the screen edge with a quip, then hops out.
export class WonkaPop {
  constructor(line, o = {}) {
    this.line = line;
    this.t = 0;
    this.dur = o.dur ?? 2.2;
    this.side = o.side ?? 'right';
    this.scared = !!o.scared;
    this.lastShown = 0;
    sfx('pop');
  }
  get done() { return this.t >= this.dur; }
  update(dt) {
    this.t += dt;
    const shown = Math.floor(Math.max(0, this.t - 0.2) * 32);
    if (shown > this.lastShown && shown <= this.line.length) {
      if (shown % 2 === 0 && this.line[shown - 1] !== ' ') sfx('blip');
      this.lastShown = shown;
    }
  }
  draw(ctx) {
    const t = this.t;
    const inK = seg(t, 0, 0.22, ease.outBack);
    const outK = seg(t, this.dur - 0.25, 0.25, ease.inBack);
    const k = inK - outK;
    const right = this.side === 'right';
    const x = right ? W + 30 - k * 70 : -30 + k * 70;
    const y = H + 8;
    const talking = t > 0.2 && t < 0.2 + this.line.length / 32;
    drawWonka(ctx, x, y, { t, pose: talking ? 'talk' : 'present', open: talking ? Math.abs(Math.sin(t * 22)) * 0.8 : 0, flip: right, scared: this.scared });
    if (k > 0.6) {
      drawBubble(ctx, right ? x - 14 : x + 14, 160, this.line, {
        align: right ? 'right' : 'left', shown: Math.floor(Math.max(0, t - 0.2) * 32), maxChars: 22, tailDir: right ? 1 : -1,
      });
    }
  }
}

export { sparkle, FONT };
