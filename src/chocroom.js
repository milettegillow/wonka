// The Chocolate Room (side view): valley, chocolate river, the great
// waterfall, dangling glass pipes, candy-striped trees, buttercup meadow.
import { P } from './palette.js';
import { W, H, rect, ellipse, sparkle } from './engine.js';
import { drawOompa } from './kids.js';
import { drawHead } from './faces.js';

export const RIVER_TOP = 178;
export const RIVER_BOT = 214;
const FALL_X = 372, FALL_W = 44, FALL_TOP = 54;
const PIPES = [
  { x: 96, w: 8, ph: 0 },
  { x: 150, w: 10, ph: 1.7 },
  { x: 228, w: 7, ph: 3.1 },
  { x: 300, w: 9, ph: 4.4 },
];

let staticLayer = null;

function hillY(x, base, amp, f, ph) {
  return base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.3 + ph * 1.7) * amp * 0.4;
}

function candyTree(g, x, baseY, h, crown) {
  // striped trunk
  for (let y = 0; y < h; y++) {
    for (let i = 0; i < 4; i++) {
      g.fillStyle = (Math.floor((y + i) / 2) % 2) ? P.pink1 : P.white;
      g.fillRect(x - 2 + i, baseY - y, 1, 1);
    }
  }
  const cy = baseY - h - 6;
  const blobs = [[0, 0, 10], [-7, 3, 7], [7, 3, 7], [-3, -6, 7], [4, -5, 6]];
  for (const [dx, dy, r] of blobs) ellipseG(g, x + dx, cy + dy, r + 1, r, crown[0]);
  for (const [dx, dy, r] of blobs) ellipseG(g, x + dx - 1, cy + dy - 1, r - 1, r - 2, crown[1]);
  ellipseG(g, x - 3, cy - 4, 3, 2, crown[2]);
  // candy dots
  g.fillStyle = P.white;
  g.fillRect(x + 4, cy + 1, 2, 2); g.fillRect(x - 6, cy + 3, 2, 2); g.fillRect(x, cy - 6, 2, 2);
}

function bush(g, x, y, r, c1, c2) {
  ellipseG(g, x, y, r + 1, r * 0.7 + 1, P.ink);
  ellipseG(g, x, y, r, r * 0.7, c1);
  for (let i = -r; i < r; i += 4) {
    g.fillStyle = c2;
    g.fillRect(x + i, y - 2, 2, 4);
  }
  ellipseG(g, x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.2, P.white);
}

