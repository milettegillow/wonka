// Grand tour, between games: the pink boiled-sweet boat glides gently down
// the chocolate river past a sign for the next room (~3s).
import { P } from '../palette.js';
import { W, text, seg, ease, stripeRect, rect, Particles } from '../engine.js';
import { drawChocRoom, drawBoat, RIVER_TOP } from '../chocroom.js';
import { GAMES } from '../games/index.js';
import { drawHud } from '../ui.js';
import { sfx, playMusic } from '../audio.js';

export class TransitionScene {
  constructor(api, { next, won = false, lostLife = false }) {
    this.api = api;
    this.next = next;
    this.meta = GAMES[next].meta;
    this.won = won;
    this.lostLife = lostLife;
    this.t = 0;
    this.dur = 3.1;
    this.pausable = true;
    this.parts = new Particles();
    const round = api.run?.round ?? 1;
    playMusic('menu');
    sfx('boat');
    this.round = round;
  }
  update(dt) {
    this.t += dt;
    this.parts.update(dt);
    if (Math.random() < dt * 6) {
      const bx = this.boatX();
      this.parts.add({ x: bx - 50, y: RIVER_TOP + 20 + Math.random() * 4, vx: -14, vy: 0, life: 0.8, size: 2, color: P.caramel2, shape: 'puff' });
    }
    if (this.t >= this.dur && !this.left) { this.left = true; this.api.playNext(); }
  }
  boatX() { return 60 + ease.inOutSine(Math.min(1, this.t / this.dur)) * 300; }
  onDown() { if (this.t > 1.2 && !this.left) { this.left = true; this.api.playNext(); } }
  draw(ctx) {
    const t = this.t;
    drawChocRoom(ctx, t + 3);
    this.parts.draw(ctx);
    const kid = this.meta.kid;
    drawBoat(ctx, this.boatX(), RIVER_TOP + 14 + Math.sin(t * 2.2) * 2, t * 0.7, {
      kids: [kid], open: Math.max(0, Math.sin(t * 6)) * 0.6, headScale: 0.95,
    });

    // hanging room sign drops in, sways, lifts away
    const drop = seg(t, 0.15, 0.6, ease.outBack);
    const leave = seg(t, this.dur - 0.45, 0.4, ease.inBack);
    const sy = -60 + drop * 150 - leave * 170;
    const swing = Math.sin(t * 3) * 0.05 * (1 - seg(t, 0.6, 1.4));
    ctx.save();
    ctx.translate(W / 2, sy);
    ctx.rotate(swing);
    rect(ctx, -60, -90, 2, 70, P.ink); rect(ctx, 58, -90, 2, 70, P.ink);
    const label = this.meta.room;
    const bw = Math.max(170, label.length * 16 + 40);
    rect(ctx, -bw / 2 - 3, -23, bw + 6, 52, P.ink);
    stripeRect(ctx, -bw / 2, -20, bw, 46, P.pink1, P.pink4, 4, t * 10);
    rect(ctx, -bw / 2 + 5, -15, bw - 10, 36, P.cream);
    rect(ctx, -bw / 2 + 5, -15, bw - 10, 2, P.white);
    text(ctx, label, 0, -3, { size: 16, color: P.choc1 });
    text(ctx, `Level ${this.round}`, 0, 13, { size: 8, color: P.lilac1 });
    if (this.meta.boss) {
      ctx.rotate(-0.15);
      rect(ctx, bw / 2 - 40, 10, 52, 18, P.ink);
      rect(ctx, bw / 2 - 38, 12, 48, 14, P.red1);
      text(ctx, 'Boss', bw / 2 - 14, 20, { size: 8, color: P.white });
    }
    ctx.restore();

    const run = this.api.run;
    if (run) {
      drawHud(ctx, {
        t, label: `Round ${this.round}`, lives: run.lives,
        lostIdx: this.lostLife ? run.lives : -1, lostK: seg(t, 0.1, 0.9),
      });
    }
  }
}
