// CHARLIE — the sweetshop. A golden ticket is slipped into one Wonka bar,
// the bars are wrapped and shuffled, and you get one tap to find it.
import { P, GOLDS } from '../palette.js';
import { W, H, rect, ellipse, seg, ease, lerp, randInt, chance, shake, sparkle, input } from '../engine.js';
import { drawKid } from '../kids.js';
import { drawTicket } from '../chocroom.js';
import { MicroGame } from './base.js';

const COUNTER_Y = 180; // bars stand on this line
const BAR_W = 28, BAR_H = 44;

let bg = null;
function buildBg() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // striped wallpaper
  for (let x = 0; x < W; x += 16) { r(x, 0, 8, H, P.pink3); r(x + 8, 0, 8, H, P.pink4); }
  for (let x = 4; x < W; x += 16) for (let y = 6; y < H; y += 14) r(x + 7, y, 2, 2, P.pink2);
  // shelves of sweet jars
  const jarCols = [[P.pink1, P.white], [P.lemon1, P.orange], [P.mint1, P.white], [P.lilac1, P.pink2], [P.red1, P.white], [P.blue2, P.lemon1]];
  for (const [sy, off] of [[58, 0], [112, 2]]) {
    r(96, sy, 384, 5, P.wood1); r(96, sy + 5, 384, 2, P.wood0);
    for (let i = 0; i < 12; i++) {
      const jx = 104 + i * 31, jh = 26 + ((i + off) % 3) * 4, jw = 22;
      const [c1, c2] = jarCols[(i + off) % jarCols.length];
      r(jx - 1, sy - jh - 1, jw + 2, jh + 1, P.ink);
      r(jx, sy - jh, jw, jh, 'rgba(255,255,255,0.55)');
      for (let k = 0; k < 18; k++) {
        const dx = (k * 7 + i * 3) % (jw - 4), dy = jh - 4 - ((k * 5) % Math.round(jh * 0.7));
        r(jx + 2 + dx, sy - jh + dy, 3, 3, k % 3 ? c1 : c2);
      }
      r(jx - 2, sy - jh - 5, jw + 4, 5, P.ink);
      r(jx - 1, sy - jh - 4, jw + 2, 3, (i + off) % 2 ? P.mint1 : P.pink1);
      r(jx + 2, sy - jh + 2, 2, jh - 6, 'rgba(255,255,255,0.7)');
    }
  }
  // window on the left with snow (it's winter in the book)
  r(10, 20, 72, 90, P.ink); r(14, 24, 64, 82, '#9fc4ff');
  r(14, 90, 64, 16, P.white);
  r(44, 24, 4, 82, P.ink); r(14, 62, 64, 4, P.ink);
  r(6, 108, 80, 6, P.wood1);
  // counter
  r(88, COUNTER_Y - 4, W - 88, 4, P.ink);
  r(88, COUNTER_Y, W - 88, 8, P.cream2);
  r(88, COUNTER_Y, W - 88, 2, P.white);
  r(88, COUNTER_Y + 8, W - 88, 2, P.ink);
  r(90, COUNTER_Y + 10, W - 90, H, P.wood1);
  for (let x = 96; x < W; x += 64) {
    r(x, COUNTER_Y + 18, 56, 60, P.wood0);
    r(x + 2, COUNTER_Y + 20, 52, 56, P.wood2);
    r(x + 2, COUNTER_Y + 20, 52, 2, P.cream3);
  }
  r(88, COUNTER_Y - 4, 4, H, P.ink);
  // floor tiles on the left where Charlie stands
  for (let x = 0; x < 88; x += 8) for (let y = 236; y < H; y += 8) r(x, y, 8, 8, ((x + y) / 8) % 2 ? P.cream : P.lilac3);
  r(0, 234, 88, 2, P.ink);
  return c;
}

