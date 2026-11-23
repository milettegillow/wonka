// Grand tour cleared: Wonka hands over the whole factory. Fireworks, and the
// great glass lift bursts out through the roof.
import { P, CANDY } from '../palette.js';
import { W, H, rect, bigWord, seg, ease, Particles, text, shake } from '../engine.js';
import { drawFactory } from '../factory.js';
import { drawWonka } from '../kids.js';
import { drawHead } from '../faces.js';
import { drawBubble } from '../ui.js';
import { sfx, playMusic } from '../audio.js';
import { ENDING_LINES } from '../quips.js';

export class EndingScene {
  constructor(api) {
    this.api = api; this.t = 0; this.pausable = true;
    this.parts = new Particles();
    this.burst = false;
    playMusic('celebrate', { restart: true });
  }
  update(dt) {
    this.t += dt;
    this.parts.update(dt);
    if (this.t > 1.2 && !this.burst) {
      this.burst = true;
      shake(6, 0.5);
      sfx('whoosh');
      this.parts.burst(W / 2, 46, 40, { colors: [P.pink3, P.lilac3, P.white, P.gold2], speed: [60, 200], g: 200, life: [0.6, 1.2], size: [2, 4] });
    }
    if (this.t > 1.2 && Math.random() < dt * 25) this.parts.add({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 40, vy: 40 + Math.random() * 40, g: 25, drag: 0, life: 6, size: 2, color: CANDY[Math.floor(Math.random() * CANDY.length)], shrink: false });
    if (Math.floor(this.t * 0.45) !== Math.floor((this.t - dt) * 0.45)) sfx('sparkle');
  }
  onDown() { if (this.t > 3) { sfx('tap'); this.api.toMenu(); } }
  draw(ctx) {
    const t = this.t;
    drawFactory(ctx, t, { night: true, fireworks: true, gateOpen: 1 });
    // the great glass lift rising out of the roof
    const rise = seg(t, 1.2, 4, ease.outQuad);
    const ly = 92 - rise * 50 + Math.sin(t * 2) * 2;
    const lx = W / 2 + Math.sin(t * 0.7) * 20 * rise;
    if (t > 1.1) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      rect(ctx, lx - 26, ly - 30, 52, 46, P.ink);
      rect(ctx, lx - 24, ly - 28, 48, 42, 'rgba(230,220,255,0.55)');
      ctx.globalAlpha = 1;
      drawHead(ctx, 'charlie', lx - 10, ly - 6, { open: Math.abs(Math.sin(t * 9)), scale: 0.6 });
      drawHead(ctx, 'wonka', lx + 11, ly - 8, { open: Math.abs(Math.sin(t * 7 + 1)), scale: 0.6 });
      rect(ctx, lx - 24, ly + 4, 48, 2, P.glassEdge);
      rect(ctx, lx - 20, ly - 26, 2, 16, P.white);
      ctx.restore();
    }
    const k = seg(t, 2.0, 0.5, ease.outBack);
    if (k > 0) {
      ctx.save();
      ctx.translate(W / 2, 140); ctx.scale(k, k);
      bigWord(ctx, 'The factory', 0, -14, t - 2, { size: 24, color: P.gold2, shadow: P.plum1 });
      bigWord(ctx, 'is yours!', 0, 18, t - 2.1, { size: 24, color: P.pink2, shadow: P.plum1 });
      ctx.restore();
    }
    drawWonka(ctx, 400, 258, { t, pose: 'cheer', open: Math.abs(Math.sin(t * 14)) * 0.7, flip: true, scale: 1.4 });
    if (t > 2.6) {
      const idx = Math.min(ENDING_LINES.length - 1, Math.floor((t - 2.6) / 3.2));
      const lt = (t - 2.6) - idx * 3.2;
      drawBubble(ctx, 372, 236, ENDING_LINES[idx], { align: 'right', shown: Math.floor(lt * 28), maxChars: 18 });
    }
    this.parts.draw(ctx);
    if (t > 3 && Math.floor(t * 2) % 2 === 0) text(ctx, 'Tap to continue', 120, 254, { size: 8, color: P.cream, outline: P.ink, ow: 1 });
  }
}
