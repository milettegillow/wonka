// Main menu: the Chocolate Room from above. Tap a kid to play their game,
// the boat for the Grand tour, Wonka for the scoreboard.
import { P } from '../palette.js';
import { W, H, rect, ellipse, circle, ringPx, text, stripePattern, FONT, seg, ease, sparkle, input } from '../engine.js';
import { drawKid, drawOompa } from '../kids.js';
import { drawBoat } from '../chocroom.js';
import { drawSlots, drawBubble, hit } from '../ui.js';
import { sfx, playMusic } from '../audio.js';
import { getBest, GAME_IDS } from '../save.js';
import { helloQuip } from '../quips.js';
import { drawHead } from '../faces.js';

const LETTER_COLS = [
  [P.pink1, P.pink3], [P.lilac1, P.lilac3], [P.mint1, P.mint3], [P.red2, P.pink4],
];
// Chunky candy pixel logo, letters bouncing in a wave.
export function drawLogo(ctx, cx, cy, t, size = 32) {
  const word = 'WonkaWare';
  const step = size;
  const x0 = cx - (word.length * step) / 2 + step / 2;
  const o = Math.max(1, Math.round(size / 12));
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const ring = [[-o, 0], [o, 0], [0, -o], [0, o], [-o, -o], [o, o], [-o, o], [o, -o]];
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const intro = seg(t, i * 0.06, 0.35, ease.outBack);
    const x = Math.round(x0 + i * step);
    const y = Math.round(cy + Math.sin(t * 4 - i * 0.6) * (size / 12) - (1 - intro) * 80);
    const [c1, c2] = LETTER_COLS[i % LETTER_COLS.length];
    for (let d = Math.round(size / 5); d >= 1; d--) {
      ctx.fillStyle = d > size / 7 ? P.ink : P.choc2;
      for (const [ox, oy] of ring) ctx.fillText(ch, x + ox, y + oy + d);
    }
    ctx.fillStyle = P.ink;
    for (const [ox, oy] of ring) ctx.fillText(ch, x + ox, y + oy);
    ctx.fillStyle = stripePattern(ctx, c1, c2, Math.max(2, Math.round(size / 10)));
    ctx.fillText(ch, x, y);
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

const RIVER_T = 114, RIVER_B = 166;
const SPOTS = {
  charlie: { x: 64, y: 98 },
  violet: { x: 160, y: 98 },
  veruca: { x: 256, y: 98 },
  mike: { x: 64, y: 244 },
  augustus: { x: 170, y: 244 },
};
const WONKA = { x: 316, y: 248 };
const BOARD = { x: 352, y: 176, w: 118, h: 70 };
const PIPES = [[104, 142], [170, 130], [390, 146]];

let bg = null;
function buildBg() {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const e = (cx, cy, rx, ry, col) => {
    g.fillStyle = col;
    for (let dy = -ry; dy <= ry; dy++) { const k = 1 - (dy / (ry + 0.5)) ** 2; if (k <= 0) continue; const hw = Math.round(rx * Math.sqrt(k)); g.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, hw * 2 + 1, 1); }
  };
  // meadow, mown in stripes
  r(0, 0, W, H, P.grass1);
  for (let x = 0; x < W; x += 24) r(x, 0, 12, H, P.grass2);
  // river with wavy banks
  for (let x = 0; x < W; x++) {
    const t1 = Math.round(RIVER_T + Math.sin(x * 0.04) * 3 + Math.sin(x * 0.13) * 1);
    const b1 = Math.round(RIVER_B + Math.sin(x * 0.035 + 2) * 3 + Math.sin(x * 0.11) * 1);
    r(x, t1 - 2, 1, 2, P.grass0); r(x, t1, 1, b1 - t1, P.choc2); r(x, t1, 1, 2, P.choc1); r(x, b1, 1, 2, P.grass0);
  }
  // waterfall pool on the left
  e(14, 140, 26, 30, P.choc1); e(14, 140, 22, 26, P.choc3);
  // flowers
  for (let i = 0; i < 90; i++) {
    const x = (i * 97 + 11) % W, y = (i * 61 + 7) % H;
    if (y > RIVER_T - 6 && y < RIVER_B + 6) continue;
    const col = [P.pink2, P.cream, P.lilac3, P.lemon1][i % 4];
    r(x, y, 3, 3, col); r(x + 1, y + 1, 1, 1, P.white);
  }
  // candy trees from above
  const tree = (x, y, rr, c1, c2) => {
    e(x + 3, y + 4, rr, rr, 'rgba(40,80,60,0.3)');
    e(x, y, rr + 1, rr + 1, P.ink); e(x, y, rr, rr, c1);
    for (let a = 0; a < 6; a++) { const ang = (a * Math.PI) / 3; e(x + Math.cos(ang) * rr * 0.55, y + Math.sin(ang) * rr * 0.55, 2, 2, c2); }
    e(x - 3, y - 3, 3, 2, P.white);
  };
  tree(118, 22, 12, P.pink1, P.white); tree(214, 14, 10, P.lilac1, P.pink3); tree(30, 196, 11, P.mint1, P.white);
  tree(244, 196, 9, P.red2, P.cream); tree(300, 34, 9, P.mint1, P.pink2); tree(120, 214, 8, P.lilac2, P.white);
  tree(462, 200, 10, P.pink2, P.white); tree(20, 20, 9, P.lilac1, P.mint3);
  return c;
}

