// VIOLET — the Inventing Room. Gum notes slide out of the Great Gum Machine
// toward Violet's mouth. Tap to chomp the gum; leave the blueberries alone.
import { P, CANDY } from '../palette.js';
import { W, H, rect, ellipse, circle, ringPx, seg, ease, lerp, chance, shake, flash, text } from '../engine.js';
import { drawKid, drawOompa } from '../kids.js';
import { drawHead } from '../faces.js';
import { MicroGame } from './base.js';

const VX = 70, FEET = 236;
const HX = 110, HY = 201; // hit zone (at Violet's mouth)
const SPAWN_X = 418;

let bg = null;
function buildBg() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const e = (cx, cy, rx, ry, col) => {
    g.fillStyle = col;
    for (let dy = -ry; dy <= ry; dy++) {
      const k = 1 - (dy / (ry + 0.5)) ** 2; if (k <= 0) continue;
      const hw = Math.round(rx * Math.sqrt(k)); g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  };
  // riveted lilac walls
  r(0, 0, W, H, P.lilac3);
  for (let x = 0; x < W; x += 60) { r(x, 0, 2, 220, P.lilac2); for (let y = 8; y < 220; y += 20) r(x + 4, y, 2, 2, P.lilac2); }
  r(0, 90, W, 2, P.lilac2);
  // ceiling pipes
  r(0, 10, W, 8, P.mint1); r(0, 10, W, 2, P.mint3); r(0, 18, W, 1, P.mint0);
  r(0, 24, W, 5, P.pink2); r(0, 24, W, 1, P.pink4);
  for (let x = 30; x < W; x += 90) { r(x, 8, 6, 12, P.grey1); r(x, 22, 6, 8, P.grey1); }
  // bubbling pots on a long bench
  r(150, 150, 200, 6, P.grey0); r(150, 150, 200, 2, P.grey2);
  r(160, 156, 4, 64, P.grey0); r(336, 156, 4, 64, P.grey0);
  const pots = [[180, P.pink1], [228, P.lemon1], [276, P.mint1], [318, P.lilac1]];
  for (const [x, col] of pots) {
    e(x, 136, 16, 14, P.ink); e(x, 136, 15, 13, P.grey2); e(x - 3, 132, 9, 8, P.grey3);
    r(x - 17, 122, 34, 5, P.ink); r(x - 16, 123, 32, 3, P.grey1);
    e(x, 122, 14, 3, col);
    r(x - 4, 148, 8, 3, P.orange); r(x - 2, 147, 4, 1, P.lemon1);
  }
  // big boiler on the left back wall
  r(68, 48, 54, 100, P.ink); r(70, 50, 50, 96, P.pink2); r(70, 50, 8, 96, P.pink3);
  for (let y = 60; y < 140; y += 18) r(70, y, 50, 2, P.pink1);
  e(95, 80, 9, 9, P.ink); e(95, 80, 8, 8, P.cream); r(95, 74, 1, 6, P.red1);
  // floor
  for (let x = 0; x < W; x += 16) for (let y = 220; y < H; y += 8) r(x, y, 16, 8, ((x / 16 + Math.floor(y / 8)) % 2) ? P.mint2 : P.cream);
  r(0, 218, W, 2, P.ink);
  // the Great Gum Machine
  r(398, 60, 80, 160, P.ink);
  r(400, 62, 76, 156, P.grey2);
  r(400, 62, 76, 6, P.grey3);
  r(406, 76, 64, 36, P.ink); r(408, 78, 60, 32, '#9fd9ff');
  for (let i = 0; i < 5; i++) r(412 + i * 11, 90 + (i % 2) * 4, 7, 7, CANDY[i]);
  for (let i = 0; i < 4; i++) { e(414 + i * 16, 126, 5, 5, P.ink); e(414 + i * 16, 126, 4, 4, P.cream); }
  r(404, 140, 70, 4, P.grey1);
  // chute
  r(390, HY - 13, 30, 26, P.ink); r(392, HY - 11, 28, 22, P.grey0);
  r(392, HY - 11, 28, 3, P.grey1);
  // track
  r(HX - 4, HY + 9, SPAWN_X - HX + 10, 3, P.grey1); r(HX - 4, HY + 12, SPAWN_X - HX + 10, 1, P.grey0);
  for (let x = HX; x < SPAWN_X; x += 24) r(x, HY + 13, 3, 220 - HY - 13, P.grey1);
  return c;
}

