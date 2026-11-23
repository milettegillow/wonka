// VERUCA — the Nut Room. Hold to creep toward the prize squirrel, let go
// to freeze. Don't get caught moving while the squirrels are looking.
import { P } from '../palette.js';
import { W, H, rect, ellipse, circle, seg, ease, lerp, rand, chance, shake, sparkle, text, input } from '../engine.js';
import { drawKid } from '../kids.js';
import { MicroGame } from './base.js';
import { sfx } from '../audio.js';

const FEET = 236;
const START_X = 46;
const GOAL_X = 384;
const TARGET_X = 428;
const BENCH_Y = 150;
const SQ_X = [118, 156, 194, 232, 270, 308, 346];

let bg = null;
function buildBg() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  // warm walls + wainscot
  r(0, 0, W, H, P.cream2);
  for (let x = 0; x < W; x += 24) { r(x, 0, 12, 120, P.pink4); }
  r(0, 0, W, 8, P.wood0); r(0, 8, W, 2, P.wood1);
  for (let x = 0; x < W; x += 80) { r(x, 10, 8, 110, P.wood1); r(x + 1, 10, 2, 110, P.wood2); }
  r(0, 120, W, 4, P.wood0); r(0, 124, W, 80, P.mint1);
  for (let x = 6; x < W; x += 40) { r(x, 130, 30, 66, P.mint0); r(x + 2, 132, 26, 62, P.mint2); r(x + 2, 132, 26, 2, P.mint3); }
  // big sacks of walnuts in the back
  const sack = (x, y) => {
    for (let dy = -16; dy <= 16; dy++) { const hw = Math.round(14 * Math.sqrt(Math.max(0, 1 - (dy / 17) ** 2))) + (dy > 0 ? 2 : 0); r(x - hw - 1, y + dy, hw * 2 + 3, 1, P.ink); r(x - hw, y + dy, hw * 2 + 1, 1, P.caramel2); }
    r(x - 4, y - 18, 9, 4, P.caramel);
    for (let i = 0; i < 5; i++) { r(x - 8 + i * 4, y - 15 - (i % 2) * 2, 4, 4, P.choc3); r(x - 8 + i * 4, y - 15 - (i % 2) * 2, 2, 1, P.choc4); }
  };
  sack(30, 104); sack(456, 104); sack(434, 110);
  // floor planks
  r(0, 204, W, H, P.wood2);
  for (let y = 204; y < H; y += 10) { r(0, y, W, 1, P.wood1); for (let x = (y * 3) % 70; x < W; x += 70) r(x, y, 1, 10, P.wood1); }
  r(0, 202, W, 2, P.ink);
  // long workbench
  r(100, BENCH_Y + 18, 270, 6, P.ink);
  r(101, BENCH_Y + 19, 268, 4, P.wood0);
  r(98, BENCH_Y + 12, 274, 7, P.ink);
  r(100, BENCH_Y + 13, 270, 5, P.wood2);
  r(100, BENCH_Y + 13, 270, 1, P.cream3);
  for (const x of [108, 232, 360]) { r(x, BENCH_Y + 24, 5, 205 - BENCH_Y - 24, P.wood0); }
  // walnut piles on the bench
  for (let i = 0; i < 18; i++) { const x = 104 + i * 15; r(x, BENCH_Y + 8, 5, 5, P.choc3); r(x + 1, BENCH_Y + 8, 2, 1, P.choc4); }
  // prize squirrel's stool
  r(TARGET_X - 12, 188, 24, 4, P.ink); r(TARGET_X - 11, 189, 22, 2, P.pink1);
  r(TARGET_X - 10, 192, 3, 12, P.ink); r(TARGET_X + 7, 192, 3, 12, P.ink);
  return c;
}