function ellipseG(g, cx, cy, rx, ry, c) {
  g.fillStyle = c;
  cx = Math.round(cx); cy = Math.round(cy);
  const r = Math.ceil(ry);
  for (let dy = -r; dy <= r; dy++) {
    const k = 1 - (dy / (ry + 0.5)) ** 2;
    if (k <= 0) continue;
    const hw = Math.round(rx * Math.sqrt(k));
    g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}

function buildStatic() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // back wall: soft candy bands
  const bands = [P.lilac2, P.lilac3, P.pink3, P.pink4, P.cream];
  for (let y = 0; y < 120; y++) {
    const i = Math.min(bands.length - 1, Math.floor(y / 24));
    g.fillStyle = bands[i];
    g.fillRect(0, y, W, 1);
    // dithered seam
    if (y % 24 === 23 && i < bands.length - 1) {
      g.fillStyle = bands[i + 1];
      for (let x = (y % 2); x < W; x += 2) g.fillRect(x, y, 1, 1);
    }
  }
  // ceiling beams with rivets
  g.fillStyle = P.lilac0; g.fillRect(0, 0, W, 6);
  g.fillStyle = P.lilac1; g.fillRect(0, 6, W, 2);
  for (let x = 6; x < W; x += 24) { g.fillStyle = P.lilac3; g.fillRect(x, 2, 2, 2); }
  // distant hills
  for (let x = 0; x < W; x++) {
    const y1 = Math.round(hillY(x, 108, 10, 0.018, 0.5));
    g.fillStyle = P.mint2; g.fillRect(x, y1, 1, H - y1);
    const y2 = Math.round(hillY(x, 132, 9, 0.024, 2.2));
    g.fillStyle = P.mint1; g.fillRect(x, y2, 1, H - y2);
  }
  // distant candy trees
  for (const [x, by] of [[30, 112], [70, 106], [200, 104], [256, 110], [450, 112]]) {
    g.fillStyle = P.pink2; g.fillRect(x - 1, by - 14, 2, 14);
    ellipseG(g, x, by - 18, 6, 5, P.pink3);
    ellipseG(g, x - 1, by - 19, 4, 3, P.white);
  }
  // near meadow slopes down into the valley
  for (let x = 0; x < W; x++) {
    const y = Math.round(hillY(x, 156, 7, 0.03, 4.0));
    g.fillStyle = P.grass0; g.fillRect(x, y, 1, 1);
    g.fillStyle = P.grass1; g.fillRect(x, y + 1, 1, RIVER_TOP - y);
    if ((x * 7) % 11 < 2) { g.fillStyle = P.grass2; g.fillRect(x, y + 2, 1, 2); }
  }
  // waterfall cliff
  // rocky chocolate cliff on the right, falls pour out of a notch in it
  for (let y = FALL_TOP - 12; y < RIVER_TOP; y++) {
    const edge = FALL_X - 26 - Math.round((y - FALL_TOP) * 0.25) + Math.round(Math.sin(y * 0.3) * 3 + Math.sin(y * 0.11) * 4);
    g.fillStyle = P.ink; g.fillRect(edge - 1, y, 1, 1);
    g.fillStyle = P.choc1; g.fillRect(edge, y, W - edge, 1);
  }
  for (let i = 0; i < 40; i++) {
    const x = FALL_X - 20 + ((i * 37) % (W - FALL_X + 20)), y = FALL_TOP + ((i * 53) % (RIVER_TOP - FALL_TOP - 6));
    g.fillStyle = i % 3 ? P.choc2 : P.choc0; g.fillRect(x, y, 6 + (i % 3) * 3, 2);
    g.fillStyle = P.choc3; g.fillRect(x, y, 3, 1);
  }
  // grassy top of the cliff
  for (let x = FALL_X - 40; x < W; x++) {
    const y = FALL_TOP - 14 + Math.round(Math.sin(x * 0.15) * 1.5);
    g.fillStyle = P.grass0; g.fillRect(x, y + 3, 1, 2);
    g.fillStyle = P.grass1; g.fillRect(x, y, 1, 3);
    if (x % 5 === 0) { g.fillStyle = P.grass2; g.fillRect(x, y - 1, 1, 2); }
  }

  // candy-striped trees + bushes on the valley slopes
  candyTree(g, 40, 165, 22, [P.pink1, P.pink2, P.pink3]);
  candyTree(g, 190, 160, 16, [P.mint0, P.mint1, P.mint3]);
  candyTree(g, 262, 164, 20, [P.lemon0, P.lemon1, P.lemon3]);
  candyTree(g, 452, FALL_TOP - 12, 18, [P.lilac0, P.lilac1, P.lilac3]);
  bush(g, 74, 172, 9, P.pink2, P.white);
  bush(g, 124, 170, 7, P.lemon1, P.pink1);
  bush(g, 330, 172, 8, P.lilac2, P.white);
  bush(g, 340, 174, 7, P.mint2, P.pink1);
  // buttercups on the slope
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % W, y = 160 + ((i * 53) % 16);
    if (x > FALL_X - 20 && x < FALL_X + FALL_W + 20) continue;
    g.fillStyle = P.lemon1; g.fillRect(x, y, 2, 2);
  }

  // river bed
  g.fillStyle = P.choc2; g.fillRect(0, RIVER_TOP, W, RIVER_BOT - RIVER_TOP);
  g.fillStyle = P.choc1; g.fillRect(0, RIVER_TOP, W, 2);
  for (let y = RIVER_TOP + 8; y < RIVER_BOT; y += 9) { g.fillStyle = P.choc3; g.fillRect(0, y, W, 1); }

  // foreground meadow bank
  for (let x = 0; x < W; x++) {
    const y = Math.round(RIVER_BOT + 2 + Math.sin(x * 0.05) * 2 + Math.sin(x * 0.13) * 1);
    g.fillStyle = P.choc1; g.fillRect(x, y - 3, 1, 3);
    g.fillStyle = P.grass1; g.fillRect(x, y, 1, H - y);
    g.fillStyle = P.grass2; g.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 160; i++) {
    const x = (i * 131 + 7) % W, y = 222 + ((i * 71) % 46);
    g.fillStyle = i % 3 ? P.grass2 : P.grass0;
    g.fillRect(x, y, 1, 3); g.fillRect(x + 2, y + 1, 1, 2);
  }
  for (let i = 0; i < 46; i++) {
    const x = (i * 89 + 13) % W, y = 226 + ((i * 37) % 40);
    g.fillStyle = P.grass0; g.fillRect(x + 1, y + 3, 1, 3);
    g.fillStyle = P.lemon1; g.fillRect(x, y, 3, 3);
    g.fillStyle = P.lemon3; g.fillRect(x + 1, y + 1, 1, 1);
  }
  bush(g, 20, 238, 12, P.pink1, P.white);
  bush(g, 466, 242, 12, P.mint1, P.pink3);
  return c;
}

