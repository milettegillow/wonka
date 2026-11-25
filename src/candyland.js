// Candy-land Chocolate Room for the menu: pastel sky with cotton-candy
// clouds, gumdrop hills, sprinkle meadows, candy-cane fences, lollipop and
// ice-cream-cone trees, wrapped sweets, peppermint swirls, giant lollipops
// and the chocolate river with its waterfall. Busy at the edges, calm in the
// middle where the boat sits.
import { P, mix } from './palette.js';
import { W, H, rect, ellipse, circle, sparkle } from './engine.js';

// Baby blues for the sky and lollipops.
export const SKY = { b0: '#86bde8', b1: '#a9d6f5', b2: '#d2ebfb', b3: '#eaf6fd' };
const LEMON = '#fff0b8';

export const RIVER_T = 150, RIVER_B = 208;
export const bankTop = (x) => Math.round(RIVER_T + Math.sin(x * 0.03 + 1) * 3 + Math.sin(x * 0.11) * 1);
export const bankBot = (x) => Math.round(RIVER_B + Math.sin(x * 0.025 + 2) * 3 + Math.sin(x * 0.09) * 1);

export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };

/* --------------------------------------------------------------- lollipops */
// Swirled lollipop head, pre-rendered once per colour scheme and size.
const lolliCache = new Map();
function lolliHead(r, cols) {
  const key = r + cols.join();
  if (lolliCache.has(key)) return lolliCache.get(key);
  const [c, g] = mk(r * 2 + 3, r * 2 + 3);
  const o = r + 1;
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
    const d = Math.hypot(x + 0.5, y + 0.5);
    if (d > r + 1) continue;
    let col;
    if (d > r) col = P.ink;
    else {
      const a = Math.atan2(y, x) / (Math.PI * 2);
      const band = Math.floor((a * 2 + d / (r * 0.38)) * 2);
      col = cols[((band % cols.length) + cols.length) % cols.length];
      if (d > r - 1.2) col = mix(col, P.ink, 0.25);
    }
    g.fillStyle = col; g.fillRect(x + o, y + o, 1, 1);
  }
  // glossy highlight
  g.fillStyle = 'rgba(255,255,255,0.75)';
  g.fillRect(o - Math.round(r * 0.55), o - Math.round(r * 0.6), Math.max(2, Math.round(r * 0.35)), Math.max(1, Math.round(r * 0.18)));
  g.fillRect(o - Math.round(r * 0.65), o - Math.round(r * 0.35), Math.max(1, Math.round(r * 0.15)), Math.max(1, Math.round(r * 0.2)));
  lolliCache.set(key, c);
  return c;
}
export const LOLLI = {
  pink: [P.pink1, P.white, P.pink2, P.white],
  lilac: [P.lilac1, P.lilac4, P.lilac2, P.white],
  blue: [SKY.b0, P.white, SKY.b1, P.white],
  berry: [P.pink1, P.lilac3, P.lilac1, P.pink3],
  mint: [P.mint0, P.white, P.mint1, P.white],
};
// Candy-cane stick from (x, top) down to the ground at y.
function caneStick(ctx, x, top, y, w = 3) {
  rect(ctx, x - 1, top, w + 2, y - top, P.ink);
  for (let yy = top; yy < y; yy++) rect(ctx, x, yy, w, 1, Math.floor((yy - top) / 3) % 2 ? P.red1 : P.white);
}
// A lollipop planted in the ground at (x, y) with a head of radius r.
export function drawLollipop(ctx, x, y, r, cols, t = 0, o = {}) {
  const stick = o.stick ?? Math.round(r * 1.6);
  const hy = y - stick - r;
  ellipse(ctx, x + 3, y + 1, Math.max(3, r * 0.5), 2, 'rgba(60,30,80,0.22)');
  caneStick(ctx, x - 1, hy + r - 2, y, r > 14 ? 4 : 3);
  const sway = o.sway ? Math.round(Math.sin(t * 1.2 + x) * 1) : 0;
  ctx.drawImage(lolliHead(r, cols), Math.round(x - r - 1 + sway), Math.round(hy - r - 1));
  // a sparkle every so often
  const ph = (t * 0.6 + x * 0.013) % 3;
  if (ph < 0.35 && o.sparkle !== false) {
    const k = Math.sin((ph / 0.35) * Math.PI);
    sparkle(ctx, x - r * 0.4 + sway, hy - r * 0.5, Math.round(1 + k * 3), P.white);
  }
}