// Squirrel in profile. look: 0 = working (facing right), 1 = staring left.
function drawSquirrel(ctx, x, y, o = {}) {
  const look = o.look ?? 0;
  const s = o.scale ?? 1;
  const at = o.t ?? 0;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(s, s);
  const fur = o.fur || P.choc4, fur2 = o.fur2 || P.caramel, belly = P.cream2;
  // tail curling up behind
  const tw = Math.sin(at * 3 + (o.ph || 0)) * 1;
  ellipse(ctx, -9, -16 + tw, 7, 10, P.ink);
  ellipse(ctx, -9, -16 + tw, 6, 9, fur2);
  ellipse(ctx, -8, -22 + tw, 4, 4, P.caramel2);
  ellipse(ctx, -5, -9, 4, 4, fur2);
  // body
  ellipse(ctx, 0, -8, 7, 8, P.ink);
  ellipse(ctx, 0, -8, 6, 7, fur);
  ellipse(ctx, 2, -7, 3, 5, belly);
  // head: slides from right-facing to left-facing
  const hx = lerp(3, -1, look);
  const tapping = o.tap ? Math.max(0, Math.sin(at * 18 + (o.ph || 0))) * 2 : 0;
  const hy = -19 + tapping;
  ellipse(ctx, hx, hy, 6, 5, P.ink);
  ellipse(ctx, hx, hy, 5, 4, fur);
  // ears (twitch during the tell)
  const tw2 = o.twitch ? Math.round(Math.sin(at * 50)) : 0;
  rect(ctx, hx - 3, hy - 7 - tw2, 2, 3, P.ink); rect(ctx, hx + 1, hy - 7 + tw2, 2, 3, P.ink);
  rect(ctx, hx - 3, hy - 6 - tw2, 1, 2, fur2); rect(ctx, hx + 1, hy - 6 + tw2, 1, 2, fur2);
  // face
  if (look < 0.35) {
    rect(ctx, hx + 4, hy, 3, 2, fur); rect(ctx, hx + 6, hy, 1, 1, P.ink); // snout
    rect(ctx, hx + 2, hy - 2, 2, 2, P.ink);
  } else if (look < 0.8) {
    rect(ctx, hx - 3, hy - 2, 2, 2, P.ink); rect(ctx, hx + 1, hy - 2, 2, 2, P.ink);
    rect(ctx, hx - 1, hy + 1, 2, 1, P.ink);
  } else {
    // staring right at Veruca: big white eyes
    rect(ctx, hx - 5, hy - 3, 4, 4, P.white); rect(ctx, hx - 1, hy - 3, 4, 4, P.white);
    rect(ctx, hx - 5, hy - 2, 2, 2, o.angry ? P.red1 : P.ink); rect(ctx, hx - 1, hy - 2, 2, 2, o.angry ? P.red1 : P.ink);
    rect(ctx, hx - 7, hy, 3, 2, fur); rect(ctx, hx - 7, hy, 1, 1, P.ink);
  }
  // paws + walnut
  if (o.nut !== false) {
    const px = look < 0.5 ? 6 : 4;
    rect(ctx, px, -12 + tapping * 0.5, 4, 4, P.choc2); rect(ctx, px + 1, -12 + tapping * 0.5, 1, 1, P.choc4);
  }
  ctx.restore();
}

export class VerucaGame extends MicroGame {
  static meta = { kid: 'veruca', room: 'The Nut Room', command: 'Sneak!', line: 'Hold to creep, let go when they look', input: 'hold' };

  init(d) {
    super.init(d);
    this.speed_ = this.lv([100, 104, 108, 112, 116]);
    this.ivl = [this.lv([2.2, 1.6, 1.1, 0.8, 0.55]), this.lv([3.2, 2.6, 2.2, 1.9, 1.6])];
    this.tellDur = this.lv([1.1, 0.85, 0.6, 0.42, 0.3]);
    this.lookDur = [this.lv([0.8, 0.75, 0.7, 0.65, 0.6]), this.lv([1.1, 1.2, 1.3, 1.35, 1.4])];
    this.fakeChance = this.lv([0, 0.12, 0.2, 0.28, 0.35]);
    this.duration = this.lv([10, 9.8, 9.6, 9.4, 9.4]);
    this.stepT = 0;
    this.x = START_X;
    this.moving = false;
    this.state = 'work';
    this.stateT = 0;
    this.next = rand(this.ivl[0] + 0.3, this.ivl[1] + 0.3);
    this.fake = false;
    this.grace = 0.06;
    this.caughtX = 0;
  }

