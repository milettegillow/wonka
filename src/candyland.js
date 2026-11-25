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
  caneStick(ctx, x - 1, hy + r - 2, y, r > 24 ? 5 : r > 14 ? 4 : r > 7 ? 3 : 2);
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

/* ------------------------------------------------------- forced perspective */
// Scale for a prop standing on the ground at screen y: small and distant on
// the far bank, bigger the nearer it is to the camera (the bottom edge).
const DEPTH = [[100, 0.42], [150, 0.55], [180, 0.75], [210, 0.85], [240, 1.05], [270, 1.3], [300, 1.45]];
export function depth(y) {
  if (y <= DEPTH[0][0]) return DEPTH[0][1];
  for (let i = 1; i < DEPTH.length; i++) {
    const [y1, s1] = DEPTH[i];
    if (y <= y1) { const [y0, s0] = DEPTH[i - 1]; return s0 + ((y - y0) / (y1 - y0)) * (s1 - s0); }
  }
  return DEPTH[DEPTH.length - 1][1];
}
const sz = (n, s, min = 1) => Math.max(min, Math.round(n * s));
const shadowAt = (g, x, y, rx, s) => ellipse(g, x + sz(3, s), y + 1, sz(rx, s, 2), Math.max(1, sz(2, s)), 'rgba(60,30,80,0.22)');

// A peppermint swirl lying flat in the grass (r already scaled).
function peppermint(g, cx, cy, r, col = P.red1) {
  const ry = Math.max(2, r * 0.55);
  ellipse(g, cx, cy + 1, r + 1, ry + 1, 'rgba(60,30,80,0.25)');
  ellipse(g, cx, cy, r + 1, ry + 1, P.ink);
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) for (let x = -r; x <= r; x++) {
    const nx = x / r, ny = y / ry;
    if (nx * nx + ny * ny > 1) continue;
    const a = Math.atan2(ny, nx);
    g.fillStyle = Math.floor(((a / Math.PI + 1) * 4)) % 2 ? col : P.white;
    g.fillRect(cx + x, cy + y, 1, 1);
  }
  g.fillStyle = P.white; g.fillRect(cx - 1, cy, 2, 1);
}

// A twist-wrapped sweet at scale s.
function wrapped(g, cx, cy, col, col2, s = 1) {
  const b = sz(5, s, 3), e = sz(2, s), eh = sz(3, s, 2), hb = Math.floor(b / 2), he = Math.floor(eh / 2);
  ellipse(g, cx + 1, cy + hb + 1, hb + e + 1, Math.max(1, sz(1, s)), 'rgba(60,30,80,0.18)');
  g.fillStyle = P.ink;
  g.fillRect(cx - hb - e - 1, cy - he - 1, b + e * 2 + 2, eh + 2);
  g.fillRect(cx - hb - 1, cy - hb - 1, b + 2, b + 2);
  g.fillStyle = col2; g.fillRect(cx - hb - e, cy - he, e, eh); g.fillRect(cx - hb + b, cy - he, e, eh);
  g.fillStyle = col; g.fillRect(cx - hb, cy - hb, b, b);
  g.fillStyle = P.white; g.fillRect(cx - hb + 1, cy - hb + 1, Math.max(1, Math.floor(b / 2)), 1);
}

// Candy-cane fence at scale s, standing on y.
function fence(g, x0, x1, y, s = 1) {
  const step = sz(12, s, 5), ph = sz(13, s, 5), pw = sz(3, s, 2);
  for (let x = x0; x <= x1; x += step) {
    g.fillStyle = P.ink; g.fillRect(x - 1, y - ph, pw + 2, ph + 1);
    for (let k = 0; k < ph - 1; k++) { g.fillStyle = Math.floor(k / sz(2, s)) % 2 ? P.pink1 : P.white; g.fillRect(x, y - ph + 1 + k, pw, 1); }
    g.fillStyle = P.ink; g.fillRect(x - 1, y - ph - 2, pw + 2, 3); g.fillStyle = P.pink2; g.fillRect(x, y - ph - 1, pw, 1);
  }
  const rh = sz(2, s);
  for (const ry of [y - Math.round(ph * 0.75), y - Math.round(ph * 0.38)]) {
    g.fillStyle = P.ink; g.fillRect(x0, ry - 1, x1 - x0 + pw, rh + 2);
    for (let x = x0; x < x1 + pw; x++) { g.fillStyle = Math.floor((x - x0) / sz(3, s)) % 2 ? P.lilac2 : P.white; g.fillRect(x, ry, 1, rh); }
  }
}

