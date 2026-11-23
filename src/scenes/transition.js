// Between games: the boiled-sweet boat sails down the river past a sign for
// the next room. Lives (golden tickets) + score shown up top.
import { P } from '../palette.js';
import { W, text, seg, ease, stripeRect, rect, Particles } from '../engine.js';
import { drawChocRoom, drawBoat, drawTicket, RIVER_TOP } from '../chocroom.js';
import { GAMES } from '../games/index.js';

export function drawHud(ctx, run, t, o = {}) {
  for (let i = 0; i < 3; i++) {
    const alive = i < run.lives;
    const x = 22 + i * 26, y = 20;
    if (o.lostIdx === i && o.lostK < 1) {
      const k = o.lostK;
      drawTicket(ctx, x + k * 10, y - k * 30, { rot: k * 4, scale: 1 + k * 0.5, alpha: 1 - k, t });
    }
    drawTicket(ctx, x, y + (alive ? Math.round(Math.sin(t * 5 + i) * 1) : 0), { dull: !alive, t: t + i * 0.4, alpha: alive ? 1 : 0.6 });
  }
  const pop = o.scorePop ?? 0;
  ctx.save();
  ctx.translate(W - 26, 20);
  ctx.scale(1 + pop * 0.6, 1 + pop * 0.6);
  text(ctx, String(run.score), 0, 1, { size: 16, align: 'right', color: P.lemon1, outline: P.ink, ow: 2, shadow: P.choc1 });
  ctx.restore();
}

export class TransitionScene {
  constructor(api, { next, won = false, lostLife = false }) {
    this.api = api;
    this.next = next;
    this.meta = GAMES[next].meta;
    this.won = won;
    this.lostLife = lostLife;
    this.t = 0;
    this.dur = 1.5;
    this.parts = new Particles();
    if (won) this.parts.burst(W - 30, 20, 16, { colors: [P.lemon1, P.pink2, P.white], speed: [30, 90], g: 120 });
  }
  update(dt) {
    this.t += dt;
    this.parts.update(dt);
    if (this.t >= this.dur && !this.left) { this.left = true; this.api.playNext(); }
  }
  onDown() {}
  draw(ctx) {
    const t = this.t;
    drawChocRoom(ctx, t + 3);
    const k = this.t / this.dur;
    drawBoat(ctx, -70 + ease.inOutSine(k) * (W + 140), RIVER_TOP + 14, t, { kids: [this.meta.kid], open: Math.max(0, Math.sin(t * 12)), headScale: 0.9 });

    // hanging room sign drops in
    const drop = seg(t, 0.05, 0.4, ease.outBack);
    const leave = seg(t, 1.25, 0.25, ease.inBack);
    const sy = -60 + drop * 140 - leave * 160;
    const swing = Math.sin(t * 5) * 0.04 * (1 - seg(t, 0.4, 0.8));
    ctx.save();
    ctx.translate(W / 2, sy);
    ctx.rotate(swing);
    rect(ctx, -60, -80, 2, 60, P.ink); rect(ctx, 58, -80, 2, 60, P.ink);
    const label = this.meta.room;
    const bw = Math.max(160, label.length * 12 + 40);
    rect(ctx, -bw / 2 - 3, -23, bw + 6, 46, P.ink);
    stripeRect(ctx, -bw / 2, -20, bw, 40, P.pink1, P.white, 4, t * 20);
    rect(ctx, -bw / 2 + 5, -15, bw - 10, 30, P.cream);
    rect(ctx, -bw / 2 + 5, -15, bw - 10, 2, P.white);
    text(ctx, label, 0, 1, { size: 12, color: P.choc1 });
    if (this.meta.boss) {
      ctx.rotate(-0.15);
      rect(ctx, bw / 2 - 40, 6, 52, 18, P.ink);
      rect(ctx, bw / 2 - 38, 8, 48, 14, P.red1);
      text(ctx, 'Boss', bw / 2 - 14, 16, { size: 8, color: P.white });
    }
    ctx.restore();

    const run = this.api.run;
    drawHud(ctx, run, t, {
      lostIdx: this.lostLife ? run.lives : -1,
      lostK: seg(t, 0.1, 0.8),
      scorePop: this.won ? Math.max(0, 1 - t * 3) : 0,
    });
    this.parts.draw(ctx);
  }
}
