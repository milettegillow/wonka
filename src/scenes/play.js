// Runs one microgame: intro card (until tapped) -> play with timer -> result
// with Wonka popping in to comment.
import { P } from '../palette.js';
import { W, H, text, stripeRect, rect, seg, ease, shake, flash, input, bigWord } from '../engine.js';
import { GAMES } from '../games/index.js';
import { drawHud, drawSlots, drawInputIcon, wrap, WonkaPop } from '../ui.js';
import { drawWonka } from '../kids.js';
import { sfx, playMusic } from '../audio.js';
import { getBest, recordBeaten } from '../save.js';
import { winQuip, failQuip } from '../quips.js';

export class PlayScene {
  constructor(api, { id, level = 1 }) {
    this.api = api;
    this.id = id;
    this.level = level;
    const G = GAMES[id];
    this.meta = G.meta;
    this.boss = !!G.meta.boss;
    this.speed = api.speedFor(level);
    this.game = new G();
    this.game.init({ level, speed: this.speed });
    this.phase = 'card';
    this.pausable = true;
    this.t = 0;
    this.cardT = 0;
    this.leaveT = -1;
    this.timer = 0;
    this.resT = 0;
    this.finished = false;
    this.filled = getBest(id);
    this.popIdx = -1;
    this.lives = api.run ? api.run.lives : 3;
    playMusic(this.boss ? 'boss' : 'game', { tempo: 1 + 0.06 * (level - 1) });
    sfx('pop');
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    if (this.phase === 'card') {
      this.cardT += dt;
      g.ambient(dt);
      if (this.leaveT >= 0) {
        this.leaveT += dt;
        if (this.leaveT >= 0.25) { this.phase = 'play'; this.playT = 0; if (input.down) g.onDown?.(input.x, input.y); }
      }
      return;
    }
    const sdt = dt * this.speed;
    g.update(sdt);
    if (this.phase === 'play') {
      this.playT += dt;
      if (!g.result) {
        this.timer += sdt;
        if (this.timer >= g.duration) g.onTimeout();
      }
      if (g.result) this.enterResult(g.result);
    } else if (this.phase === 'result') {
      this.resT += dt;
      this.wonka?.update(dt);
      const minT = 2.1;
      if (!this.finished && ((this.resT >= minT && g.done && (!this.wonka || this.wonka.done)) || this.resT > 5)) this.finish();
    }
  }

  enterResult(result) {
    this.phase = 'result';
    this.resT = 0;
    const won = result === 'win';
    if (won) {
      flash(P.white, 0.18); shake(2, 0.15);
      playMusic('win');
      if (this.api.run || !this.api.debug) {
        if (recordBeaten(this.id, this.level)) {
          this.popIdx = this.level - 1;
          this.filled = this.level;
          setTimeout(() => sfx('gobstopper'), 350);
        }
      }
    } else {
      flash(P.red1, 0.25); shake(this.boss ? 7 : 4, 0.35);
      playMusic('fail');
      setTimeout(() => sfx('lifeLost'), 500);
    }
    this.wonka = new WonkaPop(won ? winQuip(this.meta.kid) : failQuip(this.meta.kid), { dur: 2.3, side: 'right' });
  }

  finish() {
    this.finished = true;
    this.api.gameFinished(this.id, this.game.result, this.level);
  }

  onDown(x, y) {
    if (this.phase === 'card') {
      if (this.cardT > 0.35 && this.leaveT < 0) { this.leaveT = 0; sfx('tap'); }
      return;
    }
    if (this.phase === 'result') {
      if (this.resT > 1.3 && this.game.done) this.finish();
      return;
    }
    if (this.phase === 'play' && !this.game.result) this.game.onDown?.(x, y);
  }
  onMove(x, y) { if (this.phase === 'play' && !this.game.result) this.game.onMove?.(x, y); }
  onUp(x, y) { if (this.phase === 'play' && !this.game.result) this.game.onUp?.(x, y); }

  drawTimer(ctx) {
    const h = this.boss ? 14 : 9;
    const y = H - h;
    const frac = Math.max(0, 1 - this.timer / this.game.duration);
    const low = frac < 0.25 && !this.game.result && this.phase === 'play';
    const jig = low ? Math.round(Math.sin(this.t * 40)) : 0;
    rect(ctx, 0, y - 2, W, h + 2, P.ink);
    rect(ctx, 0, y - 1, W, h + 1, P.choc1);
    const w = Math.round((W - 4) * frac);
    if (w > 0) {
      const c1 = low ? P.red1 : this.boss ? P.lilac1 : P.pink1;
      stripeRect(ctx, 2, y + jig, w, h - 2, c1, P.white, this.boss ? 5 : 4, -this.t * 30);
      rect(ctx, 2, y + jig, w, 1, 'rgba(255,255,255,0.6)');
      rect(ctx, w, y - 1 + jig, 3, h, P.ink);
    }
  }