function drawNote(ctx, n, x, y, at) {
  if (n.type === 'chomp') {
    circle(ctx, x, y, 8, P.ink);
    circle(ctx, x, y, 7, P.pink1);
    circle(ctx, x - 1, y - 1, 5, P.pink2);
    rect(ctx, x - 4, y - 4, 3, 2, P.white);
    // gum wrapper twist ends
    rect(ctx, x - 12, y - 2, 4, 4, P.pink3); rect(ctx, x + 8, y - 2, 4, 4, P.pink3);
  } else {
    circle(ctx, x, y, 8, P.ink);
    circle(ctx, x, y, 7, P.berry1);
    circle(ctx, x - 1, y - 1, 5, P.berry2);
    rect(ctx, x - 4, y - 4, 2, 2, P.blue3);
    // crown
    rect(ctx, x - 2, y - 8, 5, 2, P.berry0); rect(ctx, x - 1, y - 9, 1, 1, P.berry0); rect(ctx, x + 1, y - 9, 1, 1, P.berry0);
    // leaf
    rect(ctx, x + 2, y - 11, 5, 2, P.grass1); rect(ctx, x + 4, y - 12, 3, 1, P.grass2);
  }
}

export class VioletGame extends MicroGame {
  static meta = { kid: 'violet', room: 'Inventing Room', command: 'Chew!' };

  init(d) {
    super.init(d);
    const L = this.loop;
    const bpm = Math.min(160, 100 + 16 * (L - 1));
    this.beat = 60 / bpm;
    this.travel = Math.max(1.1, 1.6 - 0.15 * (L - 1));
    const nNotes = Math.min(15, 7 + L + (L > 2 ? 1 : 0));
    const blueFrac = Math.min(0.42, 0.22 + 0.06 * (L - 1));
    const nBlue = Math.max(3, Math.round(nNotes * blueFrac));
    this.perfectW = 0.06;
    this.goodW = 0.14;
    // choose which notes are blueberries (never the first two, no triples)
    const types = Array(nNotes).fill('chomp');
    let placed = 0, guard = 0;
    while (placed < nBlue && guard++ < 500) {
      const i = 2 + Math.floor(Math.random() * (nNotes - 2));
      if (types[i] === 'blue') continue;
      if (L <= 1 && (types[i - 1] === 'blue' || types[i + 1] === 'blue')) continue;
      if (types[i - 1] === 'blue' && types[i - 2] === 'blue') continue;
      types[i] = 'blue'; placed++;
    }
    this.notes = [];
    let tt = this.travel + 0.35;
    for (let i = 0; i < nNotes; i++) {
      this.notes.push({ type: types[i], hit: tt, state: 'live', x: SPAWN_X, y: HY, vy: 0, fx: 0 });
      tt += this.beat;
      if (i > 1 && i < nNotes - 1 && chance(0.18)) tt += this.beat; // a rest
    }
    this.lastHit = this.notes[this.notes.length - 1].hit;
    this.duration = this.lastHit + this.goodW + 0.35;
    this.blues = 0;
    this.misses = 0;
    this.chompT = 9;
    this.swell = 0;
    this.pulse = 0;
    this.popups = [];
  }

  noteX(n) {
    const k = (n.hit - this.t) / this.travel; // 1 at spawn, 0 at hit zone
    return HX + k * (SPAWN_X - HX);
  }

  update(dt) {
    this.tick(dt);
    this.chompT += dt;
    this.swell = lerp(this.swell, this.blues, Math.min(1, dt * 10));
    for (const p of this.popups) p.t += dt;
    this.popups = this.popups.filter((p) => p.t < 0.6);
    if (this.result) {
      if (this.result === 'fail' && this.outT < 0.6 && Math.random() < 0.3) shake(3, 0.1);
      return;
    }
    for (const n of this.notes) {
      if (n.state === 'live') {
        n.x = this.noteX(n);
        if (this.t - n.hit > this.goodW) {
          n.state = 'passed';
          n.vx = -140;
          if (n.type === 'chomp') {
            this.misses++;
            this.parts.burst(HX, HY, 8, { colors: [P.grey2, P.grey3, P.white], speed: [20, 60], shape: 'puff', size: [2, 4], life: [0.3, 0.5] });
            this.popups.push({ s: 'Miss', x: HX + 10, y: HY - 26, t: 0, c: P.grey1 });
            shake(2, 0.12);
            if (this.misses >= 3) this.fail();
          }
        }
      } else if (n.state === 'passed') {
        n.x += n.vx * dt; n.vy += 500 * dt; n.y += n.vy * dt;
      }
    }
    if (!this.result && this.notes.every((n) => n.state !== 'live')) this.win();
  }

