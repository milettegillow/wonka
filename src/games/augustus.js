// AUGUSTUS (boss) — the chocolate river, seen from above. Augustus swims
// toward the pointer; the current drags him toward the great glass pipe.
// Survive until the timer runs out and he flops onto the bank.
import { P, mix } from '../palette.js';
import { W, H, rect, ellipse, circle, ringPx, seg, ease, lerp, rand, chance, clamp, shake, flash, sparkle, input, dist, limb, text } from '../engine.js';
import { drawKid, drawOompa } from '../kids.js';
import { drawHead } from '../faces.js';
import { MicroGame } from './base.js';

const TOP = 40, BOT = 226;           // river banks
const PX = 440, PY = 132, PR = 22;   // pipe intake
const AR = 13;                        // Augustus radius

let bg = null;
function buildBg() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const e = (cx, cy, rx, ry, col) => {
    g.fillStyle = col;
    for (let dy = -ry; dy <= ry; dy++) { const k = 1 - (dy / (ry + 0.5)) ** 2; if (k <= 0) continue; const hw = Math.round(rx * Math.sqrt(k)); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1); }
  };
  r(0, 0, W, H, P.choc2);
  // banks (meadow seen from above)
  for (let x = 0; x < W; x++) {
    const t1 = Math.round(TOP + Math.sin(x * 0.05) * 2 + Math.sin(x * 0.17) * 1);
    r(x, 0, 1, t1, P.grass1); r(x, t1 - 2, 1, 2, P.grass0); r(x, t1, 1, 2, P.choc1);
    const b1 = Math.round(BOT + Math.sin(x * 0.04 + 1) * 2 + Math.sin(x * 0.21) * 1);
    r(x, b1, 1, H - b1, P.grass1); r(x, b1, 1, 2, P.grass0); r(x, b1 - 2, 1, 2, P.choc1);
  }
  for (let i = 0; i < 120; i++) {
    const x = (i * 131 + 5) % W;
    const y = i % 2 ? (i * 7) % (TOP - 8) + 2 : BOT + 6 + (i * 11) % (H - BOT - 10);
    r(x, y, 2, 1, P.grass2);
    if (i % 4 === 0) { r(x + 3, y + 1, 3, 3, P.lemon1); r(x + 4, y + 2, 1, 1, P.lemon3); }
  }
  // candy trees from above: round striped crowns
  const tree = (x, y, rr, c1, c2) => {
    e(x + 3, y + 4, rr, rr, 'rgba(0,60,20,0.35)');
    e(x, y, rr + 1, rr + 1, P.ink); e(x, y, rr, rr, c1);
    for (let a = 0; a < 6; a++) { const ang = a * Math.PI / 3; e(Math.round(x + Math.cos(ang) * rr * 0.55), Math.round(y + Math.sin(ang) * rr * 0.55), 2, 2, c2); }
    e(x - 3, y - 3, 3, 2, P.white);
  };
  tree(60, 14, 11, P.pink1, P.white); tree(170, 10, 9, P.lemon1, P.pink1); tree(300, 16, 10, P.mint1, P.white);
  tree(110, 252, 12, P.lilac1, P.white); tree(250, 248, 9, P.pink2, P.lemon1); tree(390, 254, 11, P.mint1, P.pink1);
  return c;
}

export class AugustusGame extends MicroGame {
  static meta = { kid: 'augustus', room: 'Chocolate River', command: 'Swim!', boss: true };