/* --------------------------------------------------------------- clouds */
const cloudCache = new Map();
function cloud(w, col, col2) {
  const key = w + col;
  if (cloudCache.has(key)) return cloudCache.get(key);
  const h = Math.round(w * 0.45);
  const [c, g] = mk(w + 4, h + 4);
  const r = rng(w * 7 + col.length);
  const puffs = [];
  const n = Math.max(3, Math.round(w / 12));
  for (let i = 0; i < n; i++) {
    const px = 2 + w * (0.18 + (0.64 * i) / (n - 1));
    const pr = w * (0.13 + r() * 0.08) * (i === 0 || i === n - 1 ? 0.8 : 1.15);
    puffs.push([px, h + 1 - pr * 0.9 - (i > 0 && i < n - 1 ? r() * w * 0.06 : 0), pr]);
  }
  for (const [x, y, pr] of puffs) ellipse(g, x, y, pr + 1, pr + 1, mix(col2, P.ink, 0.25));
  for (const [x, y, pr] of puffs) ellipse(g, x, y, pr, pr, col2);
  for (const [x, y, pr] of puffs) ellipse(g, x - 1, y - 2, pr - 1, pr - 1.5, col);
  for (const [x, y, pr] of puffs) rect(g, x - pr * 0.5, y - pr * 0.6, 3, 1, P.white);
  g.clearRect(0, h + 2, w + 4, 4);
  rect(g, 4, h + 1, w - 4, 1, mix(col2, P.ink, 0.25));
  cloudCache.set(key, c);
  return c;
}
const CLOUDS = [
  { x: 40, y: 8, w: 56, c: [P.pink4, P.pink3], v: 3 },
  { x: 160, y: 22, w: 40, c: [P.lilac4, P.lilac3], v: 2 },
  { x: 250, y: 4, w: 64, c: [P.pink4, P.pink2], v: 2.5 },
  { x: 380, y: 40, w: 36, c: [P.lilac4, P.lilac2], v: 3.5 },
  { x: 470, y: 14, w: 48, c: [P.white, P.lilac3], v: 2 },
];
export function drawClouds(ctx, t) {
  for (const c of CLOUDS) {
    const x = ((c.x + t * c.v) % (W + c.w + 40)) - c.w - 20;
    ctx.drawImage(cloud(c.w, c.c[0], c.c[1]), Math.round(x), c.y + Math.round(Math.sin(t * 0.5 + c.x) * 1));
  }
}

/* ------------------------------------------------------------ background */
// Gumdrop hill: a sugared dome.
function gumdrop(g, cx, base, rx, ry, col, r) {
  const dark = mix(col, P.ink, 0.22), light = mix(col, P.white, 0.45);
  for (let dy = -ry; dy <= 0; dy++) {
    const k = 1 - (dy / (ry + 0.5)) ** 2;
    const hw = Math.round(rx * Math.sqrt(Math.max(0, k)));
    g.fillStyle = dark; g.fillRect(cx - hw - 1, base + dy, hw * 2 + 2, 1);
    g.fillStyle = col; g.fillRect(cx - hw, base + dy, hw * 2, 1);
  }
  for (let dy = -ry + 2; dy < -ry * 0.35; dy++) { // shine on the upper left
    const k = 1 - (dy / (ry + 0.5)) ** 2;
    const hw = Math.round(rx * Math.sqrt(Math.max(0, k)));
    g.fillStyle = light; g.fillRect(cx - hw + 2, base + dy, Math.max(2, Math.round(hw * 0.35)), 1);
  }
  // sugar crystals
  for (let i = 0; i < (rx * ry) / 18; i++) {
    const a = r() * Math.PI, d = Math.sqrt(r());
    const x = Math.round(cx + Math.cos(a + Math.PI) * rx * d * 0.92), y = Math.round(base - Math.sin(a) * ry * d * 0.92);
    g.fillStyle = r() < 0.6 ? P.white : light; g.fillRect(x, y, 1, 1);
  }
}