// Ice-cream-cone tree at scale s: waffle trunk, stacked scoops, a cherry.
function coneTree(g, x, y, scoops, s = 1) {
  shadowAt(g, x, y, 8, s);
  const ch = sz(22, s, 8);
  for (let yy = 0; yy < ch; yy++) {
    const hw = Math.max(1, Math.round((1 + (ch - yy) * 0.28)));
    g.fillStyle = P.ink; g.fillRect(x - hw - 1, y - yy, hw * 2 + 2, 1);
    for (let xx = -hw; xx < hw; xx++) { g.fillStyle = (xx + yy) % 4 === 0 || (xx - yy + 40) % 4 === 0 ? P.caramel : P.caramel2; g.fillRect(x + xx, y - yy, 1, 1); }
  }
  let sy = y - ch - sz(2, s);
  scoops.forEach((col, i) => {
    const r = Math.max(2, (9 - i * 1.5) * s);
    ellipse(g, x, sy, r + 1, r * 0.85 + 1, P.ink);
    ellipse(g, x, sy, r, r * 0.85, col);
    ellipse(g, x - sz(2, s), sy - sz(2, s), r * 0.45, r * 0.3, mix(col, P.white, 0.5));
    g.fillStyle = mix(col, P.ink, 0.15);
    g.fillRect(Math.round(x + r * 0.3), Math.round(sy + r * 0.6), sz(2, s), sz(3, s));
    sy -= r * 1.3;
  });
  const cr = sz(2, s);
  circle(g, x + 1, sy + cr + 1, cr + 1, P.ink); circle(g, x + 1, sy + cr + 1, cr, P.red1); g.fillStyle = P.white; g.fillRect(x, sy + cr, 1, 1);
}

// A stack of sugared gumdrops (bottom on y) at scale s.
export function gumdropStack(g, x, y, s, cols) {
  let cy = y;
  cols.forEach((col, i) => {
    const rx = (10 - i) * s, ry = (9 - i * 0.5) * s;
    cy -= ry * (i ? 1.55 : 1);
    ellipse(g, x, cy + 1, rx + 1, ry + 1, P.ink);
    ellipse(g, x, cy, rx, ry, col);
    ellipse(g, x - 1, cy - ry * 0.3, rx * 0.6, ry * 0.45, mix(col, P.white, 0.45));
    g.fillStyle = P.white; g.fillRect(Math.round(x - rx * 0.45), Math.round(cy - ry * 0.55), sz(2, s), 1);
  });
}

/* --------------------------------------------------------------- props */
// Lollipops are drawn live (they sparkle) in depth order with the board, boat
// and Wonka. Base sizes are at scale 1; depth(y) scales them.
export const LOLLIPOPS = [
  { x: 122, y: 134, r: 14, c: 'blue' },
  { x: 82, y: 148, r: 18, c: 'berry' },
  { x: 16, y: 296, r: 22, c: 'pink' },
  { x: 118, y: 284, r: 14, c: 'blue' },
  { x: 236, y: 302, r: 13, c: 'berry' },
  { x: 334, y: 292, r: 18, c: 'lilac' },
];
export function drawLollipops(ctx, t, y0, y1) {
  for (const l of LOLLIPOPS) {
    if (l.y < y0 || l.y >= y1) continue;
    const s = depth(l.y);
    drawLollipop(ctx, l.x, l.y, Math.round(l.r * s), LOLLI[l.c], t, { stick: Math.round(l.r * 1.6 * s), sway: true });
  }
}
// Is (x, y) under a lollipop's head or stick? (keeps flat props out from under them)
function underLollipop(x, y) {
  return LOLLIPOPS.some((l) => {
    const s = depth(l.y), r = l.r * s, hy = l.y - l.r * 1.6 * s - r;
    return Math.hypot(x - l.x, y - hy) < r + 4 || (Math.abs(x - l.x) < 5 && y > hy && y < l.y + 3);
  });
}