  init(d) {
    super.init(d);
    const L = this.loop;
    this.duration = Math.min(20, 15 + (L - 1));
    this.cur = 22 + 4 * (L - 1);
    this.suck = 58 + 6 * (L - 1);
    this.maxSpd = 80;
    this.acc = 260;
    this.x = 170; this.y = 132; this.vx = 0; this.vy = 0;
    this.face = 1;
    this.pulse = 0;           // 0..1 strength of suction pulse
    this.pulseState = 'idle';
    this.pulseT = 0;
    this.pulseNext = rand(2.4, 3.4);
    this.pulseGap = [Math.max(1.8, 3.2 - 0.3 * (L - 1)), Math.max(2.6, 4.4 - 0.3 * (L - 1))];
    this.tell = Math.max(0.35, 0.7 - 0.1 * (L - 1));
    this.bubbles = [];
    this.bubbleT = 1.2;
    this.bubbleGap = Math.max(0.8, 1.6 - 0.2 * (L - 1));
    this.oars = [];
    this.oarT = 2.5;
    this.oompas = [];
    const n = L <= 1 ? 0 : L <= 2 ? 1 : L <= 4 ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const o = { spd: Math.min(58, 32 + 5 * L + i * 2), ph: rand(0, 6) };
      this.placeOompa(o, 1 + i * 1.6, i);
      this.oompas.push(o);
    }
    this.ripples = [];
    this.caughtBy = null;
    this.zaps = [];
    this.hitCool = 0;
  }

  placeOompa(o, delay, i = Math.floor(rand(0, 4))) {
    const top = i % 2 === 0;
    Object.assign(o, { x: rand(70, 320), y: top ? TOP - 10 : BOT + 10, vx: 0, vy: 0, delay: this.t + delay, inWater: false, gone: false, chase: rand(2.2, 3), rest: 0 });
  }

  flowAt(x, y) {
    // base current + pull toward the pipe + churn off the waterfall
    let fx = this.cur, fy = 0;
    const dx = PX - x, dy = PY - y, d = Math.hypot(dx, dy) || 1;
    const s = (this.suck * (1 + this.pulse * 1.3)) / (1 + (d / 120) ** 2);
    fx += (dx / d) * s; fy += (dy / d) * s;
    if (x < 70) fx += (70 - x) * 1.4;
    // slight swirl around the intake
    fx += (-dy / d) * s * 0.25; fy += (dx / d) * s * 0.25;
    return [fx, fy];
  }

  update(dt) {
    this.tick(dt);
    this.hitCool = Math.max(0, this.hitCool - dt);
    if (this.result) { this.updateOutcome(dt); return; }
    const t = this.t;

    // suction pulses with a tell
    this.pulseT += dt;
    if (this.pulseState === 'idle' && this.pulseT >= this.pulseNext) { this.pulseState = 'tell'; this.pulseT = 0; }
    else if (this.pulseState === 'tell' && this.pulseT >= this.tell) { this.pulseState = 'pulse'; this.pulseT = 0; shake(3, 0.3); }
    else if (this.pulseState === 'pulse' && this.pulseT >= 1.0) { this.pulseState = 'idle'; this.pulseT = 0; this.pulseNext = rand(this.pulseGap[0], this.pulseGap[1]); }
    const want = this.pulseState === 'pulse' ? 1 : 0;
    this.pulse = lerp(this.pulse, want, Math.min(1, dt * 6));
    if (this.pulseState === 'pulse' && chance(0.3)) shake(1.5, 0.1);

    // steering toward the pointer
    const steer = input.down || (input.type === 'mouse' && input.hover);
    if (steer) {
      const dx = input.x - this.x, dy = input.y - this.y, d = Math.hypot(dx, dy);
      if (d > 4) {
        const a = Math.min(1, d / 30);
        this.vx += (dx / d) * this.acc * a * dt;
        this.vy += (dy / d) * this.acc * a * dt;
      }
    }
    // drag + cap
    const drag = Math.max(0, 1 - dt * 1.6);
    this.vx *= drag; this.vy *= drag;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > this.maxSpd) { this.vx *= this.maxSpd / sp; this.vy *= this.maxSpd / sp; }
    const [fx, fy] = this.flowAt(this.x, this.y);
    this.x += (this.vx + fx) * dt;
    this.y += (this.vy + fy) * dt;
    if (Math.abs(this.vx) > 8) this.face = this.vx > 0 ? 1 : -1;
    // banks are too steep to climb out (for now)
    if (this.y < TOP + AR) { this.y = TOP + AR; this.vy = Math.abs(this.vy) * 0.4; }
    if (this.y > BOT - AR) { this.y = BOT - AR; this.vy = -Math.abs(this.vy) * 0.4; }
    if (this.x < AR + 4) { this.x = AR + 4; this.vx = Math.abs(this.vx); }

    // wake ripples
    if (this.at % 0.15 < dt) this.ripples.push({ x: this.x, y: this.y + 6, t: 0 });
    for (const r of this.ripples) { r.t += dt; r.x += this.cur * dt; }
    this.ripples = this.ripples.filter((r) => r.t < 0.8);

    // the pipe
    if (dist(this.x, this.y, PX, PY) < PR + AR - 6) { this.fail(); return; }

    // chocolate bubbles: swell (tell) then pop, shoving him
    this.bubbleT -= dt;
    if (this.bubbleT <= 0) {
      this.bubbleT = this.bubbleGap * rand(0.7, 1.3);
      const bx = clamp(this.x + rand(-80, 60), 60, 400), by = clamp(this.y + rand(-50, 50), TOP + 16, BOT - 16);
      this.bubbles.push({ x: bx, y: by, t: 0, life: 1.1 });
    }
    for (const b of this.bubbles) {
      b.t += dt;
      b.x += this.cur * 0.5 * dt;
      if (b.t >= b.life && !b.popped) {
        b.popped = true;
        const d = dist(b.x, b.y, this.x, this.y);
        if (d < 56) {
          const k = (1 - d / 56) * 170;
          this.vx += ((this.x - b.x) / (d || 1)) * k; this.vy += ((this.y - b.y) / (d || 1)) * k;
          shake(4, 0.2);
        }
        this.parts.burst(b.x, b.y, 14, { colors: [P.choc3, P.choc4, P.caramel], speed: [50, 140], g: 0, drag: 4, life: [0.3, 0.5], size: [2, 3] });
      }
    }
    this.bubbles = this.bubbles.filter((b) => !b.popped);

    // drifting oars
    this.oarT -= dt;
    if (this.oarT <= 0) {
      this.oarT = rand(3.5, 5.5) - 0.4 * (this.loop - 1);
      this.oars.push({ x: -40, y: rand(TOP + 30, BOT - 30), a: rand(0, Math.PI), va: rand(-1.2, 1.2), vx: this.cur + rand(10, 30) + 6 * this.loop });
    }
    for (const o of this.oars) {
      o.x += o.vx * dt; o.a += o.va * dt;
      // segment collision
      const hx = Math.cos(o.a) * 30, hy = Math.sin(o.a) * 30;
      const ax = o.x - hx, ay = o.y - hy, bx = o.x + hx, by = o.y + hy;
      const abx = bx - ax, aby = by - ay;
      const k = clamp(((this.x - ax) * abx + (this.y - ay) * aby) / (abx * abx + aby * aby), 0, 1);
      const cx = ax + abx * k, cy = ay + aby * k;
      const d = dist(cx, cy, this.x, this.y);
      if (d < AR + 4 && this.hitCool <= 0) {
        this.hitCool = 0.4;
        const nx = (this.x - cx) / (d || 1), ny = (this.y - cy) / (d || 1);
        this.vx += nx * 140 + o.vx * 0.8; this.vy += ny * 140;
        o.va *= -1.5;
        shake(5, 0.25);
        flash(P.cream, 0.08);
        this.parts.burst(cx, cy, 8, { colors: [P.wood2, P.caramel2, P.white], speed: [40, 100], life: [0.2, 0.4] });
      }
    }
    this.oars = this.oars.filter((o) => o.x < W + 60);

    // Oompa-Loompas give chase (they tire, and the current drags them too)
    for (const o of this.oompas) {
      if (t < o.delay) continue;
      if (!o.inWater) { o.inWater = true; this.parts.burst(o.x, o.y, 10, { colors: [P.choc4, P.caramel2], speed: [30, 80], life: [0.3, 0.5] }); }
      if (o.rest > 0) {
        o.rest -= dt;
        o.vx *= Math.max(0, 1 - dt * 3); o.vy *= Math.max(0, 1 - dt * 3);
        if (o.rest <= 0) o.chase = rand(2.2, 3.2);
      } else {
        o.chase -= dt;
        if (o.chase <= 0) o.rest = rand(0.7, 1.1);
        const dx = this.x - o.x, dy = this.y - o.y, d = Math.hypot(dx, dy) || 1;
        o.vx = lerp(o.vx, (dx / d) * o.spd, Math.min(1, dt * 1.1));
        o.vy = lerp(o.vy, (dy / d) * o.spd, Math.min(1, dt * 1.1));
      }
      const [ofx, ofy] = this.flowAt(o.x, o.y);
      o.x += (o.vx + ofx * 0.55) * dt; o.y += (o.vy + ofy * 0.55) * dt;
      o.y = clamp(o.y, TOP + 8, BOT - 8);
      if (o.x < 20) o.x = 20;
      // lured into the pipe: whoosh, back to the bank
      if (dist(o.x, o.y, PX, PY) < PR + 2) {
        this.parts.burst(PX, PY, 18, { colors: [P.choc4, P.caramel2, P.white], speed: [40, 140], life: [0.3, 0.6] });
        this.zaps.push({ t: 0 });
        shake(3, 0.2);
        this.placeOompa(o, 2.5);
        continue;
      }
      if (dist(this.x, this.y, o.x, o.y) < AR + 7) { this.caughtBy = o; this.fail(); return; }
    }
    for (const z of this.zaps) z.t += dt;
    this.zaps = this.zaps.filter((z) => z.t < 0.6);
    for (let i = 0; i < this.oompas.length; i++) for (let j = i + 1; j < this.oompas.length; j++) {
      const a = this.oompas[i], b = this.oompas[j];
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < 18 && d > 0) { const push = (18 - d) / 2; const nx = (a.x - b.x) / d, ny = (a.y - b.y) / d; a.x += nx * push; a.y += ny * push; b.x -= nx * push; b.y -= ny * push; }
    }
  }

  onTimeout() { this.win(); }

  onWin() {
    this.outDur = 1.9;
    this.wx = this.x; this.wy = this.y;
    this.parts.burst(this.x, this.y, 30, { colors: [P.lemon1, P.pink2, P.mint2, P.white], speed: [60, 180], g: 160, life: [0.5, 1] });
  }
  onFail() {
    this.outDur = 2.6;
    this.fx = this.x; this.fy = this.y;
    shake(6, 0.4);
  }
  updateOutcome() {
    if (this.result === 'fail') {
      const t = this.outT;
      if (t > 1.2 && t < 1.6 && chance(0.6)) shake(5, 0.1);
      if (t > 1.6 && !this.blasted) {
        this.blasted = true;
        shake(9, 0.4);
        this.parts.burst(W / 2, 30, 40, { colors: [P.choc2, P.choc3, P.choc4, P.caramel], speed: [80, 260], g: 300, life: [0.5, 1.0], size: [2, 4] });
      }
    }
  }

  /* ----------------------------------------------------------- drawing */
  drawRiver(ctx) {
    const at = this.at;
    // flow streaks that follow the current
    for (let i = 0; i < 60; i++) {
      const lane = (i * 37) % (BOT - TOP - 10);
      const y0 = TOP + 5 + lane;
      const sp = 26 + (i % 5) * 6;
      const x = ((i * 89 + at * sp) % (W + 40)) - 20;
      let yy = y0;
      // bend toward the pipe on the right
      if (x > 300) yy = lerp(y0, PY, ((x - 300) / 160) ** 2 * 0.8);
      rect(ctx, x, yy, 6 + (i % 3) * 4, 1, i % 4 ? P.choc3 : P.choc4);
    }
    // waterfall churn on the left
    for (let i = 0; i < 18; i++) {
      const y = TOP + 4 + ((i * 11) % (BOT - TOP - 8));
      const r = 3 + ((i + Math.floor(at * 8)) % 4);
      ellipse(ctx, 10 + ((i * 7) % 26) + Math.sin(at * 6 + i) * 3, y, r + 1, r, i % 3 ? P.caramel2 : P.cream2);
    }
    // swirl around the intake
    for (let i = 0; i < 26; i++) {
      const a = at * (3 + this.pulse * 6) + i * 0.7;
      const rr = PR + 6 + ((i * 9 + at * (30 + this.pulse * 60)) % 60);
      const k = 1 - (rr - PR) / 66;
      const x = PX - Math.cos(a) * rr * 1.1 + 6, y = PY + Math.sin(a) * rr * 0.9;
      rect(ctx, x, y, 3, 1, k > 0.5 ? P.choc4 : P.choc3);
    }
  }

  drawPipe(ctx) {
    const at = this.at;
    const tell = this.pulseState === 'tell';
    // glass pipe body rising from the river (3/4 view)
    for (let y = -4; y < PY - 6; y++) {
      const w = PR * 2 - 4;
      ctx.fillStyle = P.glass; ctx.fillRect(PX - w / 2, y, w, 1);
      const ph = (y + at * (90 + this.pulse * 140)) % 18;
      if (ph < 14) { ctx.fillStyle = ph < 2 ? P.choc4 : P.choc2; ctx.fillRect(PX - w / 2 + 4, y, w - 8, 1); }
      ctx.fillStyle = P.glassEdge; ctx.fillRect(PX - w / 2, y, 2, 1); ctx.fillRect(PX + w / 2 - 2, y, 2, 1);
      if (y % 9 < 5) ctx.fillRect(PX - w / 2 + 5, y, 1, 1);
    }
    // the mouth
    const pr = PR + (this.pulse * 3) + (tell ? Math.sin(at * 40) * 1.5 : 0);
    ellipse(ctx, PX, PY, pr + 4, pr * 0.7 + 3, tell || this.pulse > 0.3 ? P.lemon1 : P.glassEdge);
    ellipse(ctx, PX, PY, pr + 1, pr * 0.7, P.ink);
    ellipse(ctx, PX, PY, pr - 2, pr * 0.7 - 2, P.choc0);
    // swirling interior
    for (let i = 0; i < 8; i++) {
      const a = -at * 8 + i * 0.8;
      const rr = (i / 8) * (pr - 4);
      rect(ctx, PX + Math.cos(a) * rr, PY + Math.sin(a) * rr * 0.7, 2, 1, P.choc3);
    }
    // tell: rings contracting inward
    if (tell || this.pulse > 0.2) {
      const k = (at * 2.5) % 1;
      ringPx(ctx, PX, PY, Math.round(pr + 30 * (1 - k)), P.lemon2);
      ringPx(ctx, PX, PY, Math.round(pr + 30 * (1 - ((k + 0.5) % 1))), P.lemon1);
    }
  }

  drawAug(ctx, x, y, o = {}) {
    const at = this.at;
    const face = o.face ?? this.face;
    // submerged body
    ellipse(ctx, x, y + 14, 24, 10, P.choc1);
    ellipse(ctx, x, y + 12, 21, 8, mix('#e8334a', P.choc3, 0.55));
    for (let i = -18; i < 18; i += 6) rect(ctx, x + i, y + 10, 3, 4, mix('#fff0d8', P.choc4, 0.5));
    // paddling arms
    const s = Math.sin(at * 10);
    limb(ctx, x - 16, y + 8, Math.PI + 0.5 + s * 0.7, 12, 6, P.ink);
    limb(ctx, x + 16, y + 8, -0.5 - s * 0.7, 12, 6, P.ink);
    limb(ctx, x - 16, y + 8, Math.PI + 0.5 + s * 0.7, 12, 4, '#ffcfa8', '#ffcfa8');
    limb(ctx, x + 16, y + 8, -0.5 - s * 0.7, 12, 4, '#ffcfa8', '#ffcfa8');
    // chocolate splashes
    if (Math.abs(s) > 0.95) { rect(ctx, x - 26, y + 4, 3, 2, P.choc4); rect(ctx, x + 24, y + 4, 3, 2, P.choc4); }
    drawHead(ctx, 'augustus', x, y - 6, { open: o.open ?? (0.08 + Math.max(0, Math.sin(at * 7)) * 0.3), scared: o.scared, flip: face < 0, sx: o.sx, sy: o.sy, rot: o.rot, scale: o.scale });
    // waterline ring
    ellipse(ctx, x, y + 21, 22, 2, P.choc3);
  }

  draw(ctx) {
    if (!bg) bg = buildBg();
    ctx.drawImage(bg, 0, 0);
    const at = this.at;
    this.drawRiver(ctx);
    for (const r of this.ripples) {
      const k = r.t / 0.8;
      ctx.globalAlpha = 1 - k;
      ellipse(ctx, r.x, r.y + 14, 14 + k * 16, 3 + k * 3, P.choc4);
      ellipse(ctx, r.x, r.y + 14, 12 + k * 16, 2 + k * 3, P.choc2);
      ctx.globalAlpha = 1;
    }
    // bubbles
    for (const b of this.bubbles) {
      const k = b.t / b.life;
      const rr = 4 + k * 14 + Math.sin(at * 30) * k * 1.5;
      ellipse(ctx, b.x, b.y, rr + 1, rr * 0.8 + 1, P.choc1);
      ellipse(ctx, b.x, b.y, rr, rr * 0.8, P.choc3);
      ellipse(ctx, b.x - rr * 0.3, b.y - rr * 0.3, rr * 0.3, rr * 0.2, P.caramel2);
      if (k > 0.6) ringPx(ctx, b.x, b.y, Math.round(rr + 8 - (k - 0.6) * 10), P.caramel);
    }
    // oars
    for (const o of this.oars) {
      ctx.save();
      ctx.translate(Math.round(o.x), Math.round(o.y));
      ctx.rotate(o.a);
      ctx.fillStyle = P.ink; ctx.fillRect(-31, -3, 50, 6); ctx.fillRect(16, -6, 18, 12);
      ctx.fillStyle = P.wood2; ctx.fillRect(-30, -2, 48, 4); ctx.fillStyle = P.pink1; ctx.fillRect(17, -5, 16, 10);
      ctx.fillStyle = P.pink3; ctx.fillRect(17, -5, 16, 2);
      ctx.restore();
    }

    const fail = this.result === 'fail', won = this.result === 'win';
    if (!fail || this.outT < 0.5) this.drawPipe(ctx);

    // Oompa-Loompas
    for (const o of this.oompas) {
      if (this.t < o.delay && !this.result) {
        // waiting on the bank, ready to dive
        drawOompa(ctx, o.x, o.y + (o.y < 100 ? 6 : 10), at, { pose: 'cheer', phase: o.ph });
        continue;
      }
      if (fail && o === this.caughtBy) continue;
      ellipse(ctx, o.x, o.y + 6, 9, 3, P.choc3);
      drawOompa(ctx, o.x, o.y + 6, o.rest > 0 ? at * 0.3 : at, { pose: 'swim', phase: o.ph, flip: o.vx < 0, mouth: o.rest <= 0 });
      if (o.rest > 0) rect(ctx, o.x + 6, o.y - 14 + ((at * 20) % 4), 2, 2, '#bfe9ff');
    }
    for (const z of this.zaps) drawOompa(ctx, PX, PY - z.t * 260, at * 3, { pose: 'cheer', scale: 0.8 });

    if (won) {
      const k = seg(this.outT, 0, 0.6, ease.inOutQuad);
      const bx = lerp(this.wx, clamp(this.wx, 80, 400), k), by = lerp(this.wy, BOT + 18, k) - Math.sin(k * Math.PI) * 26;
      if (k < 1) this.drawAug(ctx, bx, by, { open: 0.5 });
      else {
        // flopped on the bank, cheering
        const sq = 1 + Math.sin(Math.min(1, (this.outT - 0.6) * 3) * Math.PI * 3) * 0.15 * Math.max(0, 1 - (this.outT - 0.6) * 1.5);
        drawKid(ctx, 'augustus', bx, BOT + 40, { pose: 'cheer', t: at, open: Math.abs(Math.sin(at * 12)), sx: sq, sy: 2 - sq, bodyTint: { color: P.choc3, a: 0.25 } });
        for (let i = 0; i < 3; i++) rect(ctx, bx - 14 + i * 12, BOT + 30 + ((at * 30 + i * 7) % 10), 2, 3, P.choc3);
      }
    } else if (fail) {
      this.drawFate(ctx);
    } else {
      this.drawAug(ctx, this.x, this.y, { scared: this.pulse > 0.5 && dist(this.x, this.y, PX, PY) < 170 });
    }

    // pointer target marker
    const steer = input.down || (input.type === 'mouse' && input.hover);
    if (steer && !this.result) {
      const k = (at * 3) % 1;
      ringPx(ctx, input.x, input.y, 4 + Math.round(k * 4), `rgba(255,240,180,${1 - k})`);
    }
    this.parts.draw(ctx);
  }

  drawFate(ctx) {
    const t = this.outT, at = this.at;
    if (t < 0.5) {
      // dragged into the intake, spinning and shrinking
      const k = seg(t, 0, 0.5, ease.inQuad);
      const x = lerp(this.fx, PX, k), y = lerp(this.fy, PY, k);
      if (this.caughtBy) drawOompa(ctx, x - 14 * (1 - k), y + 4, at, { pose: 'swim', mouth: true });
      this.drawAug(ctx, x, y, { scared: true, open: 0.8, rot: k * 8, scale: 1 - k * 0.6 });
      return;
    }
    // cut to the pipe: side view
    const k = seg(t, 0.5, 0.12);
    ctx.fillStyle = mix(P.lilac3, P.pink3, 0.3);
    ctx.globalAlpha = k;
    ctx.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 24) { ctx.fillStyle = P.lilac2; ctx.fillRect(x, 0, 12, H); }
    ctx.fillStyle = P.choc2; ctx.fillRect(0, 230, W, 40);
    ctx.fillStyle = P.choc3; for (let x = 0; x < W; x += 16) ctx.fillRect((x + at * 40) % W, 236, 8, 1);
    ctx.globalAlpha = 1;
    const cx = W / 2;
    const pw = 30;
    const rise = seg(t, 0.55, 0.45, ease.outQuad);      // up to the stuck point
    const blast = seg(t, 1.55, 0.35, ease.inCubic);     // whoosh!
    const ay = lerp(250, 150, rise) - blast * 320;
    const strain = t > 1.0 && t < 1.55 ? Math.sin(at * 50) * 2 : 0;
    const bulge = t > 0.9 && t < 1.6 ? 1 : 0;
    // pipe glass
    for (let y = 0; y < 232; y++) {
      let w = pw;
      const dy = y - ay;
      if (bulge && Math.abs(dy) < 30) w += Math.cos((dy / 30) * Math.PI / 2) * 22 + strain;
      ctx.fillStyle = P.glass; ctx.fillRect(Math.round(cx - w / 2), y, Math.round(w), 1);
      const ph = (y + at * 200) % 16;
      if (ph < 9 && Math.abs(dy) > 26) { ctx.fillStyle = P.choc2; ctx.fillRect(Math.round(cx - w / 2 + 3), y, Math.round(w - 6), 1); }
      ctx.fillStyle = P.glassEdge; ctx.fillRect(Math.round(cx - w / 2), y, 2, 1); ctx.fillRect(Math.round(cx + w / 2 - 2), y, 2, 1);
    }
    // squashed Augustus inside
    if (ay > -60) {
      drawKid(ctx, 'augustus', cx + strain, ay + 30, { pose: 'scared', t: at, scared: true, open: 0.5 + Math.abs(Math.sin(at * 20)) * 0.5, sx: 0.62, sy: 1.25 + blast * 0.4, bodyTint: { color: P.choc2, a: 0.35 } });
    }
    if (t > 1.0 && t < 1.55) {
      for (let i = 0; i < 3; i++) sparkle(ctx, cx + (i - 1) * 28, ay - 10 + i * 6, 2 + (Math.floor(at * 20 + i) % 3), P.white);
      text(ctx, '!', cx + 40, ay - 20, { size: 16, color: P.red1, outline: P.ink, ow: 2 });
    }
  }
}
