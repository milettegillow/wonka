// The factory exterior: an enormous building, smoking chimneys, a high wall
// and tall iron gates, in winter snow at candy-coloured dusk.
import { P } from './palette.js';
import { W, H, rect, ellipse, circle, sparkle } from './engine.js';

export const GATE = { x: 192, y: 118, w: 96, h: 116 }; // tappable gate area

const layers = {};
function build(night) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // sky bands
  const sky = night ? [P.berry0, P.lilac0, '#6b3388', P.plum1, P.plum2] : [P.lilac2, P.lilac3, P.pink3, P.pink4, P.lemon2];
  for (let y = 0; y < 200; y++) {
    const i = Math.min(sky.length - 1, Math.floor(y / 36));
    r(0, y, W, 1, sky[i]);
    if (y % 36 === 35 && i < sky.length - 1) for (let x = y % 2; x < W; x += 2) r(x, y, 1, 1, sky[i + 1]);
  }
  if (night) for (let i = 0; i < 60; i++) r((i * 97) % W, (i * 41) % 120, 1, 1, P.white);
  // distant town rooftops
  for (let x = 0; x < W; x += 22) {
    const h = 14 + ((x * 7) % 19);
    r(x, 200 - h, 20, h, night ? '#3b2152' : P.lilac2);
    r(x + 8, 200 - h - 6, 3, 6, night ? '#3b2152' : P.lilac2);
  }
  // the enormous factory
  const body = night ? P.plum0 : P.pink0, body2 = night ? '#5c1a48' : '#c8326f', brick = night ? '#3a0e2c' : '#951650';
  r(14, 92, 452, 120, P.ink);
  r(16, 94, 448, 118, body);
  for (let y = 98; y < 210; y += 6) for (let x = 16 + ((y / 6) % 2) * 6; x < 462; x += 12) r(x, y, 8, 1, brick);
  // stepped upper storeys
  r(60, 64, 360, 30, P.ink); r(62, 66, 356, 28, body2);
  r(140, 40, 200, 26, P.ink); r(142, 42, 196, 24, body);
  for (let y = 46; y < 92; y += 6) for (let x = 64 + ((y / 6) % 2) * 6; x < 416; x += 12) if (y > 66 || (x > 142 && x < 336)) r(x, y, 8, 1, brick);
  // rows of glowing windows
  const glow = night ? P.gold2 : P.lemon2;
  for (const [y0, x0, x1] of [[104, 24, 456], [140, 24, 456], [72, 70, 410], [48, 150, 330]]) {
    for (let x = x0; x < x1; x += 22) {
      if (y0 > 100 && x > 176 && x < 296) continue;
      r(x, y0, 12, 16, P.ink); r(x + 1, y0 + 1, 10, 14, glow); r(x + 1, y0 + 8, 10, 1, P.ink); r(x + 6, y0 + 1, 1, 14, P.ink);
      r(x + 1, y0 + 1, 3, 3, P.white);
    }
  }
  // chimney stacks
  for (const [x, top, w] of [[40, 24, 14], [88, 10, 16], [176, 4, 14], [300, 8, 14], [380, 14, 18], [432, 30, 12]]) {
    r(x - 1, top, w + 2, 100 - top, P.ink);
    r(x, top + 1, w, 100 - top, night ? '#4b1a3f' : P.raspberry);
    r(x, top + 1, 3, 100 - top, night ? '#6b2a5a' : P.pink1);
    r(x - 3, top, w + 6, 5, P.ink); r(x - 2, top + 1, w + 4, 3, night ? '#6b2a5a' : P.pink2);
  }
  // high wall + snow on top
  r(0, 176, W, 50, P.ink);
  r(0, 178, W, 48, night ? '#4a2a4a' : P.lilac1);
  for (let y = 182; y < 226; y += 7) for (let x = ((y / 7) % 2) * 9; x < W; x += 18) r(x, y, 16, 1, night ? '#3a1e3a' : P.lilac0);
  for (let x = 0; x < W; x++) { const s = 3 + Math.round(Math.sin(x * 0.3) * 1.5); r(x, 176 - s + 2, 1, s, P.white); }
  // gate posts with gold balls
  for (const px of [GATE.x - 18, GATE.x + GATE.w + 4]) {
    r(px, 100, 14, 134, P.ink); r(px + 1, 101, 12, 133, night ? '#5a2a5a' : P.lilac0);
    r(px - 2, 98, 18, 6, P.ink); r(px - 1, 99, 16, 4, P.lilac2);
  }
  // snowy ground
  r(0, 226, W, H - 226, P.white);
  for (let i = 0; i < 80; i++) r((i * 61) % W, 230 + ((i * 17) % 38), 3, 1, P.lilac4);
  r(GATE.x + 10, 232, GATE.w - 20, 40, P.pink4); // path through the gates
  return c;
}

