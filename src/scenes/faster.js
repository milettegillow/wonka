// "Faster!" interstitial between loops.
import { P } from '../palette.js';
import { W, H, bigWord, seg, ease } from '../engine.js';
import { drawHead, KIDS } from '../faces.js';
import { drawHud } from './transition.js';

export class FasterScene {
  constructor(api, data = {}) {
    this.api = api; this.t = 0; this.dur = 1.7; this.data = data;
  }
  update(dt) {
    this.t += dt;
    if (this.t >= this.dur && !this.left) {
      this.left = true;
      if (this.api.debug || !this.api.run) return;
      this.api.go('transition', { next: this.api.ORDER[this.api.run.idx] });
    }
  }
  onDown() {}
  draw(ctx) {
    const t = this.t;
    // spinning candy rays
    ctx.fillStyle = P.pink1;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(t * 1.6);
    const n = 14;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = i % 2 ? P.lemon1 : P.pink2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      ctx.lineTo(Math.cos(a0) * 400, Math.sin(a0) * 400);
      ctx.lineTo(Math.cos(a1) * 400, Math.sin(a1) * 400);
      ctx.fill();
    }
    ctx.restore();
    // kids' heads bounce and yell
    KIDS.forEach((k, i) => {
      const x = 64 + i * 88;
      const y = 214 - Math.abs(Math.sin(t * 7 + i * 0.9)) * 18;
      const intro = seg(t, i * 0.05, 0.3, ease.outBack);
      drawHead(ctx, k, x, y + (1 - intro) * 100, { open: Math.abs(Math.sin(t * 14 + i)), scale: 1.2 });
    });
    const s = 1 + Math.sin(t * 20) * 0.04;
    ctx.save();
    ctx.translate(W / 2, 108);
    ctx.scale(s, s);
    bigWord(ctx, 'Faster!', 0, 0, t, { size: 48, color: P.white, shadow: P.red0 });
    ctx.restore();
    if (this.api.run) drawHud(ctx, this.api.run, t, { lostIdx: this.data.lostLife ? this.api.run.lives : -1, lostK: seg(t, 0.1, 0.8) });
  }
}
