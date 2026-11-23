// Single-game mode: all five levels cleared.
import { P, CANDY } from '../palette.js';
import { W, H, rect, bigWord, seg, ease, Particles, text } from '../engine.js';
import { drawKid } from '../kids.js';
import { drawSlots, WonkaPop } from '../ui.js';
import { sfx, playMusic } from '../audio.js';
import { GAMES } from '../games/index.js';

export class CelebrateScene {
  constructor(api, { id }) {
    this.api = api; this.id = id; this.t = 0; this.pausable = true;
    this.kid = GAMES[id].meta.kid;
    this.parts = new Particles();
    this.popped = 0;
    playMusic('celebrate');
    this.wonka = null;
  }
  update(dt) {
    this.t += dt;
    this.parts.update(dt);
    const n = Math.min(5, Math.floor(Math.max(0, this.t - 0.6) / 0.25));
    if (n > this.popped) {
      this.popped = n;
      sfx('gobstopper');
      this.parts.burst(W / 2 - 60 + (n - 1) * 30, 200, 14, { colors: CANDY, speed: [40, 140], g: 160 });
    }
    if (Math.random() < dt * 30) this.parts.add({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 40, vy: 50 + Math.random() * 50, g: 30, drag: 0, life: 5, size: 2 + Math.round(Math.random()), color: CANDY[Math.floor(Math.random() * CANDY.length)], shrink: false });
    if (this.t > 2.2 && !this.wonka) this.wonka = new WonkaPop('All five! Nobody is more surprised than me.', { dur: 3.2, side: 'right' });
    this.wonka?.update(dt);
  }
  onDown() { if (this.t > 1.5) { sfx('tap'); this.api.toMenu(); } }
  draw(ctx) {
    const t = this.t;
    ctx.fillStyle = P.pink3;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, 140);
    ctx.rotate(t * 0.5);
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = i % 2 ? P.pink4 : P.lilac3;
      ctx.beginPath(); ctx.moveTo(0, 0);
      const a0 = (i / 18) * Math.PI * 2, a1 = ((i + 1) / 18) * Math.PI * 2;
      ctx.lineTo(Math.cos(a0) * 400, Math.sin(a0) * 400); ctx.lineTo(Math.cos(a1) * 400, Math.sin(a1) * 400); ctx.fill();
    }
    ctx.restore();
    const k = seg(t, 0.1, 0.5, ease.outBack);
    drawKid(ctx, this.kid, W / 2 - 80, 182, { pose: 'cheer', t, open: Math.abs(Math.sin(t * 12)), scale: 1.6 * k + 0.01 });
    bigWord(ctx, 'All five!', W / 2, 40, t, { size: 32, color: P.white, shadow: P.pink0 });
    rect(ctx, W / 2 - 80, 190, 160, 24, 'rgba(58,20,40,0.5)');
    drawSlots(ctx, W / 2, 202, this.popped, { r: 8, gap: 8, t });
    this.parts.draw(ctx);
    this.wonka?.draw(ctx);
    if (t > 2 && Math.floor(t * 2) % 2 === 0) text(ctx, 'Tap to continue', 100, 254, { size: 8, color: P.grape });
  }
}