  setState(s, dur) { this.state = s; this.stateT = 0; this.next = dur; }

  update(dt) {
    this.tick(dt);
    if (this.result) return;
    this.stateT += dt;
    if (this.stateT >= this.next) {
      if (this.state === 'work') {
        this.fake = chance(this.fakeChance);
        this.setState('tell', this.tellDur * (this.fake ? rand(0.6, 1) : 1));
        sfx('squeak');
      } else if (this.state === 'tell') {
        if (this.fake) this.setState('work', rand(this.ivl[0] * 0.6, this.ivl[1] * 0.8));
        else { this.setState('look', rand(this.lookDur[0], this.lookDur[1])); sfx('warn'); }
      } else if (this.state === 'look') {
        this.setState('work', rand(this.ivl[0], this.ivl[1]));
      }
    }
    this.moving = input.down;
    if (this.moving) {
      if (this.state === 'look' && this.stateT > this.grace) {
        this.caughtX = this.x;
        this.fail();
        return;
      }
      this.x += this.speed_ * dt;
      this.stepT -= dt;
      if (this.stepT <= 0) { this.stepT = 0.28; sfx('step'); }
      if (this.at % 0.2 < dt) this.parts.add({ x: this.x - 6, y: FEET, vx: -20, vy: -10, life: 0.3, size: 2, color: P.wood0, shape: 'puff' });
      if (this.x >= GOAL_X) { this.x = GOAL_X; this.win(); }
    }
  }

  onWin() {
    this.outDur = 2.0;
    sfx('squeak'); sfx('cheer');
    shake(2, 0.2);
    this.parts.burst(TARGET_X - 10, 160, 24, { colors: [P.gold1, P.gold2, P.pink2, P.white], speed: [60, 160], g: 200, shape: 'spark', size: [2, 3], life: [0.4, 0.8] });
  }
  onFail() {
    this.outDur = 2.7; shake(4, 0.3);
    sfx('squeak');
    for (let i = 0; i < 6; i++) setTimeout(() => sfx('knock'), 800 + i * 110);
    setTimeout(() => sfx('chute'), 1750);
  }

  draw(ctx) {
    if (!bg) bg = buildBg();
    ctx.drawImage(bg, 0, 0);
    const at = this.at, ot = this.outT;
    const looking = this.state === 'look';
    const telling = this.state === 'tell';
    const lookK = looking ? Math.min(1, this.stateT / 0.08) : telling ? 0.5 * seg(this.stateT, this.next * 0.5, this.next * 0.5) : 0;
    const failing = this.result === 'fail';

    // the bench squirrels
    SQ_X.forEach((sx, i) => {
      if (failing && ot > 0.25) return; // they've leapt at Veruca
      drawSquirrel(ctx, sx, BENCH_Y + 12, {
        t: at, ph: i * 1.3, look: failing ? 1 : lookK, twitch: telling, tap: !looking && !telling && !failing,
        angry: failing || (looking && this.moving),
      });
      if (looking || failing) {
        // exclamation flash
        if (this.stateT < 0.4 || failing) text(ctx, '!', sx, BENCH_Y - 26 - (i % 2) * 2, { size: 8, color: P.red1, outline: P.ink, ow: 1 });
      } else if (telling) {
        sparkle(ctx, sx + 3, BENCH_Y - 18, 1 + Math.round(Math.abs(Math.sin(at * 30 + i))), P.white);
      }
    });

    // prize squirrel on the stool
    const won = this.result === 'win';
    if (!won) {
      drawSquirrel(ctx, TARGET_X, 188, { t: at, look: 1, scale: 1.3, fur: P.caramel, fur2: P.caramel2, nut: true });
      sparkle(ctx, TARGET_X + 14, 150 + Math.sin(at * 3) * 3, 2 + Math.round(Math.abs(Math.sin(at * 5)) * 2), P.gold2);
    }

    // Veruca
    if (failing) this.drawFate(ctx);
    else if (won) {
      const k = seg(ot, 0, 0.2, ease.outBack);
      const x = lerp(this.x, TARGET_X - 18, k);
      const head = drawKid(ctx, 'veruca', x, FEET, { pose: 'hold', t: at, open: Math.abs(Math.sin(at * 12)) });
      drawSquirrel(ctx, x, head.y - 18 - Math.abs(Math.sin(at * 8)) * 3, { t: at, look: 0.6, scale: 1.3, fur: P.caramel, fur2: P.caramel2, nut: false });
    } else {
      drawKid(ctx, 'veruca', this.x, FEET, {
        pose: this.moving ? 'creep' : 'freeze', t: this.moving ? at : 0,
        open: looking ? 0 : this.moving ? Math.max(0, Math.sin(at * 6)) * 0.15 : 0,
        scared: looking,
      });
    }

    // progress floor marks
    for (let x = START_X + 20; x < GOAL_X; x += 30) rect(ctx, x, FEET + 6, 4, 1, x < this.x ? P.gold1 : P.wood1);

    // looking: everything goes a little tense
    if (looking && !this.result) {
      ctx.fillStyle = 'rgba(255,60,80,0.08)';
      ctx.fillRect(0, 0, W, H);
    }
    this.parts.draw(ctx);
  }