// A peppermint swirl lying flat in the grass.
function peppermint(g, cx, cy, r, col = P.red1) {
  ellipse(g, cx, cy + 1, r + 1, r * 0.55 + 1, 'rgba(60,30,80,0.25)');
  ellipse(g, cx, cy, r + 1, r * 0.55 + 1, P.ink);
  for (let y = -Math.ceil(r * 0.55); y <= Math.ceil(r * 0.55); y++) for (let x = -r; x <= r; x++) {
    const nx = x / r, ny = y / (r * 0.55);
    if (nx * nx + ny * ny > 1) continue;
    const a = Math.atan2(ny, nx);
    g.fillStyle = Math.floor(((a / Math.PI + 1) * 4)) % 2 ? col : P.white;
    g.fillRect(cx + x, cy + y, 1, 1);
  }
  g.fillStyle = P.white; g.fillRect(cx - 1, cy, 2, 1);
}

// A twist-wrapped sweet.
function wrapped(g, cx, cy, col, col2) {
  g.fillStyle = P.ink; g.fillRect(cx - 6, cy - 2, 13, 5); g.fillRect(cx - 3, cy - 3, 7, 7);
  g.fillStyle = col2; g.fillRect(cx - 5, cy - 1, 2, 3); g.fillRect(cx + 4, cy - 1, 2, 3);
  g.fillStyle = col; g.fillRect(cx - 2, cy - 2, 5, 5);
  g.fillStyle = P.white; g.fillRect(cx - 1, cy - 1, 2, 1);
}

// Candy-cane fence: posts with pastel rails.
function fence(g, x0, x1, y) {
  for (let x = x0; x <= x1; x += 12) {
    g.fillStyle = P.ink; g.fillRect(x - 1, y - 13, 5, 14);
    for (let k = 0; k < 13; k++) { g.fillStyle = Math.floor(k / 2) % 2 ? P.pink1 : P.white; g.fillRect(x, y - 12 + k, 3, 1); }
    g.fillStyle = P.ink; g.fillRect(x - 1, y - 15, 5, 3); g.fillStyle = P.pink2; g.fillRect(x, y - 14, 3, 1);
  }
  for (const ry of [y - 10, y - 5]) {
    g.fillStyle = P.ink; g.fillRect(x0, ry - 1, x1 - x0 + 3, 4);
    for (let x = x0; x < x1 + 3; x++) { g.fillStyle = Math.floor((x - x0) / 3) % 2 ? P.lilac2 : P.white; g.fillRect(x, ry, 1, 2); }
  }
}

// Ice-cream-cone tree: waffle trunk, stacked scoops, a cherry.
function coneTree(g, x, y, scoops) {
  ellipse(g, x + 3, y + 1, 8, 2, 'rgba(60,30,80,0.22)');
  for (let yy = 0; yy < 22; yy++) {
    const hw = Math.max(1, Math.round(1 + (22 - yy) * 0.28));
    g.fillStyle = P.ink; g.fillRect(x - hw - 1, y - yy, hw * 2 + 2, 1);
    for (let xx = -hw; xx < hw; xx++) { g.fillStyle = (xx + yy) % 4 === 0 || (xx - yy + 40) % 4 === 0 ? P.caramel : P.caramel2; g.fillRect(x + xx, y - yy, 1, 1); }
  }
  let sy = y - 24;
  scoops.forEach((col, i) => {
    const r = 9 - i * 1.5;
    ellipse(g, x, sy, r + 1, r * 0.85 + 1, P.ink);
    ellipse(g, x, sy, r, r * 0.85, col);
    ellipse(g, x - 2, sy - 2, r * 0.45, r * 0.3, mix(col, P.white, 0.5));
    g.fillStyle = mix(col, P.ink, 0.15); // drip
    g.fillRect(x + r * 0.3, sy + r * 0.6, 2, 3);
    sy -= r * 1.3;
  });
  circle(g, x + 1, sy + 4, 3, P.ink); circle(g, x + 1, sy + 4, 2, P.red1); g.fillStyle = P.white; g.fillRect(x, sy + 3, 1, 1);
  g.fillStyle = P.wood0; g.fillRect(x + 2, sy - 1, 1, 3);
}