export function drawChocRoom(ctx, t, o = {}) {
  if (!staticLayer) staticLayer = buildStatic();
  ctx.drawImage(staticLayer, 0, 0);

  // waterfall
  for (let x = 0; x < FALL_W; x++) {
    const shade = (x * 5 + Math.floor(t * 4)) % 9;
    ctx.fillStyle = shade < 3 ? P.choc3 : shade < 7 ? P.choc2 : P.choc4;
    ctx.fillRect(FALL_X + x, FALL_TOP - 6, 1, RIVER_TOP - FALL_TOP + 8);
  }
  for (let i = 0; i < 26; i++) {
    const x = FALL_X + 2 + ((i * 17) % (FALL_W - 4));
    const len = 6 + (i % 4) * 3;
    const y = FALL_TOP - 6 + ((t * (110 + (i % 5) * 18) + i * 31) % (RIVER_TOP - FALL_TOP + 6));
    rect(ctx, x, y, 1, len, i % 3 ? P.caramel : P.caramel2);
  }
  rect(ctx, FALL_X - 2, FALL_TOP - 8, FALL_W + 4, 3, P.choc4);
  // churning foam at the base
  for (let i = 0; i < 14; i++) {
    const bx = FALL_X - 10 + ((i * 23) % (FALL_W + 20));
    const by = RIVER_TOP + 2 + Math.sin(t * 9 + i) * 2;
    const r = 3 + ((i + Math.floor(t * 6)) % 3);
    ellipse(ctx, bx, by, r + 1, r * 0.7, i % 2 ? P.caramel2 : P.cream2);
  }

  // river ripples flowing left (away from the falls)
  for (let i = 0; i < 34; i++) {
    const lane = i % 4;
    const y = RIVER_TOP + 5 + lane * 8 + Math.round(Math.sin(t * 2 + i) * 1);
    const sp = 18 + lane * 5;
    const x = ((i * 61 - t * sp) % (W + 40) + W + 40) % (W + 40) - 20;
    const len = 6 + (i % 3) * 4;
    rect(ctx, x, y, len, 1, lane % 2 ? P.choc4 : P.choc3);
    if (i % 5 === 0) rect(ctx, x + 2, y - 1, 3, 1, P.caramel);
  }

  // glass pipes dangling into the river, bobbing and slurping chocolate up
  for (const p of PIPES) {
    const bob = Math.sin(t * 1.6 + p.ph) * 2;
    const sway = Math.sin(t * 1.1 + p.ph) * 2;
    const bottom = RIVER_TOP + 6 + bob;
    for (let y = 8; y < bottom; y++) {
      const k = y / bottom;
      const x = Math.round(p.x + sway * k * k);
      ctx.fillStyle = P.glass; ctx.fillRect(x, y, p.w, 1);
      // chocolate slugs travelling up
      const phase = (y + t * 60 + p.ph * 20) % 22;
      if (phase < 12) { ctx.fillStyle = phase < 2 ? P.choc4 : P.choc2; ctx.fillRect(x + 2, y, p.w - 4, 1); }
      ctx.fillStyle = P.glassEdge;
      ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + p.w - 1, y, 1, 1);
      if (y % 7 < 3) ctx.fillRect(x + 2, y, 1, 1);
    }
    // ripples around the intake
    const rx = Math.round(p.x + sway) + p.w / 2;
    const rr = 6 + ((t * 8 + p.ph * 3) % 6);
    ellipse(ctx, rx, RIVER_TOP + 6, rr + 1, 2, P.choc3);
    ellipse(ctx, rx, RIVER_TOP + 6, p.w / 2 + 1, 1, P.choc1);
  }

  // drifting sparkles
  for (let i = 0; i < 12; i++) {
    const ph = (t * 0.7 + i * 0.37) % 1;
    const x = (i * 83 + Math.sin(t + i) * 10) % W;
    const y = 30 + ((i * 47) % 120) - ph * 20;
    const s = ph < 0.5 ? Math.round(ph * 6) : Math.round((1 - ph) * 6);
    if (s > 0) sparkle(ctx, x, y, s, i % 2 ? P.white : P.lemon2);
  }
  if (o.dim) { ctx.fillStyle = `rgba(43,20,12,${o.dim})`; ctx.fillRect(0, 0, W, H); }
}

