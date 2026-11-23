import { P } from '../palette.js';
import { W, text, seg, ease, rect, stripeRect } from '../engine.js';
import { drawChocRoom } from '../chocroom.js';
import { drawHead, KIDS } from '../faces.js';

export class GameOverScene {
  constructor(api, { score = 0 }) {
    this.api = api; this.score = score; this.t = 0;
    this.newBest = score > 0 && score >= api.best;
  }
  update(dt) { this.t += dt; }
  onDown() { if (this.t > 0.9) this.api.startRun(); }
  draw(ctx) {
    const t = this.t;
    drawChocRoom(ctx, t, { dim: 0.55 });
    const k = seg(t, 0, 0.4, ease.outBack);
    // candy plate
    ctx.save();
    ctx.translate(W / 2, 100);
    ctx.scale(k, k);
    rect(ctx, -134, -74, 268, 148, P.ink);
    stripeRect(ctx, -131, -71, 262, 142, P.pink1, P.white, 5, t * 15);
    rect(ctx, -122, -62, 244, 124, P.cream);
    text(ctx, 'Game over', 0, -38, { size: 24, color: P.pink1, outline: P.ink, ow: 2, shadow: P.pink0, sh: 3 });
    text(ctx, String(this.score), 0, 4, { size: 32, color: P.lemon1, outline: P.ink, ow: 2, shadow: P.choc2, sh: 3 });
    text(ctx, this.newBest ? 'New best!' : `Best ${this.api.best}`, 0, 40, {
      size: 8, color: this.newBest ? P.pink0 : P.choc2,
    });
    ctx.restore();
    KIDS.forEach((kid, i) => {
      const x = 72 + i * 84;
      const y = 214 + Math.sin(t * 3 + i) * 2;
      drawHead(ctx, kid, x, y, { scared: true, open: 0.3 + Math.abs(Math.sin(t * 9 + i * 1.3)) * 0.5 });
    });
    if (t > 0.9 && Math.floor(t * 2.2) % 2 === 0) {
      text(ctx, 'Tap to play again', W / 2, 252, { size: 8, color: P.white, outline: P.ink, ow: 1 });
    }
  }
}