  onDown() {
    if (this.result) return;
    this.chompT = 0;
    let best = null, bd = 1e9;
    for (const n of this.notes) {
      if (n.state !== 'live') continue;
      const d = Math.abs(n.hit - this.t);
      if (d <= this.goodW && d < bd) { bd = d; best = n; }
    }
    if (!best) return;
    best.state = 'eaten';
    if (best.type === 'chomp') {
      const perfect = bd <= this.perfectW;
      this.parts.burst(HX, HY, perfect ? 16 : 8, { colors: perfect ? [P.pink1, P.pink2, P.white, P.lemon2] : [P.pink2, P.pink3], speed: [40, 120], shape: 'spark', size: [2, 3], life: [0.25, 0.5] });
      this.popups.push({ s: perfect ? 'Perfect' : 'Good', x: HX + 12, y: HY - 26, t: 0, c: perfect ? P.lemon1 : P.mint1 });
      this.pulse = 1;
    } else {
      this.blues++;
      this.parts.burst(HX, HY, 12, { colors: [P.berry1, P.berry2, P.blue2], speed: [40, 110], life: [0.3, 0.6], g: 200 });
      this.popups.push({ s: 'Blue!', x: HX + 12, y: HY - 26, t: 0, c: P.blue2 });
      flash(P.berry2, 0.12);
      shake(3, 0.15);
      if (this.blues >= 3) this.fail();
    }
  }

  onTimeout() {
    if (this.misses < 3 && this.blues < 3) this.win(); else this.fail();
  }

  onWin() {
    this.outDur = 1.6;
    this.parts.burst(VX, FEET - 60, 24, { colors: CANDY, speed: [60, 160], g: 220, life: [0.6, 1] });
  }
  onFail() { this.outDur = 2.3; }

