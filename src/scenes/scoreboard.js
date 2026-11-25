// Wonka beside his scoreboard. Shows best levels (from the menu) or how far
// you got in each game this Grand tour, with a reaction line.
import { P } from '../palette.js';
import { W, H, rect, text, seg, ease, stripeRect, Particles } from '../engine.js';
import { drawWonka } from '../kids.js';
import { drawHead } from '../faces.js';
import { drawSlots, drawBubble } from '../ui.js';
import { sfx, playMusic } from '../audio.js';
import { getBest, GAME_IDS, MAX_LEVEL } from '../save.js';
import { scoreQuip } from '../quips.js';
import { CANDY } from '../palette.js';
import { FULL_NAMES } from '../names.js';


export class ScoreboardScene {
  constructor(api, { tour = false, cleared = false } = {}) {
    this.api = api;
    this.t = 0;
    this.tour = tour;
    this.cleared = cleared;
    this.pausable = true;
    this.scores = Object.fromEntries(GAME_IDS.map((id) => [id, tour ? (api.run?.results[id] || 0) : getBest(id)]));
    this.total = Object.values(this.scores).reduce((a, b) => a + b, 0);
    this.line = cleared ? 'Every last level! I have a little surprise...' : scoreQuip(this.total, GAME_IDS.length * MAX_LEVEL);
    this.shown = 0;
    this.parts = new Particles();
    playMusic(cleared ? 'celebrate' : 'menu');
    sfx('pop');
  }
  update(dt) {
    this.t += dt;
    this.parts.update(dt);
    // tally: gobstoppers pop in one by one
    const n = Math.floor(Math.max(0, this.t - 0.5) / 0.12);
    if (n > this.shown && this.shown < this.total) { this.shown++; sfx('ping', this.shown); }
    if (this.cleared && Math.random() < dt * 20) this.parts.add({ x: Math.random() * W, y: -4, vx: (Math.random() - 0.5) * 30, vy: 40 + Math.random() * 40, g: 30, drag: 0, life: 4, size: 2, color: CANDY[Math.floor(Math.random() * CANDY.length)], shrink: false });
  }
  onDown() {
    if (this.t < 1) return;
    sfx('tap');
    if (this.cleared) this.api.go('ending', {});
    else this.api.toMenu();
  }
  draw(ctx) {
    const t = this.t;
    // plum velvet curtains
    for (let x = 0; x < W; x += 16) { rect(ctx, x, 0, 8, H, P.plum1); rect(ctx, x + 8, 0, 8, H, P.plum0); }
    for (let x = 0; x < W; x += 16) rect(ctx, x + 2, 0, 2, H, P.plum2);
    stripeRect(ctx, 0, 0, W, 10, P.gold1, P.gold2, 4, t * 10);
    rect(ctx, 0, 236, W, 34, P.choc2); rect(ctx, 0, 236, W, 2, P.choc4);

    // the board
    const bx = 176, by = 26, bw = 290, bh = 200;
    const k = seg(t, 0, 0.35, ease.outBack);
    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2); ctx.scale(k, k); ctx.translate(-(bx + bw / 2), -(by + bh / 2));
    rect(ctx, bx - 4, by - 4, bw + 8, bh + 8, P.ink);
    rect(ctx, bx - 2, by - 2, bw + 4, bh + 4, P.gold1);
    rect(ctx, bx, by, bw, bh, P.lilac4);
    rect(ctx, bx, by, bw, 24, P.pink1);
    text(ctx, this.tour ? 'Grand tour' : 'Best levels', bx + bw / 2, by + 13, { size: 16, color: P.white, outline: P.pink0, ow: 1 });
    let left = this.shown;
    GAME_IDS.forEach((id, i) => {
      const y = by + 44 + i * 30;
      rect(ctx, bx + 8, y - 13, bw - 16, 26, i % 2 ? P.pink4 : P.lilac3);
      drawHead(ctx, id, bx + 26, y, { scale: 0.55, open: this.scores[id] >= MAX_LEVEL ? Math.abs(Math.sin(t * 8 + i)) * 0.5 : 0 });
      text(ctx, FULL_NAMES[id], bx + 46, y + 1, { size: 8, align: 'left', color: P.choc1 });
      const s = Math.min(this.scores[id], left);
      left -= this.scores[id];
      drawSlots(ctx, bx + 238, y, Math.max(0, s), { r: 6, gap: 3, t });
    });
    ctx.restore();

    const talking = t > 0.6 && t < 0.6 + this.line.length / 28;
    drawWonka(ctx, 86, 248, { t, pose: this.cleared ? 'cheer' : talking ? 'talk' : 'present', open: talking ? Math.abs(Math.sin(t * 20)) * 0.7 : 0, scale: 1.7 });
    if (t > 0.6) drawBubble(ctx, 14, 92, this.line, { shown: Math.floor((t - 0.6) * 28), maxChars: 18, tailX: 70 });
    this.parts.draw(ctx);
    if (t > 1.5 && Math.floor(t * 2) % 2 === 0) text(ctx, 'Tap to continue', W / 2 + 80, 254, { size: 8, color: P.cream });
  }
}