// Cotton-candy tree: a pink fluff on a stick.
function flossTree(g, x, y, col, col2, s = 1) {
  ellipse(g, x + 3, y + 1, 7, 2, 'rgba(60,30,80,0.22)');
  g.fillStyle = P.ink; g.fillRect(x - 2, y - 22 * s, 4, 22 * s);
  g.fillStyle = P.cream; g.fillRect(x - 1, y - 22 * s, 2, 22 * s);
  const cy = y - 26 * s;
  for (const [ox, oy, r] of [[-7, 2, 8], [6, 2, 8], [0, -4, 10], [-3, 5, 7], [4, 6, 7]]) ellipse(g, x + ox * s, cy + oy * s, r * s + 1, r * s * 0.85 + 1, mix(col2, P.ink, 0.3));
  for (const [ox, oy, r] of [[-7, 2, 8], [6, 2, 8], [0, -4, 10], [-3, 5, 7], [4, 6, 7]]) ellipse(g, x + ox * s, cy + oy * s, r * s, r * s * 0.85, col2);
  for (const [ox, oy, r] of [[-7, 1, 6], [5, 0, 6], [-1, -6, 7]]) ellipse(g, x + ox * s, cy + oy * s, r * s * 0.8, r * s * 0.6, col);
  g.fillStyle = P.white; g.fillRect(x - 6 * s, cy - 6 * s, 3, 1); g.fillRect(x - 2 * s, cy - 10 * s, 2, 1);
}

const SPRINKLES = [P.pink1, P.lilac1, SKY.b0, P.mint0, P.red2, P.lemon0, P.white];

