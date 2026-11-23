// Grand tour: "Round N" card between laps.
import { P } from '../palette.js';
import { W, H, bigWord, seg, ease, text } from '../engine.js';
import { drawHead, KIDS } from '../faces.js';
import { drawHud, WonkaPop } from '../ui.js';
import { sfx, playMusic } from '../audio.js';

export class RoundScene {
  constructor(api, { round = 2, lostLife = false }) {
    this.api = api; this.round = round; this.t = 0; this.dur = 2.6; this.lostLife = lostLife;
    this.pausable = true;
    playMusic('win', { restart: true });
    sfx('gobstopper');
    this.wonka = new WonkaPop(round >= 5 ? 'Last lap! Do try to survive.' : 'Faster now! Chop chop!', { dur: 2.4, side: 'right' });
  }
  update(dt) {
    this.t += dt;
    this.wonka.update(dt);
    if (this.t >= this.dur && !this.left) { this.left = true; this.api.go('transition', { next: this.api.ORDER[0] }); }
  }
  onDown() { if (this.t > 1 && !this.left) { this.left = true; this.api.go('transition', { next: this.api.ORDER[0] }); } }
  draw(ctx) {
    const t = this.t;
    ctx.fillStyle = P.pink2;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(t * 0.8);
    const n = 16;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = [P.pink3, P.lilac3, P.mint3, P.pink4][i % 4];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      ctx.lineTo(Math.cos(a0) * 400, Math.sin(a0) * 400);
      ctx.lineTo(Math.cos(a1) * 400, Math.sin(a1) * 400);
      ctx.fill();
    }
    ctx.restore();
    KIDS.forEach((k, i) => {
      const x = 56 + i * 74;
      const y = 216 - Math.abs(Math.sin(t * 5 + i * 0.9)) * 14;
      const intro = seg(t, i * 0.06, 0.35, ease.outBack);
      drawHead(ctx, k, x, y + (1 - intro) * 100, { open: Math.abs(Math.sin(t * 10 + i)), scale: 1.1 });
    });
    bigWord(ctx, `Round ${this.round}`, W / 2, 96, t, { size: 32, color: P.white, shadow: P.pink0 });
    text(ctx, `Level ${this.round} everywhere`, W / 2, 132, { size: 8, color: P.grape, alpha: seg(t, 0.3, 0.3) });
    if (this.api.run) drawHud(ctx, { t, label: `Round ${this.round}`, lives: this.api.run.lives, lostIdx: this.lostLife ? this.api.run.lives : -1, lostK: seg(t, 0.1, 0.9) });
    this.wonka.draw(ctx);
  }
}