  draw(ctx) {
    if (!bg) bg = buildBg();
    ctx.drawImage(bg, 0, 0);
    const at = this.at;
    // pot bubbles + steam
    for (let i = 0; i < 4; i++) {
      const x = 180 + i * 46 + (i === 3 ? -4 : 0);
      const ph = (at * 0.9 + i * 0.3) % 1;
      circle(ctx, x + Math.sin(at * 3 + i) * 3, 118 - ph * 30, 2 + ph * 3, `rgba(255,255,255,${0.6 * (1 - ph)})`);
      if (Math.sin(at * 7 + i * 2) > 0.6) circle(ctx, x - 5 + i, 121, 2, P.white);
    }
    // gum machine lights
    for (let i = 0; i < 4; i++) {
      const on = Math.floor(at * 4 + i) % 4 === 0;
      circle(ctx, 414 + i * 16, 126, 3, on ? [P.red1, P.lemon1, P.mint1, P.pink1][i] : P.grey1);
    }
    // gears
    const gx = 436, gy = 165;
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(at * 2);
    ctx.fillStyle = P.grey1;
    for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-2, -16, 5, 6); }
    ctx.restore();
    circle(ctx, gx, gy, 12, P.grey1); circle(ctx, gx, gy, 5, P.grey3);

    // hit zone
    const beatPh = ((this.t - this.travel - 0.35) / this.beat) % 1;
    const throb = this.result ? 0 : Math.max(0, 1 - Math.abs(beatPh < 0.5 ? beatPh : beatPh - 1) * 6);
    this.pulse = Math.max(0, this.pulse - 0.08);
    const rr = 12 + Math.round(throb * 2 + this.pulse * 4);
    ringPx(ctx, HX, HY, rr + 1, P.ink);
    ringPx(ctx, HX, HY, rr, this.pulse > 0.3 ? P.lemon1 : P.pink1);
    ringPx(ctx, HX, HY, rr - 1, P.white);

    // notes
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, 400, H); ctx.clip();
    for (const n of this.notes) {
      if (n.state === 'eaten') continue;
      if (n.state === 'live' && n.x > SPAWN_X + 20) continue;
      drawNote(ctx, n, n.x, n.y, at);
    }
    ctx.restore();

    // Violet
    if (this.result === 'fail') this.drawBerryFate(ctx);
    else {
      const won = this.result === 'win';
      const ch = this.chompT < 0.16 ? Math.sin((this.chompT / 0.16) * Math.PI) : 0;
      const idleChew = Math.max(0, Math.sin(at * 9)) * 0.15;
      const sw = this.swell;
      drawKid(ctx, 'violet', VX, FEET, {
        pose: won ? 'cheer' : 'idle', t: at,
        open: won ? 0.15 : Math.max(ch, idleChew),
        sx: 1 + sw * 0.13, sy: 1 + sw * 0.03,
        bodyTint: { color: P.berry1, a: Math.min(0.85, sw * 0.27) },
      });
      if (won) {
        // big pink bubble then pop
        const k = seg(this.outT, 0.15, 0.7, ease.outQuad);
        if (this.outT < 0.9) {
          const r = 4 + k * 26;
          circle(ctx, VX + 14 + k * 10, FEET - 37 - k * 4, r + 1, P.pink0);
          circle(ctx, VX + 14 + k * 10, FEET - 37 - k * 4, r, P.pink2);
          circle(ctx, VX + 10 + k * 6, FEET - 42 - k * 10, r * 0.3, P.pink4);
        } else if (!this.popped) {
          this.popped = true;
          this.parts.burst(VX + 24, FEET - 41, 30, { colors: [P.pink1, P.pink2, P.pink3], speed: [80, 200], g: 300, life: [0.4, 0.8], size: [2, 4] });
          shake(3, 0.15);
        }
      }
    }

    // mini HUD: gum lives + blueberry count
    for (let i = 0; i < 3; i++) {
      const missed = i < this.misses;
      circle(ctx, 16 + i * 16, 16, 6, P.ink);
      circle(ctx, 16 + i * 16, 16, 5, missed ? P.grey2 : P.pink1);
      if (!missed) rect(ctx, 13 + i * 16, 13, 2, 2, P.white);
      const ate = i < this.blues;
      circle(ctx, 16 + i * 16, 34, 6, P.ink);
      circle(ctx, 16 + i * 16, 34, 5, ate ? P.berry2 : P.lilac3);
    }

    for (const p of this.popups) {
      text(ctx, p.s, p.x, p.y - p.t * 30, { size: 8, color: p.c, outline: P.ink, ow: 1, alpha: 1 - seg(p.t, 0.35, 0.25) });
    }
    this.parts.draw(ctx);
  }

  drawBerryFate(ctx) {
    const t = this.outT, at = this.at;
    const grow = seg(t, 0, 0.6, ease.outElastic);
    const R = lerp(14, 52, grow);
    const roll = seg(t, 1.0, 1.3, ease.inQuad);
    const cx = VX + 6 + roll * 520;
    const cy = FEET - R;
    const ang = roll * 12;
    // squash on landing
    const sq = 1 + Math.sin(t * 25) * 0.05 * (1 - seg(t, 0.4, 0.4));
    ctx.save();
    ctx.translate(Math.round(cx), Math.round(cy));
    ctx.scale(sq, 1 / sq);
    circle(ctx, 0, 0, R + 1, P.ink);
    circle(ctx, 0, 0, R, P.berry1);
    circle(ctx, -R * 0.12, -R * 0.12, R * 0.8, P.berry2);
    ellipse(ctx, -R * 0.4, -R * 0.45, R * 0.22, R * 0.14, P.blue3);
    // little arms + legs poking out (rotate with the roll)
    ctx.rotate(ang);
    ctx.fillStyle = P.berry0;
    for (const a of [0.3, 2.8, 1.3, 1.85]) {
      ctx.save(); ctx.rotate(a); ctx.fillRect(R - 2, -2, 7, 4); ctx.restore();
    }
    ctx.restore();
    // head stuck on the berry (rotates around with it)
    const ha = -Math.PI / 2 + ang;
    const hx = cx + Math.cos(ha) * (R - 4), hy = cy + Math.sin(ha) * (R - 4);
    drawHead(ctx, 'violet', hx, hy, {
      scared: true, open: 0.3 + Math.abs(Math.sin(at * 16)) * 0.6,
      tint: { color: P.berry1, a: 0.75 }, rot: ang, scale: 0.9,
    });
    // Oompa-Loompas run in and roll her away
    if (t > 0.55) {
      for (let i = 0; i < 3; i++) {
        const runIn = seg(t, 0.55 + i * 0.08, 0.4, ease.outQuad);
        const ox = lerp(-30 - i * 20, cx - R - 6 - i * 13, runIn);
        drawOompa(ctx, ox, FEET + (i % 2) * 2, at, { pose: runIn >= 1 ? 'push' : 'walk', phase: i, mouth: true });
      }
    }
  }
}