  drawCard(ctx) {
    const t = this.cardT;
    const inK = seg(t, 0, 0.3, ease.outBack);
    const outK = this.leaveT >= 0 ? seg(this.leaveT, 0, 0.25, ease.inBack) : 0;
    const k = inK * (1 - outK);
    ctx.fillStyle = `rgba(30,10,22,${0.45 * (1 - outK)})`;
    ctx.fillRect(0, 0, W, H);
    if (k <= 0.01) return;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(k, k);
    ctx.translate(-W / 2, -H / 2);
    const cx = 44, cy = 28, cw = 392, ch = 210;
    rect(ctx, cx - 3, cy - 3, cw + 6, ch + 6, P.ink);
    stripeRect(ctx, cx, cy, cw, ch, this.boss ? P.red1 : P.pink1, P.white, 6, this.t * 14);
    rect(ctx, cx + 8, cy + 8, cw - 16, ch - 16, P.cream);
    rect(ctx, cx + 8, cy + 8, cw - 16, 3, P.white);
    // Wonka popping up from the card's corner
    const wk = seg(t, 0.15, 0.3, ease.outBack);
    ctx.save();
    ctx.beginPath(); ctx.rect(cx + 8, cy + 8, cw - 16, ch - 16); ctx.clip();
    const talking = t > 0.3 && t < 1.4;
    drawWonka(ctx, cx + 62, cy + ch - 8 + (1 - wk) * 120, { t, pose: talking ? 'talk' : 'present', open: talking ? Math.abs(Math.sin(t * 20)) * 0.7 : 0, scale: 1.45 });
    ctx.restore();
    const mx = 284;
    if (this.boss) {
      ctx.save();
      ctx.translate(mx, cy + 22); ctx.rotate(-0.04);
      rect(ctx, -40, -9, 80, 18, P.ink); rect(ctx, -38, -7, 76, 14, P.red1);
      text(ctx, 'Boss', 0, 1, { size: 8, color: P.white });
      ctx.restore();
    }
    bigWord(ctx, this.meta.command, mx, cy + 56, Math.max(0, t - 0.1), { size: 32, color: P.pink1, shadow: P.pink0, outline: P.ink, ow: 2, sh: 3 });
    text(ctx, `Level ${this.level}`, mx, cy + 92, { size: 12, color: P.lilac0 });
    drawSlots(ctx, mx, cy + 110, this.filled, { r: 4, gap: 2, t: this.t, pulseIdx: this.level - 1 });
    const lines = wrap(this.meta.line, 24);
    lines.forEach((ln, i) => text(ctx, ln, mx, cy + 130 + i * 12, { size: 8, color: P.choc2 }));
    drawInputIcon(ctx, this.meta.input, mx, cy + 166, t);
    if (Math.floor(t * 2.2) % 2 === 0 && t > 0.6) text(ctx, 'Tap to start', cx + cw - 16, cy + ch - 18, { size: 8, align: 'right', color: P.pink1 });
    ctx.restore();
  }

  draw(ctx) {
    const g = this.game;
    g.draw(ctx);
    if (this.phase !== 'card') this.drawTimer(ctx);
    const failing = this.phase === 'result' && g.result === 'fail';
    drawHud(ctx, {
      t: this.t, level: this.level, filled: this.filled,
      lives: this.lives - (failing ? 1 : 0),
      lostIdx: failing ? this.lives - 1 : -1, lostK: failing ? seg(this.resT, 0.4, 0.8) : 1,
      popIdx: this.popIdx, popT: this.resT,
    });
    if (this.phase === 'card') this.drawCard(ctx);
    if (this.phase === 'result') {
      const won = g.result === 'win';
      const k = seg(this.resT, 0, 0.22, ease.outBack);
      const out = seg(this.resT, 1.3, 0.25);
      if (out < 1) {
        ctx.save();
        ctx.translate(W / 2, 44);
        ctx.rotate(won ? -0.08 : 0.08);
        ctx.scale(k, k);
        ctx.globalAlpha = 1 - out;
        text(ctx, won ? 'Yes!' : 'Oops!', 0, 0, { size: 24, color: won ? P.mint2 : P.pink2, outline: P.ink, ow: 2, shadow: won ? P.mint0 : P.red0, sh: 3 });
        ctx.restore();
      }
      this.wonka?.draw(ctx);
    }
  }
}