// Everything else is baked into the background, sorted far to near.
const PROPS = [
  { k: 'fence', x0: 28, x1: 92, y: 146 },
  { k: 'fence', x0: 300, x1: 374, y: 147 },
  { k: 'cone', x: 104, y: 143, scoops: [P.pink2, P.mint2] },
  { k: 'cone', x: 470, y: 142, scoops: [SKY.b1, P.lilac2] },
  { k: 'pepper', x: 66, y: 130, r: 10 },
  { k: 'pepper', x: 446, y: 128, r: 9, col: P.pink1 },
  { k: 'sweet', x: 98, y: 126, c: [P.lilac1, P.lilac3] },
  { k: 'sweet', x: 400, y: 130, c: [SKY.b0, SKY.b2] },
  { k: 'sweet', x: 30, y: 122, c: [P.pink1, P.pink3] },
  { k: 'pepper', x: 372, y: 226, r: 6, col: SKY.b0 },
  { k: 'sweet', x: 92, y: 222, c: [P.pink1, P.pink3] },
  { k: 'sweet', x: 212, y: 226, c: [P.mint0, P.mint2] },
  { k: 'sweet', x: 470, y: 222, c: [P.mint0, P.mint3] },
  { k: 'sweet', x: 162, y: 236, c: [SKY.b0, SKY.b2] },
  { k: 'sweet', x: 290, y: 240, c: [P.red1, P.pink3] },
  { k: 'pepper', x: 52, y: 238, r: 6 },
  { k: 'sweet', x: 186, y: 256, c: [P.lilac1, P.lilac3] },
  { k: 'pepper', x: 196, y: 266, r: 6, col: P.pink1 },
  { k: 'sweet', x: 268, y: 262, c: [P.pink1, LEMON] },
  { k: 'sweet', x: 70, y: 266, c: [P.mint0, P.mint2] },
].sort((a, b) => a.y - b.y);

function drawProp(g, pr) {
  const s = depth(pr.y);
  if (pr.k === 'fence') fence(g, pr.x0, pr.x1, pr.y, s);
  else if (pr.k === 'cone') coneTree(g, pr.x, pr.y, pr.scoops, s);
  else if (pr.k === 'pepper') peppermint(g, pr.x, pr.y, Math.max(3, Math.round(pr.r * s)), pr.col);
  else if (pr.k === 'sweet') wrapped(g, pr.x, pr.y, pr.c[0], pr.c[1], s);
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
  // sprinkles: tiny and dense on the far bank; on the near bank they grow
  // toward the camera and thin out
  const sprinkle = (x, y, len, th) => {
    if (y > bankTop(x) - 4 && y < bankBot(x) + 5) return;
    if (calm(x, y) && r() < 0.75) return;
    g.fillStyle = SPRINKLES[Math.floor(r() * SPRINKLES.length)];
    if (r() < 0.5) g.fillRect(x, y, len, th); else g.fillRect(x, y, th, len);
  };
  for (let i = 0; i < 900; i++) {
    const x = Math.floor(r() * W), y = 108 + Math.floor(r() * (RIVER_T - 104));
    sprinkle(x, y, r() < 0.6 ? 1 : 2, 1);
  }
  for (let i = 0; i < 1100; i++) {
    const x = Math.floor(r() * W), y = RIVER_B + 2 + Math.floor(Math.pow(r(), 1.7) * (H - RIVER_B));
    const s = depth(y);
    if (r() > 0.45 + 0.55 / s / s) continue; // fewer, bigger ones near the bottom
    sprinkle(x, y, Math.max(2, Math.round(2.2 * s)), s > 1.1 ? 2 : 1);
  }
  // props, far to near
  for (const pr of PROPS) if (!(pr.k !== 'fence' && underLollipop(pr.x, pr.y))) drawProp(g, pr);
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
  // a little stack of sugared gumdrops beside the falls, far away
  gumdropStack(ctx, 52, 152, depth(152), [P.lilac2, P.pink2, P.lilac1, P.pink2]);
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
