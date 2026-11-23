// MIKE — the Television Room. Mike's been blown into pixels that swirl
// toward the little TV. Tap (or swipe) to catch them; caught pixels snap
// back onto his silhouette. Catch 70% to put him back together.
import { P, CANDY } from '../palette.js';
import { W, H, rect, ellipse, circle, seg, ease, lerp, rand, shake, flash, sparkle, input, dist } from '../engine.js';
import { drawKid } from '../kids.js';
import { MicroGame } from './base.js';
import { sfx } from '../audio.js';

const MX = 130, FEET = 238;
const TVX = 424, TVY = 160; // screen centre
const TV_W = 40, TV_H = 30;
const NEED = 0.7;

let bg = null;
function buildBg() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // dazzling bright studio
  r(0, 0, W, H, P.lilac4);
  for (let x = 0; x < W; x += 40) r(x, 0, 20, 200, P.pink4);
  r(0, 0, W, 14, P.grey0);
  for (let x = 20; x < W; x += 70) {
    // studio lamps
    r(x, 14, 4, 10, P.grey0);
    r(x - 10, 24, 24, 10, P.ink); r(x - 8, 26, 20, 6, P.grey2);
    r(x - 6, 32, 16, 3, P.lemon2);
  }
  // floor
  for (let x = 0; x < W; x += 20) for (let y = 204; y < H; y += 10) r(x, y, 20, 10, (x / 20 + (y - 204) / 10) % 2 ? P.lilac2 : P.lilac3);
  r(0, 202, W, 2, P.ink);
  // cables snaking across the floor
  for (let x = 0; x < 380; x++) r(x, Math.round(246 + Math.sin(x * 0.04) * 4), 1, 2, P.grey0);
  // the huge camera (left)
  r(4, 70, 74, 60, P.ink); r(6, 72, 70, 56, P.grey0); r(6, 72, 70, 6, P.grey1);
  r(10, 82, 30, 20, P.grey1); r(12, 84, 26, 4, P.grey2);
  r(76, 84, 18, 34, P.ink); r(78, 86, 14, 30, P.grey1);
  r(94, 88, 6, 26, P.ink); r(95, 90, 4, 22, P.lilac2); r(96, 92, 1, 8, P.white);
  r(26, 54, 22, 18, P.ink); r(28, 56, 18, 14, P.grey1); // viewfinder
  r(34, 130, 10, 60, P.ink); r(36, 130, 6, 60, P.grey1);
  r(14, 188, 50, 6, P.ink); r(16, 189, 46, 4, P.grey1);
  circle2(g, 20, 198, 6, P.ink); circle2(g, 58, 198, 6, P.ink);
  // TV table (right)
  r(TVX - 40, TVY + 28, 80, 6, P.ink); r(TVX - 38, TVY + 29, 76, 4, P.wood2);
  r(TVX - 34, TVY + 34, 4, 170 - TVY, P.wood0); r(TVX + 30, TVY + 34, 4, 170 - TVY, P.wood0);
  return c;
}
function circle2(g, cx, cy, rr, col) {
  g.fillStyle = col;
  for (let dy = -rr; dy <= rr; dy++) { const hw = Math.round(Math.sqrt(rr * rr - dy * dy)); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
}

// Sample Mike's sprite into a grid of coloured cells.
const SC = 1.4;            // Mike is drawn a bit bigger in here so he reads as pixels
const CW = 112, CH = 128;  // sprite canvas
const cellCache = new Map();
function mikeCells(target) {
  if (cellCache.has(target)) return cellCache.get(target);
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  drawKid(g, 'mike', CW / 2, CH - 2, { pose: 'idle', t: 0, scale: SC });
  const data = g.getImageData(0, 0, CW, CH).data;
  const isInk = (i) => data[i] < 80 && data[i + 1] < 50 && data[i + 2] < 60;
  let best = null;
  for (let cs = 20; cs >= 5; cs--) {
    const cells = [];
    for (let y = 0; y < CH; y += cs) for (let x = 0; x < CW; x += cs) {
      let n = 0;
      const hist = new Map();
      for (let yy = y; yy < Math.min(CH, y + cs); yy++) for (let xx = x; xx < Math.min(CW, x + cs); xx++) {
        const i = (yy * CW + xx) * 4;
        if (data[i + 3] < 128) continue;
        n++;
        if (isInk(i)) continue;
        const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
        hist.set(key, (hist.get(key) || 0) + 1);
      }
      if (n < cs * cs * 0.4) continue;
      let key = 0x3a1a1c, bn = 0;
      for (const [k, v] of hist) if (v > bn) { bn = v; key = k; }
      cells.push({ x: x - CW / 2, y: y - (CH - 2), col: '#' + key.toString(16).padStart(6, '0') });
    }
    if (!best || Math.abs(cells.length - target) < Math.abs(best.cells.length - target)) best = { cs, cells };
  }
  // silhouette mask for the ghost outline
  const mask = document.createElement('canvas');
  mask.width = CW; mask.height = CH;
  const mg = mask.getContext('2d');
  mg.drawImage(cv, 0, 0);
  mg.globalCompositeOperation = 'source-in';
  mg.fillStyle = P.lilac1;
  mg.fillRect(0, 0, CW, CH);
  best.mask = mask;
  cellCache.set(target, best);
  return best;
}

export class MikeGame extends MicroGame {
  static meta = { kid: 'mike', room: 'Television Room', command: 'Catch!', line: 'Tap the flying pixels', input: 'tap' };

  init(d) {
    super.init(d);
    const L = this.level;
    const target = this.lv([16, 26, 36, 46, 50]);
    const { cs, cells, mask } = mikeCells(target);
    this.cs = cs;
    this.mask = mask;
    const spread = this.lv([3, 2.7, 2.4, 2.0, 1.7]);
    const trav = [this.lv([3.6, 3.0, 2.4, 1.9, 1.6]), this.lv([4.6, 3.8, 3.2, 2.6, 2.2])];
    this.amp = this.lv([10, 16, 24, 32, 38]);
    this.erratic = L >= 4 ? 1 : 0;
    this.tapR = this.lv([17, 15, 13, 12, 12]);
    this.pix = cells.map((c) => {
      const a = rand(0, Math.PI * 2);
      const r = rand(20, 90);
      const hx = MX + c.x, hy = FEET + c.y;
      return {
        home: { x: hx, y: hy }, col: c.col,
        x: hx, y: hy,
        bx: hx + Math.cos(a) * r + 30, by: Math.min(232, Math.max(50, hy + Math.sin(a) * r * 0.8)),
        delay: 0.35 + Math.random() * spread * 0.6,
        travel: rand(trav[0], trav[1] + spread * 0.6),
        waves: rand(1, 1 + L * 0.5),
        ph: rand(0, Math.PI * 2),
        jx: 0, jy: 0, jt: rand(0.2, 0.6),
        s: 0, state: 'burst', k: 0,
      };
    });
    this.total = this.pix.length;
    this.caught = 0;
    this.lost = 0;
    this.duration = Math.max(...this.pix.map((p) => p.delay + p.travel)) + 0.2;
    this.tvFlash = 0;
    this.frac = 0;
  }

  path(p, s) {
    const sx = p.bx, sy = p.by;
    const ex = TVX, ey = TVY;
    const e = ease.inOutSine(s);
    const dx = ex - sx, dy = ey - sy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const off = Math.sin(s * Math.PI * 2 * p.waves + p.ph) * this.amp * Math.sin(s * Math.PI);
    return [lerp(sx, ex, e) + nx * off + p.jx * Math.sin(s * Math.PI), lerp(sy, ey, e) + ny * off + p.jy * Math.sin(s * Math.PI)];
  }

  update(dt) {
    this.tick(dt);
    this.tvFlash = Math.max(0, this.tvFlash - dt * 4);
    for (const p of this.pix) {
      if (p.state === 'burst') {
        const k = seg(this.t, 0, 0.35, ease.outCubic);
        p.x = lerp(p.home.x, p.bx, k); p.y = lerp(p.home.y, p.by, k);
        if (this.t >= 0.35) p.state = 'wait';
      } else if (p.state === 'wait') {
        p.bx += 14 * dt;
        p.x = p.bx + Math.sin(this.at * 3 + p.ph) * 3;
        p.y = p.by + Math.cos(this.at * 2.5 + p.ph) * 3;
        if (this.t >= p.delay) p.state = 'fly';
      } else if (p.state === 'fly') {
        p.s += dt / p.travel;
        if (this.erratic) {
          p.jt -= dt;
          if (p.jt <= 0) { p.jt = rand(0.2, 0.5); p.tjx = rand(-40, 40); p.tjy = rand(-40, 40); }
          p.jx = lerp(p.jx, p.tjx || 0, Math.min(1, dt * 4)); p.jy = lerp(p.jy, p.tjy || 0, Math.min(1, dt * 4));
        }
        if (p.s >= 1) {
          p.state = 'tv'; p.k = 0; this.lost++; this.tvFlash = 1; if (!this.result) sfx('zap');
        } else {
          [p.x, p.y] = this.path(p, p.s);
          if (!this.result && input.down && this.dragging && dist(p.x + this.cs / 2, p.y + this.cs / 2, input.x, input.y) < this.tapR - 3) this.catchPix(p);
        }
      } else if (p.state === 'caught') {
        p.k += dt / 0.22;
        const e = ease.inQuad(Math.min(1, p.k));
        p.x = lerp(p.cx, p.home.x, e); p.y = lerp(p.cy, p.home.y, e) - Math.sin(e * Math.PI) * 14;
        if (p.k >= 1) {
          p.state = 'placed'; p.x = p.home.x; p.y = p.home.y;
          this.parts.add({ x: p.x + this.cs / 2, y: p.y + this.cs / 2, shape: 'spark', size: 3, color: P.white, life: 0.2 });
        }
      } else if (p.state === 'tv') {
        p.k += dt / 0.2;
        if (p.k >= 1) p.state = 'gone';
      }
    }
    if (!this.result && this.pix.every((p) => p.state === 'placed' || p.state === 'gone' || p.state === 'tv' || p.state === 'caught')) this.resolve();
  }

  catchPix(p) {
    sfx('ping', this.caught);
    p.state = 'caught'; p.k = 0; p.cx = p.x; p.cy = p.y;
    this.caught++;
    this.parts.burst(p.x, p.y, 4, { colors: [p.col, P.white], speed: [30, 80], life: [0.15, 0.3], size: [1, 2] });
  }

  onDown(x, y) {
    this.dragging = true;
    let n = 0;
    for (const p of this.pix) if (p.state === 'fly' || p.state === 'wait') {
      if (dist(p.x + this.cs / 2, p.y + this.cs / 2, x, y) < this.tapR) { this.catchPix(p); n++; }
    }
    if (n) shake(1, 0.05);
    else this.parts.burst(x, y, 5, { colors: [P.white, P.mint2], speed: [20, 50], life: [0.15, 0.25], shape: 'ring', size: [4, 6] });
  }
  onUp() { this.dragging = false; }

  resolve() {
    this.frac = this.caught / this.total;
    if (this.frac >= NEED) this.win(); else this.fail();
  }
  onTimeout() { this.resolve(); }

  onWin() {
    this.outDur = 2.1;
    setTimeout(() => sfx('cheer'), 300);
    flash(P.white, 0.2);
    this.parts.burst(MX, FEET - 40, 30, { colors: CANDY, speed: [60, 180], g: 200, life: [0.5, 1] });
  }
  onFail() {
    this.outDur = 2.4;
    sfx('zap'); setTimeout(() => sfx('zap'), 400);
    // what he managed to catch gets sucked in too
    for (const p of this.pix) if (p.state === 'placed' || p.state === 'caught') { p.state = 'suck'; p.k = 0; p.sx = p.x; p.sy = p.y; p.d = Math.random() * 0.3; }
  }

  drawTV(ctx) {
    const at = this.at;
    // TV body
    rect(ctx, TVX - TV_W / 2 - 6, TVY - TV_H / 2 - 6, TV_W + 12, TV_H + 14, P.ink);
    rect(ctx, TVX - TV_W / 2 - 5, TVY - TV_H / 2 - 5, TV_W + 10, TV_H + 12, P.wood1);
    rect(ctx, TVX - TV_W / 2 - 5, TVY - TV_H / 2 - 5, TV_W + 10, 2, P.wood2);
    // antenna
    rect(ctx, TVX - 8, TVY - TV_H / 2 - 18, 1, 12, P.ink); rect(ctx, TVX + 8, TVY - TV_H / 2 - 18, 1, 12, P.ink);
    rect(ctx, TVX - 9 + Math.round(Math.sin(at * 2)), TVY - TV_H / 2 - 13, 1, 1, P.ink);
    // screen with static
    const sx = TVX - TV_W / 2, sy = TVY - TV_H / 2;
    rect(ctx, sx, sy, TV_W, TV_H, P.berry0);
    const n = Math.floor(at * 20);
    for (let i = 0; i < 40; i++) {
      const v = ((i * 7919 + n * 104729) % 997) / 997;
      ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.25)' : 'rgba(225,195,255,0.2)';
      ctx.fillRect(sx + Math.floor(v * TV_W), sy + ((i * 13 + n * 3) % TV_H), 2, 1);
    }
    if (this.tvFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${this.tvFlash * 0.5})`; ctx.fillRect(sx, sy, TV_W, TV_H); }
    rect(ctx, sx + 2, sy + 2, 6, 2, 'rgba(255,255,255,0.5)');
    // knobs
    rect(ctx, TVX + TV_W / 2 - 4, TVY + TV_H / 2 + 2, 3, 3, P.gold1);
    rect(ctx, TVX + TV_W / 2 - 10, TVY + TV_H / 2 + 2, 3, 3, P.gold1);
  }

  draw(ctx) {
    if (!bg) bg = buildBg();
    ctx.drawImage(bg, 0, 0);
    const at = this.at;
    // camera beam + light
    ctx.fillStyle = 'rgba(255,255,220,0.25)';
    ctx.beginPath(); ctx.moveTo(100, 92); ctx.lineTo(100, 112); ctx.lineTo(TVX - 26, TVY + 20); ctx.lineTo(TVX - 26, TVY - 20); ctx.fill();
    rect(ctx, 60, 74, 6, 6, Math.floor(at * 3) % 2 ? P.red1 : P.red0); // on-air light

    this.drawTV(ctx);
    const won = this.result === 'win', failed = this.result === 'fail';
    const ot = this.outT;
    const cs = this.cs;

    // ghost silhouette
    if (!won || ot < 0.3) {
      ctx.globalAlpha = 0.35 + Math.sin(at * 6) * 0.08;
      ctx.drawImage(this.mask, MX - CW / 2, FEET - (CH - 2));
      ctx.globalAlpha = 1;
    }

    // pixels
    for (const p of this.pix) {
      if (p.state === 'gone') continue;
      if (won && p.state === 'placed' && ot > 0.3) continue;
      let x = p.x, y = p.y, s = cs;
      if (p.state === 'tv') {
        s = Math.max(1, Math.round(cs * (1 - p.k)));
        x = lerp(p.x, TVX, p.k); y = lerp(p.y, TVY, p.k);
      } else if (p.state === 'suck') {
        const k = seg(ot, p.d, 0.5, ease.inQuad);
        if (k >= 1) continue;
        x = lerp(p.sx, TVX, k); y = lerp(p.sy, TVY, k) - Math.sin(k * Math.PI) * 30;
        s = Math.max(1, Math.round(cs * (1 - k)));
      } else if (p.state === 'fly' || p.state === 'wait' || p.state === 'burst') {
        // trailing glint
        rect(ctx, x - 2, y + cs / 2, 2, 1, 'rgba(255,255,255,0.6)');
      }
      rect(ctx, x - 1, y - 1, s + 2, s + 2, P.ink);
      ctx.fillStyle = p.col;
      ctx.fillRect(Math.round(x), Math.round(y), s, s);
      if (s > 3) rect(ctx, x, y, s, 1, 'rgba(255,255,255,0.35)');
    }

    // catch gauge
    const gx = 196, gy = 130, gh = 90;
    const f = this.result ? this.frac : this.caught / this.total;
    rect(ctx, gx - 1, gy - 1, 8, gh + 2, P.ink);
    rect(ctx, gx, gy, 6, gh, P.grey3);
    const fh = Math.round(gh * f);
    rect(ctx, gx, gy + gh - fh, 6, fh, f >= NEED ? P.mint1 : P.pink1);
    rect(ctx, gx - 3, gy + Math.round(gh * (1 - NEED)), 12, 1, P.ink);

    if (won) {
      const pop = seg(ot, 0.25, 0.4, ease.outBack);
      const sc = lerp(this.frac, 1, seg(ot, 0.7, 0.35, ease.outElastic));
      if (ot > 0.25) {
        drawKid(ctx, 'mike', MX, FEET, { pose: 'cheer', t: at, open: Math.abs(Math.sin(at * 12)), scale: Math.max(0.01, pop * sc * SC) });
        if (ot < 0.5) sparkle(ctx, MX + 20, FEET - 60, 5, P.white);
      }
    }
    if (failed && ot > 0.6) {
      // tiny Mike waving furiously inside the TV
      const k = seg(ot, 0.6, 0.3, ease.outBack);
      ctx.save();
      ctx.beginPath(); ctx.rect(TVX - TV_W / 2, TVY - TV_H / 2, TV_W, TV_H); ctx.clip();
      rect(ctx, TVX - TV_W / 2, TVY - TV_H / 2, TV_W, TV_H, P.blue2);
      rect(ctx, TVX - TV_W / 2, TVY + 8, TV_W, 8, P.grass1);
      const tiny = (0.22 + 0.15 * this.frac) * k;
      drawKid(ctx, 'mike', TVX + Math.sin(at * 20) * 2, TVY + 12, { pose: 'scared', t: at, open: Math.abs(Math.sin(at * 22)), scared: true, scale: Math.max(0.01, tiny) });
      // scanlines
      for (let y = TVY - TV_H / 2; y < TVY + TV_H / 2; y += 2) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(TVX - TV_W / 2, y, TV_W, 1); }
      ctx.restore();
    }
    this.parts.draw(ctx);
  }
}
