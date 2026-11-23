// Splash: the factory exterior. Tap the gates to go in.
import { P } from '../palette.js';
import { W, H, seg, ease, text, rect } from '../engine.js';
import { drawFactory, GATE } from '../factory.js';
import { drawLogo } from './menu.js';
import { hit } from '../ui.js';
import { sfx, playMusic } from '../audio.js';

export class SplashScene {
  constructor(api) {
    this.api = api; this.t = 0; this.openT = -1; this.jig = 0;
    playMusic('menu');
  }
  update(dt) {
    this.t += dt;
    this.jig = Math.max(0, this.jig - dt * 4);
    if (this.openT >= 0) {
      this.openT += dt;
      if (this.openT > 1.3 && !this.left) { this.left = true; this.api.go('menu'); }
    }
  }
  onDown(x, y) {
    if (this.openT >= 0 || this.t < 0.3) return;
    const g = { x: GATE.x - 24, y: GATE.y - 20, w: GATE.w + 48, h: GATE.h + 40 };
    if (hit(g, x, y)) { this.openT = 0; sfx('gate'); playMusic('menu'); }
    else { this.jig = 1; sfx('knock'); }
  }
  draw(ctx) {
    const t = this.t;
    const open = this.openT >= 0 ? seg(this.openT, 0, 0.8, ease.inOutQuad) : 0;
    // push in toward the gates as they open
    const z = 1 + seg(this.openT, 0.5, 0.8, ease.inQuad) * 2.2;
    ctx.save();
    ctx.translate(W / 2, GATE.y + GATE.h / 2);
    ctx.scale(z, z);
    ctx.translate(-W / 2, -(GATE.y + GATE.h / 2));
    drawFactory(ctx, t, { gateOpen: open, hint: this.openT < 0, jiggle: this.jig * 2 });
    ctx.restore();
    if (this.openT < 0) {
      drawLogo(ctx, W / 2, 40, t, 32);
    }
    if (this.openT > 0.9) {
      ctx.globalAlpha = seg(this.openT, 0.9, 0.4);
      rect(ctx, 0, 0, W, H, P.cream);
      ctx.globalAlpha = 1;
    }
    if (this.openT < 0 && t > 1 && Math.floor(t * 2) % 2 === 0) {
      text(ctx, 'Tap the gates', W / 2, 252, { size: 8, color: P.grape, outline: P.white, ow: 1 });
    }
  }
}