// The pink boiled-sweet boat, rowed by Oompa-Loompas. (x,y) = waterline centre.
export function drawBoat(ctx, x, y, t, o = {}) {
  const kids = o.kids || [];
  const len = o.len ?? 90;
  const bob = Math.sin(t * 4) * 1.5;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y + bob));
  ctx.rotate(Math.sin(t * 3) * 0.03);
  // passengers behind the hull
  const n = kids.length;
  kids.forEach((k, i) => {
    const kx = n === 1 ? 6 : -len * 0.28 + (i / Math.max(1, n - 1)) * len * 0.56;
    const chatter = o.chatter ? Math.max(0, Math.sin(t * 13 + i * 2.1)) : 0;
    drawHead(ctx, k, kx, -24 + Math.sin(t * 5 + i) * 1, { open: o.open ?? chatter, scale: o.headScale ?? 0.8 });
  });
  // rowers
  for (const ox of [-len * 0.42, len * 0.36]) {
    drawOompa(ctx, ox, -6, t, { pose: 'row', scale: 0.9, phase: ox });
    const oa = 0.5 + Math.sin(t * 14 + ox) * 0.4;
    ctx.fillStyle = P.wood1;
    for (let i = 0; i < 18; i++) ctx.fillRect(Math.round(ox + 4 + Math.cos(oa) * i), Math.round(-12 + Math.sin(oa) * i), 2, 2);
  }
  // translucent pink boiled-sweet hull
  const hl = len / 2;
  for (let yy = -10; yy <= 8; yy++) {
    const k = (yy + 10) / 18;
    const hw = Math.round(hl * (1 - Math.pow(k, 2.2) * 0.55));
    ctx.fillStyle = P.ink; ctx.fillRect(-hw - 1, yy, hw * 2 + 2, 1);
    ctx.fillStyle = yy < -7 ? P.pink3 : yy < -3 ? P.pink2 : yy < 3 ? P.pink1 : P.pink0;
    ctx.fillRect(-hw, yy, hw * 2, 1);
  }
  // prow curls
  ellipse(ctx, -hl - 2, -12, 4, 4, P.ink); ellipse(ctx, -hl - 2, -12, 3, 3, P.pink1);
  ellipse(ctx, hl + 2, -12, 4, 4, P.ink); ellipse(ctx, hl + 2, -12, 3, 3, P.pink1);
  // glassy shine
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillRect(-hl + 8, -8, hl * 0.6, 2);
  ctx.fillRect(-hl + 6, -5, 6, 1);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(4, -7, hl * 0.4, 1);
  ctx.restore();
  // wake
  for (let i = 0; i < 5; i++) {
    const wx = x - len / 2 - 6 - i * 7 + ((t * 30) % 7);
    rect(ctx, wx, y + 7 + (i % 2), 4, 1, P.caramel);
  }
}

export function drawTicket(ctx, x, y, o = {}) {
  const s = o.scale ?? 1;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(s, s);
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const dull = o.dull;
  ctx.fillStyle = P.ink; ctx.fillRect(-10, -6, 20, 12);
  ctx.fillStyle = dull ? P.grey1 : P.gold1; ctx.fillRect(-9, -5, 18, 10);
  ctx.fillStyle = dull ? P.grey2 : P.gold2; ctx.fillRect(-9, -5, 18, 2);
  ctx.fillStyle = dull ? P.grey0 : P.gold0;
  ctx.fillRect(-7, -1, 14, 1); ctx.fillRect(-7, 1, 10, 1);
  // notched ends
  ctx.fillStyle = P.ink; ctx.fillRect(-10, -1, 2, 2); ctx.fillRect(8, -1, 2, 2);
  if (!dull) {
    const g = ((o.t ?? 0) * 1.3) % 1.6;
    if (g < 1) { ctx.fillStyle = P.white; ctx.fillRect(Math.round(-9 + g * 18), -5, 2, 10); }
  }
  ctx.restore();
}