let bgCache = null;
// Static background (sky, hills, meadows, river bed, ground decorations).
export function candyBackground(calm) {
  if (bgCache) return bgCache;
  const [c, g] = mk(W, H);
  const r = rng(11);
  // sky: baby blue fading to strawberry milk at the horizon
  for (let y = 0; y < 110; y++) {
    const k = y / 100;
    g.fillStyle = k < 0.5 ? mix(SKY.b2, SKY.b3, k * 2) : mix(SKY.b3, P.pink4, (k - 0.5) * 2);
    g.fillRect(0, y, W, 1);
  }
  // far gumdrop hills
  const far = [[30, 92, 50, 34, P.lilac3], [120, 96, 60, 28, SKY.b2], [228, 94, 56, 32, P.pink3], [330, 96, 64, 30, P.lilac3], [440, 92, 60, 36, SKY.b2]];
  for (const [x, b, rx, ry, col] of far) gumdrop(g, x, b, rx, ry, col, r);
  // near gumdrop hills
  const near = [[-4, 112, 44, 34, P.pink2], [78, 116, 40, 24, P.mint2], [170, 118, 46, 20, LEMON], [272, 118, 44, 22, P.lilac2], [356, 114, 42, 30, P.mint2], [458, 112, 46, 34, P.pink2]];
  for (const [x, b, rx, ry, col] of near) gumdrop(g, x, b, rx, ry, col, r);
  // sprinkle-dotted pastel meadows (far bank and near bank)
  const meadow = (y0, y1, base, stripe) => {
    g.fillStyle = base; g.fillRect(0, y0, W, y1 - y0);
    for (let x = 0; x < W; x += 24) { g.fillStyle = stripe; g.fillRect(x, y0, 12, y1 - y0); }
  };
  meadow(108, RIVER_T + 8, P.grass2, P.grass3);
  meadow(RIVER_B - 6, H, P.grass2, P.grass3);
  // soften the horizon line
  for (let x = 0; x < W; x++) { g.fillStyle = P.grass1; g.fillRect(x, 108 + Math.round(Math.sin(x * 0.07) * 1.5), 1, 2); }
  // river with toffee banks
  for (let x = 0; x < W; x++) {
    const t1 = bankTop(x), b1 = bankBot(x);
    g.fillStyle = P.grass0; g.fillRect(x, t1 - 3, 1, 1);
    g.fillStyle = P.choc4; g.fillRect(x, t1 - 2, 1, 2);
    g.fillStyle = P.choc2; g.fillRect(x, t1, 1, b1 - t1);
    g.fillStyle = P.choc1; g.fillRect(x, t1, 1, 2);
    g.fillStyle = '#5c2d15'; g.fillRect(x, Math.round((t1 + b1) / 2) + 2, 1, 10);
    g.fillStyle = P.choc4; g.fillRect(x, b1, 1, 3);
    g.fillStyle = P.caramel2; g.fillRect(x, b1 + 1, 1, 1);
    g.fillStyle = P.grass0; g.fillRect(x, b1 + 3, 1, 1);
  }
  // sprinkles everywhere on the grass, thinner near the middle
  for (let i = 0; i < 1500; i++) {
    const x = Math.floor(r() * W), y = 108 + Math.floor(r() * (H - 108));
    if (y > bankTop(x) - 4 && y < bankBot(x) + 5) continue;
    if (calm(x, y) && r() < 0.75) continue;
    g.fillStyle = SPRINKLES[Math.floor(r() * SPRINKLES.length)];
    if (r() < 0.5) g.fillRect(x, y, 2, 1); else g.fillRect(x, y, 1, 2);
  }
  // far-bank props (edges only)
  fence(g, 30, 90, 146);
  fence(g, 300, 372, 147);
  coneTree(g, 116, 140, [P.pink2, P.mint2]);
  flossTree(g, 330, 136, P.pink3, P.pink2, 0.9);
  coneTree(g, 466, 142, [SKY.b1, P.lilac2]);
  peppermint(g, 74, 128, 6);
  peppermint(g, 452, 126, 5, P.pink1);
  wrapped(g, 100, 124, P.lilac1, P.lilac3);
  wrapped(g, 356, 128, SKY.b0, SKY.b2);
  // near-bank props
  fence(g, 230, 300, 232);
  peppermint(g, 24, 262, 9);
  peppermint(g, 196, 258, 7, P.pink1);
  peppermint(g, 344, 230, 6, SKY.b0);
  flossTree(g, 160, 246, P.lilac3, P.lilac2, 0.85);
  const sweets = [[94, 226, P.pink1, P.pink3], [138, 262, SKY.b0, SKY.b2], [212, 234, P.mint0, P.mint2], [258, 262, P.red1, P.pink3], [316, 262, P.lilac1, P.lilac3], [356, 252, P.pink1, LEMON], [12, 224, P.lilac1, P.pink3], [470, 222, P.mint0, P.mint3]];
  for (const [x, y, a, b] of sweets) wrapped(g, x, y, a, b);
  bgCache = c;
  return c;
}

/* --------------------------------------------------------------- the river */
export function drawRiverLife(ctx, t, skip) {
  // flow streaks
  for (let i = 0; i < 44; i++) {
    const x = ((i * 89 + t * (12 + (i % 4) * 5)) % (W + 40)) - 20;
    const lane = (i * 13) % (RIVER_B - RIVER_T - 10);
    const y = RIVER_T + 5 + lane;
    if (skip && skip(x, y)) continue;
    rect(ctx, x, y, 6 + (i % 3) * 3, 1, i % 3 ? P.choc3 : P.choc4);
  }
}