  drawFate(ctx) {
    const t = this.outT, at = this.at;
    const vx = this.caughtX;
    // hole opens beneath her, then she drops
    const holeK = seg(t, 1.5, 0.25, ease.outBack);
    const drop = seg(t, 1.8, 0.5, ease.inQuad);
    if (holeK > 0) {
      ellipse(ctx, vx, FEET + 2, 26 * holeK + 1, 7 * holeK + 1, P.ink);
      ellipse(ctx, vx, FEET + 2, 26 * holeK, 7 * holeK, P.black);
      ellipse(ctx, vx, FEET + 4, 20 * holeK, 4 * holeK, '#000');
    }
    ctx.save();
    if (drop > 0) {
      ctx.beginPath();
      ctx.rect(0, 0, W, FEET + 3);
      ctx.clip();
    }
    const shiver = t > 0.8 && t < 1.5 ? Math.round(Math.sin(at * 60)) : 0;
    const head = drawKid(ctx, 'veruca', vx + shiver, FEET + drop * 110, {
      pose: 'scared', t: at, scared: true,
      open: 0.3 + Math.abs(Math.sin(at * 18)) * 0.6,
      sy: drop > 0 ? 1 + drop * 0.2 : 1, sx: drop > 0 ? 1 - drop * 0.2 : 1,
    });
    ctx.restore();

    // squirrels leap in arcs and swarm her head
    SQ_X.forEach((sx, i) => {
      const leap = seg(t, 0.25 + i * 0.05, 0.45, ease.inOutQuad);
      if (leap <= 0) {
        if (t > 0.25) drawSquirrel(ctx, sx, BENCH_Y + 12, { t: at, look: 1, angry: true });
        return;
      }
      const ang = (i / SQ_X.length) * Math.PI * 1.2 - Math.PI * 1.1;
      const tx = vx + Math.cos(ang) * 20, ty = head.y + 8 + Math.sin(ang) * 22;
      const flee = seg(t, 1.6, 0.6, ease.inQuad);
      let x = lerp(sx, tx, leap), y = lerp(BENCH_Y + 12, ty, leap) - Math.sin(leap * Math.PI) * 50;
      if (flee > 0) { x += (i % 2 ? 1 : -1) * flee * 200; y -= Math.sin(flee * Math.PI) * 30; }
      const knock = t > 0.8 && t < 1.5 ? Math.max(0, Math.sin(at * 22 + i)) * 3 : 0;
      drawSquirrel(ctx, x, y + knock, { t: at, look: tx < sx ? 1 : 0, angry: true, scale: 0.9 });
      if (knock > 2.5) sparkle(ctx, x + (tx < sx ? -6 : 6), y - 18, 2, P.white);
    });
    if (t > 0.8 && t < 1.6) {
      const k = seg(t, 0.8, 0.15, ease.outBack);
      ctx.save();
      ctx.translate(Math.max(60, vx + 4), head.y - 46);
      ctx.scale(k, k);
      text(ctx, 'Bad nut!', 0, 0, { size: 12, color: P.red1, outline: P.ink, ow: 2, shadow: P.white });
      ctx.restore();
    }
  }
}
