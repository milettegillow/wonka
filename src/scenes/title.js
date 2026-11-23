import { P } from '../palette.js';
import { W, H, text, stripePattern, FONT, seg, ease } from '../engine.js';
import { drawChocRoom, drawBoat, RIVER_TOP } from '../chocroom.js';

const LETTER_COLS = [
  [P.pink1, P.pink3], [P.lemon1, P.lemon3], [P.mint1, P.mint3], [P.lilac1, P.lilac3],
];

// Chunky candy pixel logo, letters bouncing in a wave.
export function drawLogo(ctx, cx, cy, t, size = 32) {
  const word = 'WonkaWare';
  const step = size;
  const x0 = cx - (word.length * step) / 2 + step / 2;
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const intro = seg(t, i * 0.06, 0.35, ease.outBack);
    const x = Math.round(x0 + i * step);
    const y = Math.round(cy + Math.sin(t * 4 - i * 0.6) * 3 - (1 - intro) * 80);
    const [c1, c2] = LETTER_COLS[i % LETTER_COLS.length];
    // extruded candy depth
    for (let d = 7; d >= 1; d--) {
      ctx.fillStyle = d > 5 ? P.ink : P.choc2;
      for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) ctx.fillText(ch, x + ox, y + oy + d);
    }
    ctx.fillStyle = P.ink;
    for (const [ox, oy] of [[-3, 0], [3, 0], [0, -3], [0, 3], [-2, -2], [2, 2], [-2, 2], [2, -2]]) ctx.fillText(ch, x + ox, y + oy);
    ctx.fillStyle = stripePattern(ctx, c1, c2, 3);
    ctx.fillText(ch, x, y);
    // glossy highlight
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - size / 2, y - size / 2, size, Math.round(size * 0.22));
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(ch, x, y);
    ctx.restore();
  }
  ctx.restore();
}

export class TitleScene {
  constructor(api) { this.api = api; this.t = 0; }
  update(dt) { this.t += dt; }
  onDown() { if (this.t > 0.4) this.api.startRun(); }
  draw(ctx) {
    const t = this.t;
    drawChocRoom(ctx, t);
    // boat full of kids drifting past
    const bx = ((t * 34) % (W + 260)) - 130;
    drawBoat(ctx, bx, RIVER_TOP + 14, t, { kids: ['charlie', 'augustus', 'violet', 'veruca', 'mike'], len: 130, chatter: true, headScale: 0.7 });
    // logo plate
    drawLogo(ctx, W / 2, 62, t, 40);
    if (Math.floor(t * 2.2) % 2 === 0 || t < 0.6) {
      text(ctx, 'Tap to start', W / 2, 122, { size: 16, color: P.white, outline: P.ink, ow: 2, shadow: P.pink0, sh: 2 });
    }
    if (this.api.best > 0) {
      text(ctx, `Best ${this.api.best}`, W / 2, 148, { size: 8, color: P.lemon2, outline: P.ink, ow: 1 });
    }
  }
}