// The waterfall spilling over a candy-rock cliff at the left edge, foaming
// where it hits the river.
export function drawWaterfall(ctx, t) {
  const top = 70, bot = 156;
  const R = (y) => 36 + Math.round(((y - top) / (bot - top)) * 8); // right edge, flaring
  // candy rocks beside and above the fall
  const rock = (x, y, rx, ry, col) => {
    ellipse(ctx, x, y + 1, rx + 1, ry + 1, P.ink);
    ellipse(ctx, x, y, rx, ry, col);
    ellipse(ctx, x - 2, y - ry * 0.3, rx * 0.6, ry * 0.45, mix(col, P.white, 0.45));
    rect(ctx, x - rx * 0.45, y - ry * 0.55, 3, 1, P.white);
  };
  for (const r of [[50, 84, 10, 12, P.pink2], [54, 108, 9, 11, P.lilac1], [52, 132, 9, 10, P.pink2], [56, 150, 8, 7, P.lilac2]]) rock(...r);
  // the falling sheet: wide, glossy milk chocolate pouring off the left edge
  for (let y = top; y < bot; y++) {
    const r = R(y);
    for (let x = 0; x < r; x++) {
      const b = Math.floor((x + 3) / 5) % 4;
      rect(ctx, x, y, 1, 1, b === 0 ? P.choc4 : b === 2 ? P.choc2 : P.choc3);
    }
    rect(ctx, r - 2, y, 2, 1, P.choc1);
    rect(ctx, r, y, 1, 1, P.ink);
  }
  // lots of bright streaks racing down
  for (let i = 0; i < 18; i++) {
    const x = 1 + ((i * 13) % 36);
    const len = 8 + (i % 4) * 6;
    const yy = top + ((t * (80 + (i % 5) * 14) + i * 29) % (bot - top + len)) - len;
    const y0 = Math.max(top + 4, yy), y1 = Math.min(bot - 3, yy + len);
    if (y1 > y0) rect(ctx, x, y0, 1, y1 - y0, i % 3 ? P.caramel2 : P.cream);
  }
  // foamy cream lip where it tips over the edge
  for (let x = 0; x <= R(top) + 1; x++) {
    const y = top - 2 + Math.round(Math.sin(x * 0.5 + t * 4) * 0.8);
    rect(ctx, x, y - 2, 1, 6, P.ink);
    rect(ctx, x, y - 1, 1, 4, P.choc4);
    rect(ctx, x, y - 1, 1, 2, (x + Math.floor(t * 8)) % 5 ? P.caramel2 : P.white);
  }
  // the river it spills from, just above
  rect(ctx, 0, top - 10, R(top) - 4, 7, P.choc2);
  rect(ctx, 0, top - 11, R(top) - 4, 1, P.ink);
  for (let i = 0; i < 4; i++) rect(ctx, ((i * 9 + t * 16) % 30), top - 8 + (i % 2) * 2, 5, 1, P.choc4);
  rock(R(top) + 2, top - 8, 9, 7, P.lilac2);
  // foam clouds where it lands
  for (let i = 0; i < 9; i++) {
    const ph = (t * 1.4 + i * 0.37) % 1;
    const fx = 2 + ((i * 9) % 40), fy = bot + 2 - ph * 6;
    const r = 3 + (i % 3) + Math.round(Math.sin(ph * Math.PI) * 2);
    ellipse(ctx, fx, fy, r + 1, r * 0.7 + 1, P.cream3);
    ellipse(ctx, fx, fy - 1, r, r * 0.7, i % 2 ? P.cream : P.white);
  }
  // ripples spreading into the river
  for (let i = 0; i < 3; i++) {
    const k = ((t * 0.6 + i / 3) % 1);
    const rx = 20 + k * 36, ry = 5 + k * 9;
    ctx.globalAlpha = 1 - k;
    for (let a = -0.3; a < Math.PI / 2 + 0.2; a += 0.07) rect(ctx, 10 + Math.cos(a) * rx, 170 + Math.sin(a) * ry - ry * 0.5, 2, 1, P.choc4);
    ctx.globalAlpha = 1;
  }
}

export { caneStick };
