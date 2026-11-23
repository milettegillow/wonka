// Runs one microgame: command flash -> play with timer -> outcome.
import { P } from '../palette.js';
import { W, H, text, bigWord, stripeRect, rect, seg, ease, shake, flash, input } from '../engine.js';
import { GAMES } from '../games/index.js';

export class PlayScene {
  constructor(api, { id, loop = 1 }) {
    this.api = api;
    this.id = id;
    const G = GAMES[id];
    this.meta = G.meta;
    this.boss = !!G.meta.boss;
    this.speed = api.speedFor(loop);
    this.game = new G();
    this.game.init({ loop, speed: this.speed });
    this.phase = 'command';
    this.t = 0;
    this.cmdDur = this.boss ? 1.4 : 0.8;
    this.timer = 0;
    this.resT = 0;
    this.finished = false;
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    if (this.phase === 'command') {
      g.ambient(dt);
      if (this.t >= this.cmdDur) { this.phase = 'play'; if (input.down) g.onDown?.(input.x, input.y); }
      return;
    }
    const sdt = dt * this.speed;
    g.update(sdt);
    if (!g.result) {
      this.timer += sdt;
      if (this.timer >= g.duration) g.onTimeout();
    }
    if (g.result && this.phase === 'play') {
      this.phase = 'result';
      this.resT = 0;
      if (g.result === 'win') { flash(P.white, 0.18); shake(2, 0.15); }
      else { flash(P.red1, 0.25); shake(this.boss ? 7 : 4, 0.35); }
    }
    if (this.phase === 'result') {
      this.resT += dt;
      if (!this.finished && (g.done || this.resT > 4)) {
        this.finished = true;
        this.api.gameFinished(this.id, g.result);
      }
    }
  }

  onDown(x, y) { if (this.phase === 'play' && !this.game.result) this.game.onDown?.(x, y); }
  onMove(x, y) { if (this.phase === 'play' && !this.game.result) this.game.onMove?.(x, y); }
  onUp(x, y) { if (this.phase === 'play' && !this.game.result) this.game.onUp?.(x, y); }

  drawTimer(ctx) {
    const h = this.boss ? 14 : 9;
    const y = H - h;
    const frac = Math.max(0, 1 - this.timer / this.game.duration);
    const low = frac < 0.25 && !this.game.result;
    const jig = low ? Math.round(Math.sin(this.t * 40)) : 0;
    rect(ctx, 0, y - 2, W, h + 2, P.ink);
    rect(ctx, 0, y - 1, W, h + 1, P.choc1);
    const w = Math.round((W - 4) * frac);
    if (w > 0) {
      const c1 = low ? P.red1 : this.boss ? P.lemon1 : P.pink1;
      stripeRect(ctx, 2, y + jig, w, h - 2, c1, P.white, this.boss ? 5 : 4, -this.t * 30);
      rect(ctx, 2, y + jig, w, 1, 'rgba(255,255,255,0.6)');
      // candy end cap
      rect(ctx, w, y - 1 + jig, 3, h, P.ink);
    }
  }

  draw(ctx) {
    const g = this.game;
    g.draw(ctx);
    this.drawTimer(ctx);

    if (this.phase === 'command') {
      const k = this.t / this.cmdDur;
      ctx.fillStyle = `rgba(26,11,16,${0.35 * (1 - seg(k, 0.85, 0.15))})`;
      ctx.fillRect(0, 0, W, H);
      if (this.boss) {
        const bk = seg(this.t, 0, 0.25, ease.outBack);
        const by = -40 + bk * 92;
        stripeRect(ctx, 0, by - 18, W, 36, P.red1, P.lemon1, 8, this.t * 80);
        rect(ctx, 0, by - 20, W, 2, P.ink); rect(ctx, 0, by + 18, W, 2, P.ink);
        text(ctx, 'Boss', W / 2, by + 1, { size: 24, color: P.white, outline: P.ink, ow: 2, shadow: P.red0, sh: 3 });
        if (this.t > 0.5) bigWord(ctx, this.meta.command, W / 2, 160, this.t - 0.5, { size: 40 });
      } else {
        bigWord(ctx, this.meta.command, W / 2, H / 2 - 10, this.t, { size: 40 });
      }
    } else if (this.phase === 'play' && this.t - this.cmdDur < 0.15) {
      // word zooms away
      const k = (this.t - this.cmdDur) / 0.15;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      bigWord(ctx, this.meta.command, W / 2, H / 2 - 10 - k * 20, 1, { size: Math.round(40 + k * 16) });
      ctx.restore();
    }

    if (this.phase === 'result') {
      const won = g.result === 'win';
      const k = seg(this.resT, 0, 0.22, ease.outBack);
      const out = seg(this.resT, 0.9, 0.2);
      if (out < 1) {
        ctx.save();
        ctx.translate(W / 2, 30);
        ctx.rotate(won ? -0.08 : 0.08);
        ctx.scale(k, k);
        ctx.globalAlpha = 1 - out;
        text(ctx, won ? 'Yes!' : 'Oops!', 0, 0, {
          size: 24, color: won ? P.mint2 : P.pink2, outline: P.ink, ow: 2, shadow: won ? P.mint0 : P.red0, sh: 3,
        });
        ctx.restore();
      }
    }
  }
}
