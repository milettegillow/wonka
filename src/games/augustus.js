// AUGUSTUS (boss) — the chocolate river, seen from above. Augustus swims
// toward the pointer; the current drags him toward the wandering glass pipes.
// Survive until the timer runs out and he flops onto the bank.
import { P, mix } from '../palette.js';
import { W, H, rect, ellipse, circle, ringPx, seg, ease, lerp, rand, chance, clamp, shake, flash, sparkle, input, dist, limb, text } from '../engine.js';
import { drawKid, drawOompa } from '../kids.js';
import { drawHead } from '../faces.js';
import { MicroGame } from './base.js';
import { sfx } from '../audio.js';

const TOP = 40, BOT = 226;           // river banks
const PR = 22;                        // pipe intake radius
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
  static meta = { kid: 'augustus', room: 'Chocolate River', command: 'Swim!', line: 'Drag to swim, dodge the pipes', input: 'drag', boss: true };

  init(d) {
    super.init(d);
    const L = this.level;
    this.duration = this.lv([14, 15, 16, 17, 18]);
    this.cur = this.lv([10, 14, 18, 22, 26]);
    this.suck = this.lv([32, 42, 50, 60, 70]);
    this.pipeSpd = this.lv([8, 14, 20, 28, 36]);
    this.relocGap = this.lv([0, 0, 6, 4.6, 3.6]);
    this.warnDur = this.lv([2, 2, 1.8, 1.6, 1.4]);
    this.maxSpd = 80;
    this.acc = 260;
    this.x = 150; this.y = 132; this.vx = 0; this.vy = 0;
    this.face = 1;
    this.pulse = 0;
    this.pulseState = 'idle';
    this.pulseT = 0;
    this.pulseGap = [this.lv([5, 4, 3.2, 2.6, 2.2]), this.lv([6.5, 5.4, 4.4, 3.8, 3.4])];
    this.pulseNext = rand(this.pulseGap[0], this.pulseGap[1]);
    this.tell = this.lv([0.9, 0.8, 0.65, 0.55, 0.45]);
    // glass pipes that wander the river
    const n = this.lv([1, 1, 2, 2, 3]);
    const starts = [[420, 132], [330, 64 + 6], [360, 200]];
    this.pipes = [];
    for (let i = 0; i < n; i++) this.pipes.push(this.newPipe(starts[i][0], starts[i][1], 'active'));
    this.relocT = this.relocGap;
    this.bubbles = [];
    this.bubbleT = 1.5;
    this.bubbleGap = this.lv([2.6, 2.2, 1.8, 1.4, 1.1]);
    this.oars = [];
    this.oarT = 3;
    this.oarGap = this.lv([6.5, 5.5, 4.5, 4, 3.5]);
    this.oompas = [];
    const no = this.lv([0, 0, 1, 2, 2]);
    for (let i = 0; i < no; i++) {
      const o = { spd: this.lv([0, 0, 40, 46, 52]) + i * 2, ph: rand(0, 6) };
      this.placeOompa(o, 1.5 + i * 2, i);
      this.oompas.push(o);
    }
    this.ripples = [];
    this.caughtBy = null;
    this.zaps = [];
    this.hitCool = 0;
    this.splashT = 0;
  }

  newPipe(x, y, state = 'warn') {
    return { x, y, tx: x, ty: y, state, t: 0, r: PR, wander: 0, pull: state === 'active' ? 1 : 0 };
  }
  // a safe-ish spot for a pipe: on the water, away from Augustus and other pipes
  pipeSpot() {
    let best = null, bd = -1;
    for (let i = 0; i < 20; i++) {
      const x = rand(110, W - 34), y = rand(TOP + 30, BOT - 30);
      let d = dist(x, y, this.x, this.y);
      for (const p of this.pipes) d = Math.min(d, dist(x, y, p.x, p.y) * 1.3);
      if (d > bd) { bd = d; best = [x, y]; }
      if (d > 170) break;
    }
    return best;
  }
  activePipes() { return this.pipes.filter((p) => p.state === 'active'); }

  placeOompa(o, delay, i = Math.floor(rand(0, 4))) {
    const top = i % 2 === 0;
    Object.assign(o, { x: rand(70, 320), y: top ? TOP - 10 : BOT + 10, vx: 0, vy: 0, delay: this.t + delay, inWater: false, chase: rand(2.2, 3), rest: 0 });
  }

  flowAt(x, y) {
    // base current + pull toward every live pipe + churn off the waterfall
    let fx = this.cur, fy = 0;
    for (const p of this.pipes) {
      if (p.pull <= 0) continue;
      const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
      const s = (p.pull * this.suck * (1 + this.pulse * 1.3)) / (1 + (d / 110) ** 2);
      fx += (dx / d) * s; fy += (dy / d) * s;
      fx += (-dy / d) * s * 0.25; fy += (dx / d) * s * 0.25;
    }
    if (x < 70) fx += (70 - x) * 1.4;
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
    else if (this.pulseState === 'tell' && this.pulseT >= this.tell) { this.pulseState = 'pulse'; this.pulseT = 0; shake(3, 0.3); sfx('suck'); }
    else if (this.pulseState === 'pulse' && this.pulseT >= 1.0) { this.pulseState = 'idle'; this.pulseT = 0; this.pulseNext = rand(this.pulseGap[0], this.pulseGap[1]); }
    this.pulse = lerp(this.pulse, this.pulseState === 'pulse' ? 1 : 0, Math.min(1, dt * 6));
    if (this.pulseState === 'pulse' && chance(0.3)) shake(1.5, 0.1);

    // pipes wander, lift away and drop in elsewhere (always warned first)
    for (const p of this.pipes) {
      p.t += dt;
      if (p.state === 'warn') {
        if (p.t >= this.warnDur) {
          p.state = 'active'; p.t = 0;
          shake(4, 0.25); sfx('splash');
          this.parts.burst(p.x, p.y, 20, { colors: [P.choc4, P.caramel2, P.cream], speed: [50, 150], life: [0.3, 0.6], size: [2, 3] });
        } else if (Math.floor(p.t * 3) !== Math.floor((p.t - dt) * 3)) sfx('warn');
        continue;
      }
      if (p.state === 'lift') { p.pull = Math.max(0, p.pull - dt * 3); continue; }
      p.pull = Math.min(1, p.pull + dt * 2);
      p.wander -= dt;
      if (p.wander <= 0 || dist(p.x, p.y, p.tx, p.ty) < 4) {
        p.wander = rand(2, 4);
        // drift somewhere nearby, but never straight onto Augustus
        for (let i = 0; i < 8; i++) {
          const tx = clamp(p.x + rand(-120, 120), 110, W - 30), ty = clamp(p.y + rand(-70, 70), TOP + 26, BOT - 26);
          if (dist(tx, ty, this.x, this.y) > 90) { p.tx = tx; p.ty = ty; break; }
        }
      }
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy) || 1;
      const sp = Math.min(this.pipeSpd, d * 2);
      p.x += (dx / d) * sp * dt; p.y += (dy / d) * sp * dt;
    }
    // keep pipes from bunching up on top of each other
    for (let i = 0; i < this.pipes.length; i++) for (let j = i + 1; j < this.pipes.length; j++) {
      const a = this.pipes[i], b = this.pipes[j];
      if (a.state !== 'active' || b.state !== 'active') continue;
      const d = dist(a.x, a.y, b.x, b.y), min = PR * 2 + 40;
      if (d < min && d > 0) {
        const push = ((min - d) / 2) * Math.min(1, dt * 4), nx = (a.x - b.x) / d, ny = (a.y - b.y) / d;
        a.x += nx * push; a.y += ny * push; b.x -= nx * push; b.y -= ny * push;
        a.tx = a.x + nx * 40; a.ty = a.y + ny * 40; b.tx = b.x - nx * 40; b.ty = b.y - ny * 40;
      }
      a.y = clamp(a.y, TOP + 22, BOT - 22); b.y = clamp(b.y, TOP + 22, BOT - 22);
      a.x = clamp(a.x, 100, W - 26); b.x = clamp(b.x, 100, W - 26);
    }
    this.pipes = this.pipes.filter((p) => !(p.state === 'lift' && p.t > 0.8));
    if (this.relocGap > 0) {
      this.relocT -= dt;
      if (this.relocT <= 0 && this.t < this.duration - this.warnDur - 0.5) {
        this.relocT = this.relocGap * rand(0.85, 1.15);
        const act = this.activePipes();
        if (act.length) {
          const old = act[Math.floor(rand(0, act.length))];
          old.state = 'lift'; old.t = 0;
          sfx('whoosh');
          const [nx, ny] = this.pipeSpot();
          this.pipes.push(this.newPipe(nx, ny, 'warn'));
        }
      }
    }

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
    const drag = Math.max(0, 1 - dt * 1.6);
    this.vx *= drag; this.vy *= drag;
    const sp = Math.hypot(this.vx, this.vy);
    if (sp > this.maxSpd) { this.vx *= this.maxSpd / sp; this.vy *= this.maxSpd / sp; }
    const [fx, fy] = this.flowAt(this.x, this.y);
    this.x += (this.vx + fx) * dt;
    this.y += (this.vy + fy) * dt;
    if (Math.abs(this.vx) > 8) this.face = this.vx > 0 ? 1 : -1;
    if (this.y < TOP + AR) { this.y = TOP + AR; this.vy = Math.abs(this.vy) * 0.4; }
    if (this.y > BOT - AR) { this.y = BOT - AR; this.vy = -Math.abs(this.vy) * 0.4; }
    if (this.x < AR + 4) { this.x = AR + 4; this.vx = Math.abs(this.vx); }
    if (this.x > W - AR - 4) { this.x = W - AR - 4; this.vx = -Math.abs(this.vx); }

    // splashy paddling
    this.splashT -= dt;
    if (steer && sp > 30 && this.splashT <= 0) { this.splashT = 0.45; sfx('splash'); }
    if (this.at % 0.15 < dt) this.ripples.push({ x: this.x, y: this.y + 6, t: 0 });
    for (const r of this.ripples) { r.t += dt; r.x += this.cur * dt; }
    this.ripples = this.ripples.filter((r) => r.t < 0.8);

    // the pipes
    for (const p of this.pipes) {
      if (p.state === 'active' && dist(this.x, this.y, p.x, p.y) < p.r + AR - 6) { this.failPipe = p; this.fail(); return; }
    }

    // chocolate bubbles: swell (tell) then pop, shoving him
    this.bubbleT -= dt;
    if (this.bubbleT <= 0) {
      this.bubbleT = this.bubbleGap * rand(0.7, 1.3);
      const bx = clamp(this.x + rand(-80, 60), 60, 400), by = clamp(this.y + rand(-50, 50), TOP + 16, BOT - 16);
      this.bubbles.push({ x: bx, y: by, t: 0, life: 1.2 });
    }
    for (const b of this.bubbles) {
      b.t += dt;
      b.x += this.cur * 0.5 * dt;
      if (b.t >= b.life && !b.popped) {
        b.popped = true;
        sfx('bubble');
        const d = dist(b.x, b.y, this.x, this.y);
        if (d < 56) {
          const k = (1 - d / 56) * 150;
          this.vx += ((this.x - b.x) / (d || 1)) * k; this.vy += ((this.y - b.y) / (d || 1)) * k;
          shake(4, 0.2);
        }
        this.parts.burst(b.x, b.y, 14, { colors: [P.choc3, P.choc4, P.caramel], speed: [50, 140], drag: 4, life: [0.3, 0.5], size: [2, 3] });
      }
    }
    this.bubbles = this.bubbles.filter((b) => !b.popped);

    // drifting oars
    this.oarT -= dt;
    if (this.oarT <= 0) {
      this.oarT = this.oarGap * rand(0.8, 1.2);
      this.oars.push({ x: -40, y: rand(TOP + 30, BOT - 30), a: rand(0, Math.PI), va: rand(-1.2, 1.2), vx: this.cur + rand(10, 30) + 4 * this.level });
    }
    for (const o of this.oars) {
      o.x += o.vx * dt; o.a += o.va * dt;
      const hx = Math.cos(o.a) * 30, hy = Math.sin(o.a) * 30;
      const ax = o.x - hx, ay = o.y - hy, bx = o.x + hx, by = o.y + hy;
      const abx = bx - ax, aby = by - ay;
      const k = clamp(((this.x - ax) * abx + (this.y - ay) * aby) / (abx * abx + aby * aby), 0, 1);
      const cx = ax + abx * k, cy = ay + aby * k;
      const d = dist(cx, cy, this.x, this.y);
      if (d < AR + 4 && this.hitCool <= 0) {
        this.hitCool = 0.4;
        const nx = (this.x - cx) / (d || 1), ny = (this.y - cy) / (d || 1);
        this.vx += nx * 130 + o.vx * 0.6; this.vy += ny * 130;
        o.va *= -1.5;
        shake(5, 0.25); flash(P.cream, 0.08); sfx('oar');
        this.parts.burst(cx, cy, 8, { colors: [P.wood2, P.caramel2, P.white], speed: [40, 100], life: [0.2, 0.4] });
      }
    }
    this.oars = this.oars.filter((o) => o.x < W + 60);

    // Oompa-Loompas give chase (they tire, and the current drags them too)
    for (const o of this.oompas) {
      if (t < o.delay) continue;
      if (!o.inWater) { o.inWater = true; sfx('splash'); this.parts.burst(o.x, o.y, 10, { colors: [P.choc4, P.caramel2], speed: [30, 80], life: [0.3, 0.5] }); }
      if (o.rest > 0) {
        o.rest -= dt;
        o.vx *= Math.max(0, 1 - dt * 3); o.vy *= Math.max(0, 1 - dt * 3);
        if (o.rest <= 0) o.chase = rand(2.2, 3.2);
      } else {
        o.chase -= dt;
        if (o.chase <= 0) o.rest = rand(0.8, 1.2);
        const dx = this.x - o.x, dy = this.y - o.y, d = Math.hypot(dx, dy) || 1;
        o.vx = lerp(o.vx, (dx / d) * o.spd, Math.min(1, dt * 1.1));
        o.vy = lerp(o.vy, (dy / d) * o.spd, Math.min(1, dt * 1.1));
      }
      const [ofx, ofy] = this.flowAt(o.x, o.y);
      o.x += (o.vx + ofx * 0.55) * dt; o.y += (o.vy + ofy * 0.55) * dt;
      o.y = clamp(o.y, TOP + 8, BOT - 8);
      o.x = clamp(o.x, 20, W - 12);
      const sucked = this.activePipes().find((p) => dist(o.x, o.y, p.x, p.y) < p.r + 2);
      if (sucked) {
        this.parts.burst(sucked.x, sucked.y, 18, { colors: [P.choc4, P.caramel2, P.white], speed: [40, 140], life: [0.3, 0.6] });
        this.zaps.push({ t: 0, x: sucked.x, y: sucked.y });
        shake(3, 0.2); sfx('whoosh');
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
    this.outDur = 2.1;
    this.wx = this.x; this.wy = this.y;
    sfx('splash'); setTimeout(() => sfx('cheer'), 600);
    this.parts.burst(this.x, this.y, 30, { colors: [P.pink2, P.mint2, P.lilac2, P.white], speed: [60, 180], g: 160, life: [0.5, 1] });
  }
  onFail() {
    this.outDur = 2.6;
    this.fx = this.x; this.fy = this.y;
    // which intake swallows him
    let p = this.failPipe;
    if (!p) {
      const act = this.activePipes();
      p = act.reduce((a, b) => (dist(b.x, b.y, this.x, this.y) < dist(a.x, a.y, this.x, this.y) ? b : a), act[0] || { x: W - 40, y: 132 });
    }
    this.failAt = { x: p.x, y: p.y };
    shake(6, 0.4);
    sfx('suck');
    setTimeout(() => sfx('strain'), 900);
    setTimeout(() => sfx('whoosh'), 1500);
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
    for (let i = 0; i < 60; i++) {
      const lane = (i * 37) % (BOT - TOP - 10);
      const y0 = TOP + 5 + lane;
      const sp = 18 + (i % 5) * 5 + this.cur * 0.4;
      const x = ((i * 89 + at * sp) % (W + 40)) - 20;
      rect(ctx, x, y0, 6 + (i % 3) * 4, 1, i % 4 ? P.choc3 : P.choc4);
    }
    for (let i = 0; i < 18; i++) {
      const y = TOP + 4 + ((i * 11) % (BOT - TOP - 8));
      const r = 3 + ((i + Math.floor(at * 8)) % 4);
      ellipse(ctx, 10 + ((i * 7) % 26) + Math.sin(at * 6 + i) * 3, y, r + 1, r, i % 3 ? P.caramel2 : P.cream2);
    }
  }

  drawPipe(ctx, p) {
    const at = this.at;
    const tell = this.pulseState === 'tell';
    if (p.state === 'warn') {
      // warning: a growing shadow, contracting rings and a ghost pipe lowering
      const k = Math.min(1, p.t / this.warnDur);
      const blink = Math.floor(p.t * 6) % 2 === 0;
      ctx.globalAlpha = 0.35 + 0.35 * k;
      ellipse(ctx, p.x, p.y, (p.r + 4) * (0.4 + 0.6 * k), (p.r * 0.7 + 3) * (0.4 + 0.6 * k), P.choc0);
      ctx.globalAlpha = 1;
      ringPx(ctx, p.x, p.y, Math.round(p.r + 26 * (1 - k)), blink ? P.red2 : P.pink3);
      ringPx(ctx, p.x, p.y, Math.round(p.r + 2), P.pink2);
      // ghost tube coming down
      const bottom = lerp(-20, p.y - 8, ease.inQuad(k));
      ctx.globalAlpha = 0.35 + k * 0.35;
      for (let y = -4; y < bottom; y++) { ctx.fillStyle = P.glass; ctx.fillRect(Math.round(p.x - p.r + 2), y, p.r * 2 - 4, 1); }
      ctx.globalAlpha = 1;
      text(ctx, '!', p.x, p.y - p.r - 10 - (blink ? 1 : 0), { size: 16, color: P.red1, outline: P.white, ow: 1 });
      return;
    }
    const lift = p.state === 'lift' ? ease.inQuad(Math.min(1, p.t / 0.8)) : 0;
    const bottom = p.y - 6 - lift * (p.y + 30);
    const w = p.r * 2 - 4;
    for (let y = -4; y < bottom; y++) {
      const x0 = Math.round(p.x - w / 2);
      ctx.fillStyle = P.glass; ctx.fillRect(x0, y, w, 1);
      // chocolate rushing up the middle, with lighter streaks
      ctx.fillStyle = P.choc2; ctx.fillRect(x0 + 5, y, w - 10, 1);
      const ph = (y + at * (90 + this.pulse * 140)) % 14;
      if (ph < 3) { ctx.fillStyle = P.choc4; ctx.fillRect(x0 + 7 + (ph | 0), y, 4, 1); }
      ctx.fillStyle = P.glassEdge; ctx.fillRect(x0, y, 2, 1); ctx.fillRect(x0 + w - 2, y, 2, 1);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x0 + 3, y, 1, 1);
    }
    if (lift > 0) { ringPx(ctx, p.x, p.y, Math.round(p.r * (1 + lift)), P.choc4); return; }
    // the mouth
    const pr = p.r + this.pulse * 3 + (tell ? Math.sin(at * 40) * 1.5 : 0);
    ellipse(ctx, p.x, p.y, pr + 4, pr * 0.7 + 3, tell || this.pulse > 0.3 ? P.pink2 : P.glassEdge);
    ellipse(ctx, p.x, p.y, pr + 1, pr * 0.7, P.ink);
    ellipse(ctx, p.x, p.y, pr - 2, pr * 0.7 - 2, P.choc0);
    for (let i = 0; i < 8; i++) {
      const a = -at * 8 + i * 0.8;
      const rr = (i / 8) * (pr - 4);
      rect(ctx, p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.7, 2, 1, P.choc3);
    }
    // swirl streaks around the intake
    for (let i = 0; i < 12; i++) {
      const a = at * (3 + this.pulse * 6) + i * 0.52;
      const rr = pr + 6 + ((i * 9 + at * (30 + this.pulse * 60)) % 40);
      rect(ctx, p.x - Math.cos(a) * rr, p.y + Math.sin(a) * rr * 0.75, 3, 1, P.choc4);
    }
    if (tell || this.pulse > 0.2) {
      const k = (at * 2.5) % 1;
      ringPx(ctx, p.x, p.y, Math.round(pr + 30 * (1 - k)), P.pink3);
      ringPx(ctx, p.x, p.y, Math.round(pr + 30 * (1 - ((k + 0.5) % 1))), P.pink2);
    }
  }

  drawAug(ctx, x, y, o = {}) {
    const at = this.at;
    const face = o.face ?? this.face;
    ellipse(ctx, x, y + 14, 26, 11, P.choc1);
    ellipse(ctx, x, y + 12, 23, 9, mix(P.red2, P.choc3, 0.55));
    for (let i = -20; i < 20; i += 6) rect(ctx, x + i, y + 10, 3, 4, mix(P.cream, P.choc4, 0.5));
    const s = Math.sin(at * 10);
    const skin = '#ffcfae';
    limb(ctx, x - 18, y + 8, Math.PI + 0.5 + s * 0.7, 12, 6, P.ink);
    limb(ctx, x + 18, y + 8, -0.5 - s * 0.7, 12, 6, P.ink);
    limb(ctx, x - 18, y + 8, Math.PI + 0.5 + s * 0.7, 12, 4, skin, skin);
    limb(ctx, x + 18, y + 8, -0.5 - s * 0.7, 12, 4, skin, skin);
    if (Math.abs(s) > 0.95) { rect(ctx, x - 28, y + 4, 3, 2, P.choc4); rect(ctx, x + 26, y + 4, 3, 2, P.choc4); }
    drawHead(ctx, 'augustus', x, y - 6, { open: o.open ?? (0.08 + Math.max(0, Math.sin(at * 7)) * 0.3), scared: o.scared, flip: face < 0, sx: o.sx, sy: o.sy, rot: o.rot, scale: o.scale });
    ellipse(ctx, x, y + 22, 24, 2, P.choc3);
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
    for (const b of this.bubbles) {
      const k = b.t / b.life;
      const rr = 4 + k * 14 + Math.sin(at * 30) * k * 1.5;
      ellipse(ctx, b.x, b.y, rr + 1, rr * 0.8 + 1, P.choc1);
      ellipse(ctx, b.x, b.y, rr, rr * 0.8, P.choc3);
      ellipse(ctx, b.x - rr * 0.3, b.y - rr * 0.3, rr * 0.3, rr * 0.2, P.caramel2);
      if (k > 0.6) ringPx(ctx, b.x, b.y, Math.round(rr + 8 - (k - 0.6) * 10), P.caramel);
    }
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
    if (!fail || this.outT < 0.5) for (const p of this.pipes) this.drawPipe(ctx, p);

    for (const o of this.oompas) {
      if (this.t < o.delay && !this.result) {
        drawOompa(ctx, o.x, o.y + (o.y < 100 ? 6 : 10), at, { pose: 'cheer', phase: o.ph });
        continue;
      }
      if (fail && o === this.caughtBy) continue;
      ellipse(ctx, o.x, o.y + 6, 9, 3, P.choc3);
      drawOompa(ctx, o.x, o.y + 6, o.rest > 0 ? at * 0.3 : at, { pose: 'swim', phase: o.ph, flip: o.vx < 0, mouth: o.rest <= 0 });
      if (o.rest > 0) rect(ctx, o.x + 6, o.y - 14 + ((at * 20) % 4), 2, 2, P.tear);
    }
    for (const z of this.zaps) drawOompa(ctx, z.x, z.y - z.t * 260, at * 3, { pose: 'cheer', scale: 0.8 });

    if (won) {
      const k = seg(this.outT, 0, 0.6, ease.inOutQuad);
      const bx = lerp(this.wx, clamp(this.wx, 80, 400), k), by = lerp(this.wy, BOT + 18, k) - Math.sin(k * Math.PI) * 26;
      if (k < 1) this.drawAug(ctx, bx, by, { open: 0.5 });
      else {
        const sq = 1 + Math.sin(Math.min(1, (this.outT - 0.6) * 3) * Math.PI * 3) * 0.15 * Math.max(0, 1 - (this.outT - 0.6) * 1.5);
        drawKid(ctx, 'augustus', bx, BOT + 40, { pose: 'cheer', t: at, open: Math.abs(Math.sin(at * 12)), sx: sq, sy: 2 - sq, bodyTint: { color: P.choc3, a: 0.25 } });
        for (let i = 0; i < 3; i++) rect(ctx, bx - 14 + i * 12, BOT + 30 + ((at * 30 + i * 7) % 10), 2, 3, P.choc3);
      }
    } else if (fail) {
      this.drawFate(ctx);
    } else {
      const near = this.activePipes().some((p) => dist(this.x, this.y, p.x, p.y) < 120);
      this.drawAug(ctx, this.x, this.y, { scared: near && this.pulse > 0.3 });
    }

    const steer = input.down || (input.type === 'mouse' && input.hover);
    if (steer && !this.result) {
      const k = (at * 3) % 1;
      ringPx(ctx, input.x, input.y, 4 + Math.round(k * 4), `rgba(255,230,240,${1 - k})`);
    }
    this.parts.draw(ctx);
  }

  drawFate(ctx) {
    const t = this.outT, at = this.at;
    const FA = this.failAt || { x: W - 40, y: 132 };
    if (t < 0.5) {
      const k = seg(t, 0, 0.5, ease.inQuad);
      const x = lerp(this.fx, FA.x, k), y = lerp(this.fy, FA.y, k);
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
    const rise = seg(t, 0.55, 0.45, ease.outQuad);
    const blast = seg(t, 1.55, 0.35, ease.inCubic);
    const ay = lerp(250, 150, rise) - blast * 320;
    const strain = t > 1.0 && t < 1.55 ? Math.sin(at * 50) * 2 : 0;
    const bulge = t > 0.9 && t < 1.6 ? 1 : 0;
    for (let y = 0; y < 232; y++) {
      let w = pw;
      const dy = y - ay;
      if (bulge && Math.abs(dy) < 30) w += Math.cos((dy / 30) * Math.PI / 2) * 22 + strain;
      ctx.fillStyle = P.glass; ctx.fillRect(Math.round(cx - w / 2), y, Math.round(w), 1);
      const ph = (y + at * 200) % 16;
      if (ph < 9 && Math.abs(dy) > 26) { ctx.fillStyle = P.choc2; ctx.fillRect(Math.round(cx - w / 2 + 3), y, Math.round(w - 6), 1); }
      ctx.fillStyle = P.glassEdge; ctx.fillRect(Math.round(cx - w / 2), y, 2, 1); ctx.fillRect(Math.round(cx + w / 2 - 2), y, 2, 1);
    }
    if (ay > -60) {
      drawKid(ctx, 'augustus', cx + strain, ay + 30, { pose: 'scared', t: at, scared: true, open: 0.5 + Math.abs(Math.sin(at * 20)) * 0.5, sx: 0.55, sy: 1.25 + blast * 0.4, bodyTint: { color: P.choc2, a: 0.35 } });
    }
    if (t > 1.0 && t < 1.55) {
      for (let i = 0; i < 3; i++) sparkle(ctx, cx + (i - 1) * 28, ay - 10 + i * 6, 2 + (Math.floor(at * 20 + i) % 3), P.white);
      text(ctx, '!', cx + 40, ay - 20, { size: 16, color: P.red1, outline: P.ink, ow: 2 });
    }
  }
}