export class MenuScene {
  constructor(api) {
    this.api = api;
    this.t = 0;
    this.pausable = true;
    this.picked = null;
    this.pickT = 0;
    this.hover = null;
    this.hello = helloQuip();
    playMusic('menu');
  }
  targets() {
    const list = GAME_IDS.map((id) => {
      const s = SPOTS[id];
      const wide = id === 'augustus' ? 34 : 22;
      return { id, x: s.x - wide, y: s.y - 70, w: wide * 2, h: 82 };
    });
    list.push({ id: 'wonka', x: WONKA.x - 22, y: WONKA.y - 86, w: 44, h: 90 });
    list.push({ id: 'board', ...BOARD });
    list.push({ id: 'tour', x: this.boatX() - 56, y: RIVER_T - 6, w: 112, h: RIVER_B - RIVER_T + 30 });
    return list;
  }
  boatX() { return 244 + Math.sin(this.t * 0.4) * 8; }
  update(dt) {
    this.t += dt;
    if (input.type === 'mouse' && input.hover) {
      const h = this.targets().find((r) => hit(r, input.x, input.y));
      this.hover = h ? h.id : null;
    } else this.hover = null;
    if (this.picked) {
      this.pickT += dt;
      if (this.pickT > 0.55 && !this.left) {
        this.left = true;
        const id = this.picked;
        if (id === 'tour') this.api.startTour();
        else if (id === 'wonka' || id === 'board') this.api.go('scoreboard', {});
        else this.api.startSingle(id);
      }
    }
  }
  onDown(x, y) {
    if (this.picked || this.t < 0.25) return;
    const h = this.targets().find((r) => hit(r, x, y));
    if (!h) return;
    this.picked = h.id;
    this.pickT = 0;
    sfx(h.id === 'tour' ? 'boat' : 'tap');
    if (h.id !== 'tour' && h.id !== 'wonka' && h.id !== 'board') sfx('cheer');
  }
  draw(ctx) {
    if (!bg) bg = buildBg();
    ctx.drawImage(bg, 0, 0);
    const t = this.t;
    // river flow + waterfall churn
    for (let i = 0; i < 40; i++) {
      const lane = (i * 13) % (RIVER_B - RIVER_T - 8);
      const x = ((i * 89 + t * (14 + (i % 4) * 5)) % (W + 40)) - 20;
      rect(ctx, x, RIVER_T + 4 + lane, 6 + (i % 3) * 3, 1, i % 3 ? P.choc3 : P.choc4);
    }
    for (let i = 0; i < 14; i++) {
      const a = i * 0.9 + t * 2;
      const rr = 4 + ((i * 5 + t * 20) % 18);
      ellipse(ctx, 14 + Math.cos(a) * rr, 140 + Math.sin(a) * rr, 3, 2, i % 2 ? P.caramel2 : P.cream2);
    }
    // glass pipes seen from above
    for (const [px, py] of PIPES) {
      const rr = 8 + ((t * 6 + px) % 8);
      ringPx(ctx, px, py, rr, P.choc4);
      circle(ctx, px, py, 8, P.glassEdge);
      circle(ctx, px, py, 6, P.choc0);
      for (let k = 0; k < 4; k++) { const a = -t * 5 + k * 1.6; rect(ctx, px + Math.cos(a) * 3, py + Math.sin(a) * 3, 1, 1, P.choc3); }
      rect(ctx, px - 5, py - 6, 3, 1, P.white);
    }

    // boat = Grand tour
    const bx = this.boatX(), by = 150;
    const tourHot = this.hover === 'tour' || this.picked === 'tour';
    drawBoat(ctx, bx + (this.picked === 'tour' ? this.pickT * 200 : 0), by, t, { kids: ['charlie', 'violet', 'veruca', 'mike', 'augustus'], len: 110, headScale: 0.55, chatter: true });
    const sy = RIVER_B + 16 + Math.sin(t * 3) * 1 - (tourHot ? 2 : 0);
    rect(ctx, bx - 1, sy - 16, 2, 8, P.ink);
    rect(ctx, bx - 44, sy - 9, 88, 20, P.ink);
    rect(ctx, bx - 42, sy - 7, 84, 16, tourHot ? P.pink1 : P.pink2);
    text(ctx, 'Grand tour', bx, sy + 1, { size: 8, color: P.white, outline: P.pink0, ow: 1 });

    // kids around the room
    for (const id of GAME_IDS) {
      const s = SPOTS[id];
      const sel = this.picked === id;
      const hot = this.hover === id || sel;
      const jump = sel ? Math.abs(Math.sin(this.pickT * 12)) * 8 : hot ? Math.abs(Math.sin(t * 8)) * 3 : 0;
      ellipse(ctx, s.x, s.y + 2, id === 'augustus' ? 26 : 13, 3, 'rgba(40,80,60,0.35)');
      const chatter = Math.max(0, Math.sin(t * 9 + s.x)) * (Math.sin(t * 0.7 + s.x) > 0.6 ? 0.6 : 0);
      drawKid(ctx, id, s.x, s.y - jump, {
        pose: sel ? 'cheer' : id === 'veruca' && Math.sin(t * 0.5) > 0.7 ? 'tantrum' : 'idle', t: t + s.x,
        open: sel ? Math.abs(Math.sin(this.pickT * 16)) : hot ? 0.3 + Math.abs(Math.sin(t * 10)) * 0.4 : id === 'violet' ? Math.abs(Math.sin(t * 6)) * 0.35 : chatter,
      });
      if (hot) sparkle(ctx, s.x + 18, s.y - 60, 2 + Math.round(Math.abs(Math.sin(t * 12)) * 2), P.white);
      // gobstopper sockets
      rect(ctx, s.x - 24, s.y + 4, 48, 11, 'rgba(58,20,40,0.45)');
      drawSlots(ctx, s.x, s.y + 9, getBest(id), { r: 3, gap: 2, t });
    }

    // scoreboard + Wonka
    const b = BOARD;
    const boardHot = this.hover === 'board' || this.hover === 'wonka';
    rect(ctx, b.x + 10, b.y + b.h - 4, 4, 16, P.wood0); rect(ctx, b.x + b.w - 14, b.y + b.h - 4, 4, 16, P.wood0);
    rect(ctx, b.x - 2, b.y - 2, b.w + 4, b.h + 4, P.ink);
    rect(ctx, b.x, b.y, b.w, b.h, boardHot ? P.plum2 : P.plum1);
    rect(ctx, b.x + 3, b.y + 3, b.w - 6, b.h - 6, P.plum0);
    rect(ctx, b.x, b.y, b.w, 2, P.gold1);
    text(ctx, 'Scores', b.x + b.w / 2, b.y + 11, { size: 8, color: P.gold2 });
    GAME_IDS.forEach((id, i) => {
      const yy = b.y + 22 + i * 9;
      drawHead(ctx, id, b.x + 16, yy, { scale: 0.22 });
      drawSlots(ctx, b.x + 70, yy, getBest(id), { r: 2, gap: 2, t });
    });
    const wsel = this.picked === 'wonka' || this.picked === 'board';
    drawKid(ctx, 'wonka', WONKA.x, WONKA.y, {
      t, pose: wsel ? 'cheer' : this.t < 3 ? 'talk' : 'present',
      open: this.t > 0.4 && this.t < 3 ? Math.abs(Math.sin(t * 20)) * 0.6 : boardHot ? 0.3 : 0,
    });
    if (this.t > 0.4 && this.t < 4.2) {
      drawBubble(ctx, W - 6, 170, this.hello, { align: 'right', shown: Math.floor((this.t - 0.4) * 30), maxChars: 18, tailX: WONKA.x + 10, tailDir: -1 });
    }

    drawLogo(ctx, 402, 22, t, 16);
    // a couple of busy Oompa-Loompas on the far bank
    drawOompa(ctx, 420 + Math.sin(t * 0.6) * 24, 96, t, { pose: 'walk', flip: Math.cos(t * 0.6) < 0 });
    drawOompa(ctx, 466, 98, t, { pose: 'cheer', phase: 2 });
    if (this.picked && this.pickT > 0.3) {
      ctx.globalAlpha = seg(this.pickT, 0.3, 0.25);
      rect(ctx, 0, 0, W, H, P.cream);
      ctx.globalAlpha = 1;
    }
  }
}