function drawBar(ctx, x, bottom, o = {}) {
  const wrapK = o.wrapK ?? 1;   // how far the wrapper is pulled up (0..1)
  const lift = o.lift ?? 0;
  const s = o.scale ?? 1;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(bottom - lift));
  ctx.scale(s, s);
  const w = BAR_W, h = BAR_H, x0 = -w / 2, y0 = -h;
  // shadow on counter handled by caller
  rect(ctx, x0 - 1, y0 - 1, w + 2, h + 2, P.ink);
  // chocolate slab
  rect(ctx, x0, y0, w, h, P.choc2);
  for (let gy = 0; gy < 4; gy++) for (let gx = 0; gx < 2; gx++) {
    rect(ctx, x0 + 2 + gx * 13, y0 + 2 + gy * 10, 11, 8, P.choc3);
    rect(ctx, x0 + 2 + gx * 13, y0 + 2 + gy * 10, 11, 1, P.choc4);
  }
  // hidden ticket sticking out of the slab
  if (o.ticketIn != null) {
    drawTicket(ctx, 0, y0 + o.ticketIn, { rot: Math.PI / 2, t: o.t ?? 0 });
  }
  // purple wrapper with gold trim
  const wh = Math.round(h * wrapK);
  if (wh > 0) {
    const wy = y0 + h - wh;
    rect(ctx, x0, wy, w, wh, P.lilac0);
    rect(ctx, x0 + 2, wy, w - 4, wh, P.lilac1);
    rect(ctx, x0, wy, w, 3, P.gold1);
    rect(ctx, x0, wy + 3, w, 1, P.gold0);
    if (wh > 26) {
      const cy = y0 + h - 18;
      rect(ctx, x0 + 4, cy - 5, w - 8, 11, P.gold1);
      rect(ctx, x0 + 5, cy - 4, w - 10, 9, P.lilac0);
      // little "W" squiggle
      for (const [dx, dy] of [[-6, -2], [-5, 0], [-4, 2], [-3, 0], [-2, -2], [-1, 0], [0, 2], [1, 0], [2, -2], [3, 0], [4, 2], [5, 0]]) rect(ctx, dx, cy + dy, 1, 2, P.gold2);
    }
    if (wh > 8) rect(ctx, x0 + 3, wy + 5, 2, wh - 8, 'rgba(255,255,255,0.35)');
  }
  if (o.highlight) {
    ctx.globalAlpha = 0.25;
    rect(ctx, x0, y0, w, h, P.white);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

export class CharlieGame extends MicroGame {
  static meta = { kid: 'charlie', room: 'The Sweetshop', command: 'Find it!' };

  init(d) {
    super.init(d);
    const L = this.loop;
    if (L <= 1) Object.assign(this, { n: 3, swaps: 3, swapDur: 0.52, fake: 0, pickTime: 3.0 });
    else if (L === 2) Object.assign(this, { n: 4, swaps: 5, swapDur: 0.4, fake: 0, pickTime: 2.6 });
    else Object.assign(this, { n: 5, swaps: Math.min(12, 5 + L), swapDur: Math.max(0.2, 0.34 - 0.03 * (L - 3)), fake: Math.min(0.35, 0.15 + 0.05 * (L - 3)), pickTime: 2.4 });
    this.gap = 0.06;
    this.slotX = Array.from({ length: this.n }, (_, i) => 130 + (i + 0.5) * (330 / this.n));
    this.bars = Array.from({ length: this.n }, (_, i) => ({ slot: i, x: this.slotX[i], y: 0, s: 1, front: 0 }));
    this.ticketBar = randInt(0, this.n - 1);
    this.showDur = 1.25;
    // build the swap schedule
    this.plan = [];
    let tt = this.showDur;
    for (let i = 0; i < this.swaps; i++) {
      let a = randInt(0, this.n - 1), b;
      if (chance(0.5)) a = -1; // marker: involve the ticket bar's slot (resolved at runtime)
      do { b = randInt(0, this.n - 1); } while (b === a);
      const fake = chance(this.fake);
      this.plan.push({ t0: tt, a, b, fake, started: false, done: false });
      tt += this.swapDur + this.gap;
    }
    this.pickAt = tt;
    this.duration = tt + this.pickTime;
    this.phase = 'show';
    this.picked = -1;
    this.hover = -1;
  }

  barAtSlot(slot) { return this.bars.findIndex((b) => b.slot === slot); }

  update(dt) {
    this.tick(dt);
    const t = this.t;
    if (this.phase === 'show' && t >= this.showDur) this.phase = 'shuffle';
    if (this.phase === 'shuffle') {
      for (const sw of this.plan) {
        if (t < sw.t0 || sw.done) continue;
        if (!sw.started) {
          sw.started = true;
          let a = sw.a;
          if (a === -1) a = this.bars[this.ticketBar].slot;
          let b = sw.b;
          if (b === a) b = (a + 1) % this.n;
          sw.A = this.barAtSlot(a); sw.B = this.barAtSlot(b);
          sw.xa = this.slotX[a]; sw.xb = this.slotX[b];
          sw.sa = a; sw.sb = b;
        }
        const k = Math.min(1, (t - sw.t0) / this.swapDur);
        let e = ease.inOutQuad(k);
        if (sw.fake) e = Math.sin(Math.PI * k) * 0.42;
        const A = this.bars[sw.A], B = this.bars[sw.B];
        A.x = lerp(sw.xa, sw.xb, e); A.y = Math.sin(Math.PI * e) * 46; A.front = 1;
        B.x = lerp(sw.xb, sw.xa, e); B.y = Math.sin(Math.PI * e) * 12; B.front = 0; B.s = 1 - Math.sin(Math.PI * e) * 0.12;
        if (k >= 1) {
          sw.done = true;
          if (!sw.fake) { A.slot = sw.sb; B.slot = sw.sa; }
          A.x = this.slotX[A.slot]; B.x = this.slotX[B.slot];
          A.y = B.y = 0; B.s = 1; A.front = 0;
          shake(1, 0.06);
          this.parts.burst(A.x, COUNTER_Y, 4, { colors: [P.cream, P.white], speed: [20, 50], angle: [Math.PI, Math.PI * 2], life: [0.2, 0.35] });
        }
      }
      if (t >= this.pickAt) this.phase = 'pick';
    }
    if (this.phase === 'pick' && input.type === 'mouse') this.hover = this.hit(input.x, input.y);
    if (this.result === 'win' && Math.random() < 0.5) {
      this.parts.add({ x: this.ticketPos.x + (Math.random() - 0.5) * 50, y: this.ticketPos.y + (Math.random() - 0.5) * 30, shape: 'spark', size: 3, color: '#fff6c0', life: 0.4 });
    }
  }

  hit(x, y) {
    let best = -1, bd = 1e9;
    this.bars.forEach((b, i) => {
      if (x > b.x - BAR_W / 2 - 8 && x < b.x + BAR_W / 2 + 8 && y > COUNTER_Y - BAR_H - 24 && y < COUNTER_Y + 14) {
        const d = Math.abs(x - b.x);
        if (d < bd) { bd = d; best = i; }
      }
    });
    return best;
  }

  onDown(x, y) {
    if (this.phase !== 'pick' || this.picked >= 0) return;
    const i = this.hit(x, y);
    if (i < 0) return;
    this.picked = i;
    this.phase = 'reveal';
    this.revealT = this.t;
    const b = this.bars[i];
    if (i === this.ticketBar) {
      this.ticketPos = { x: b.x, y: 70 };
      this.win();
      this.parts.burst(b.x, COUNTER_Y - 40, 40, { colors: GOLDS, speed: [60, 200], g: 160, life: [0.5, 1.0], size: [1, 3] });
    } else {
      this.fail();
      this.parts.burst(b.x, COUNTER_Y - 30, 10, { colors: [P.choc3, P.choc4], speed: [30, 80], g: 200 });
    }
  }

  onTimeout() {
    this.phase = 'reveal';
    this.revealT = this.t;
    this.picked = -1;
    this.fail();
  }

  draw(ctx) {
    if (!bg) bg = buildBg();
    ctx.drawImage(bg, 0, 0);
    const t = this.t, at = this.at;
    const rt = this.phase === 'reveal' ? this.t - this.revealT : 0;

    // Charlie
    const won = this.result === 'win', lost = this.result === 'fail';
    drawKid(ctx, 'charlie', 46, 256, {
      pose: won ? 'cheer' : lost ? 'scared' : this.phase === 'pick' ? 'idle' : 'idle',
      t: at,
      open: won ? Math.abs(Math.sin(at * 12)) : lost ? 0.4 + Math.abs(Math.sin(at * 20)) * 0.3 : this.phase === 'show' ? Math.max(0, Math.sin(at * 10)) * 0.4 : 0,
      scared: lost,
    });

    // bars, back ones first
    const order = this.bars.map((b, i) => i).sort((a, b) => this.bars[a].front - this.bars[b].front);
    for (const i of order) {
      const b = this.bars[i];
      // shadow
      ellipse(ctx, b.x, COUNTER_Y + 2, 14 - b.y * 0.1, 2, 'rgba(60,20,10,0.35)');
      let wrapK = 1, ticketIn = null, lift = b.y;
      if (this.phase === 'show') {
        wrapK = lerp(0.55, 1, seg(t, 0.78, 0.35, ease.outQuad));
        if (i === this.ticketBar && t > 0.3) ticketIn = lerp(-14, 16, seg(t, 0.35, 0.4, ease.inOutQuad));
      }
      if (this.phase === 'pick') lift += Math.abs(Math.sin(at * 4 + i)) * 2 + (this.hover === i ? 3 : 0);
      const isPicked = i === this.picked;
      const isTicket = i === this.ticketBar;
      if (this.phase === 'reveal') {
        const myT = isPicked ? rt : isTicket ? rt - 0.45 : -1;
        if (myT >= 0) {
          lift += seg(myT, 0, 0.12, ease.outQuad) * 8;
          wrapK = 1 - seg(myT, 0.05, 0.3, ease.outQuad) * 0.7;
          if (isTicket && !isPicked) ticketIn = lerp(16, 0, seg(myT, 0.2, 0.3, ease.outBack));
        }
      }
      drawBar(ctx, b.x, COUNTER_Y, { wrapK, lift, scale: b.s, ticketIn, t: at, highlight: this.hover === i && this.phase === 'pick' });
      // ticket dropping in from above during the show
      if (this.phase === 'show' && i === this.ticketBar && t < 0.35) {
        const k = seg(t, 0, 0.3, ease.outBack);
        drawTicket(ctx, b.x, COUNTER_Y - BAR_H - 40 + k * 18, { rot: Math.PI / 2, t: at, scale: 1.2, alpha: Math.min(1, t * 6) });
        sparkle(ctx, b.x + 8, COUNTER_Y - BAR_H - 46 + k * 18, 2 + Math.round(Math.sin(at * 20)), P.white);
      }
    }

    // winner: ticket rises up and glints
    if (won) {
      const b = this.bars[this.picked];
      const k = seg(rt, 0.1, 0.45, ease.outBack);
      const x = b.x + (W / 2 - 30 - b.x) * k * 0.5;
      const y = lerp(COUNTER_Y - 30, 78, k);
      this.ticketPos = { x, y };
      const s = 1 + k * 2.2;
      // rays
      ctx.save();
      ctx.globalAlpha = 0.35 * k;
      ctx.translate(x, y);
      ctx.rotate(at * 1.5);
      ctx.fillStyle = P.gold2;
      for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-3, 10, 6, 50); }
      ctx.restore();
      drawTicket(ctx, x, y, { scale: s, t: at * 1.5, rot: Math.sin(at * 6) * 0.08 });
      sparkle(ctx, x - 22 * s / 3, y - 8, 2 + Math.round(Math.abs(Math.sin(at * 15)) * 3), P.white);
      sparkle(ctx, x + 24 * s / 3, y + 6, 2 + Math.round(Math.abs(Math.cos(at * 13)) * 3), P.gold3);
    }
    if (lost && this.picked >= 0 && rt > 0.1) {
      // plain chocolate: a little sad puff over the wrong bar
      const b = this.bars[this.picked];
      ellipse(ctx, b.x, COUNTER_Y - BAR_H - 14 - rt * 6, 4 + rt * 3, 3 + rt * 2, `rgba(255,255,255,${Math.max(0, 0.6 - rt * 0.4)})`);
    }
    this.parts.draw(ctx);
  }
}