function gateLeaf(ctx, x, y, w, h, flip, night) {
  // iron bars with curly tops, gold W crest at the meeting point
  const iron = night ? '#22102a' : P.grape;
  ctx.fillStyle = iron;
  ctx.fillRect(Math.round(x), y + 6, Math.max(1, Math.round(w)), 4);
  ctx.fillRect(Math.round(x), y + h - 30, Math.max(1, Math.round(w)), 4);
  ctx.fillRect(Math.round(x), y + h - 6, Math.max(1, Math.round(w)), 4);
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const bx = Math.round(x + (w * i) / n);
    const top = y - 8 + Math.round(Math.abs(Math.sin(i * 0.9)) * 6);
    ctx.fillStyle = iron;
    ctx.fillRect(bx, top, 2, h - (top - y));
    ellipse(ctx, bx + 1, top - 2, 2, 2, iron);
    rect(ctx, bx, top - 4, 2, 1, P.gold1);
  }
  if (w > 10 && !flip) {
    const cx = x + w;
    circle(ctx, cx, y + h / 2 - 10, 9, P.gold0);
    circle(ctx, cx, y + h / 2 - 10, 8, P.gold1);
    rect(ctx, cx - 5, y + h / 2 - 13, 2, 6, P.gold0); rect(ctx, cx - 1, y + h / 2 - 11, 2, 4, P.gold0); rect(ctx, cx + 3, y + h / 2 - 13, 2, 6, P.gold0);
    rect(ctx, cx - 4, y + h / 2 - 8, 8, 2, P.gold0);
  }
}

export function drawFactory(ctx, t, o = {}) {
  const night = !!o.night;
  const key = night ? 'n' : 'd';
  if (!layers[key]) layers[key] = build(night);
  ctx.drawImage(layers[key], 0, 0);
  // chimney smoke puffs in pastel
  const stacks = [[47, 24], [96, 10], [183, 4], [307, 8], [389, 14], [438, 30]];
  stacks.forEach(([x, y], i) => {
    for (let k = 0; k < 5; k++) {
      const ph = (t * 0.25 + k / 5 + i * 0.13) % 1;
      const px = x + Math.sin(ph * 5 + i) * 4 + ph * 30;
      const py = y - ph * 60;
      const rr = 3 + ph * 9;
      ctx.globalAlpha = 0.85 * (1 - ph);
      circle(ctx, px, py, rr, [P.pink4, P.lilac4, P.cream][(i + k) % 3]);
      ctx.globalAlpha = 1;
    }
  });
  // glow behind the gates as they open
  const open = o.gateOpen ?? 0;
  if (open > 0) {
    ctx.globalAlpha = Math.min(1, open * 1.5);
    rect(ctx, GATE.x, GATE.y, GATE.w, GATE.h - 2, P.gold2);
    rect(ctx, GATE.x + 10, GATE.y + 10, GATE.w - 20, GATE.h - 12, P.gold3);
    ctx.globalAlpha = 1;
  }
  const half = GATE.w / 2;
  const lw = half * (1 - open * 0.85);
  const jig = o.jiggle ? Math.round(Math.sin(t * 40) * o.jiggle) : 0;
  gateLeaf(ctx, GATE.x + GATE.w - lw - jig, GATE.y, lw, GATE.h, true, night);
  gateLeaf(ctx, GATE.x + jig, GATE.y, lw, GATE.h, false, night);
  // pulse hint around the gates
  if (o.hint) {
    const k = (t * 1.2) % 1;
    ctx.globalAlpha = (1 - k) * 0.8;
    ctx.strokeStyle = P.gold2;
    ctx.lineWidth = 2;
    ctx.strokeRect(GATE.x - 4 - k * 8, GATE.y - 12 - k * 8, GATE.w + 8 + k * 16, GATE.h + 14 + k * 16);
    ctx.globalAlpha = 1;
  }
  // falling snow
  for (let i = 0; i < 70; i++) {
    const x = ((i * 53 + Math.sin(t + i) * 12 + t * 8) % (W + 10) + W + 10) % (W + 10) - 5;
    const y = ((i * 37 + t * (14 + (i % 4) * 6)) % (H + 10)) - 5;
    rect(ctx, x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1, P.white);
  }
  if (night && o.fireworks) {
    for (let i = 0; i < 4; i++) {
      const ph = (t * 0.45 + i * 0.27) % 1;
      const fx = 60 + ((i * 131) % 360), fy = 30 + ((i * 47) % 50);
      if (ph < 0.25) { rect(ctx, fx, fy + (0.25 - ph) * 300, 1, 4, P.gold2); continue; }
      const k = (ph - 0.25) / 0.75;
      for (let j = 0; j < 14; j++) {
        const a = (j / 14) * Math.PI * 2;
        const rr = k * 30;
        ctx.globalAlpha = 1 - k;
        sparkle(ctx, fx + Math.cos(a) * rr, fy + Math.sin(a) * rr + k * k * 10, 1, [P.pink2, P.gold2, P.mint2, P.lilac2][i]);
      }
      ctx.globalAlpha = 1;
    }
  }
}
