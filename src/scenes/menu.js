// Main menu: the Chocolate Room as a candy land. The five kids ride a giant
// boiled-sweet boat down the chocolate river: tap a kid for their close-up
// card, the hull for the Grand tour, Wonka (or his board) for the scores.
import { P } from '../palette.js';
import { W, H, rect, ellipse, text, stripePattern, stripeRect, FONT, seg, ease, sparkle, input } from '../engine.js';
import { drawKid } from '../kids.js';
import { drawSlots, drawBubble, drawButton, hit } from '../ui.js';
import { sfx, playMusic } from '../audio.js';
import { getBest, GAME_IDS } from '../save.js';
import { helloQuip } from '../quips.js';
import { drawHead } from '../faces.js';
import { GAMES } from '../games/index.js';
import { candyBackground, drawClouds, drawRiverLife, drawWaterfall, drawLollipop, LOLLI } from '../candyland.js';

const GAMES_META = Object.fromEntries(Object.entries(GAMES).map(([id, G]) => [id, G.meta]));

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


/* ------------------------------------------------------------------ layout */
const NAMES = { charlie: 'Charlie', violet: 'Violet', veruca: 'Veruca', mike: 'Mike', augustus: 'Augustus' };
const KID_S = 1.5;                      // kids in the boat, scaled up (nearest-neighbour)
const BOAT = { x: 200, y: 170, hw: 118, h: 34 }; // centre x, deck line y, half-width, hull depth
// Left to right in the boat; Augustus in the middle, drawn first (behind).
const CREW = [
  { id: 'charlie', dx: -94 }, { id: 'violet', dx: -52 }, { id: 'augustus', dx: -4 },
  { id: 'veruca', dx: 48 }, { id: 'mike', dx: 86 },
];
const DRAW_ORDER = ['augustus', 'violet', 'veruca', 'charlie', 'mike'];
const FEET = 22;                        // kid feet sit this far below the deck line (hidden by the hull)
const KC = { w: 110, h: 110, ox: 55, oy: 104 }; // offscreen sprite canvas + origin (feet)

const WONKA = { x: 420, y: 262 };
const BOARD = { x: 368, y: 58, w: 104, h: 76 };
const LOLLIPOPS = [
  { x: 52, y: 266, r: 22, c: 'pink', stick: 18 },
  { x: 352, y: 150, r: 14, c: 'berry' },
  { x: 298, y: 268, r: 16, c: 'lilac', stick: 22 },
  { x: 468, y: 266, r: 13, c: 'blue', stick: 18 },
];
// Keep the busy stuff away from the boat and kids.
const calm = (x, y) => x > BOAT.x - BOAT.hw - 20 && x < BOAT.x + BOAT.hw + 20 && y > 90 && y < 215;

const CARD = { x: 76, y: 32, w: 328, h: 208 };
const CLOSE = { x: CARD.x + CARD.w - 26, y: CARD.y + 8, w: 18, h: 18 };
const PLAY = { x: CARD.x + 176, y: CARD.y + 146, w: 128, h: 34 };

/* ---------------------------------------------------------- kid sprites */
const sprites = {};
function kidSprite(id) {
  if (!sprites[id]) {
    const c = document.createElement('canvas');
    c.width = KC.w; c.height = KC.h;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false;
    sprites[id] = { c, g };
  }
  return sprites[id];
}

/* --------------------------------------------------------------- the boat */
const hullHalf = (yy) => Math.round(BOAT.hw * (1 - Math.pow((yy + 2) / (BOAT.h + 2), 2.4) * 0.42));
// Clip to everything above the deck plus the hull's own outline, so legs never
// poke out below the boat.
function clipToBoat(ctx, cx, top) {
  ctx.beginPath();
  ctx.rect(0, 0, W, top + 2);
  for (let yy = 2; yy <= BOAT.h; yy++) { const w = hullHalf(yy); ctx.rect(cx - w, top + yy, w * 2, 1); }
  ctx.clip();
}
const PROW = { pink: [P.pink1, P.white, P.pink2, P.white] };
function drawHull(ctx, cx, top, t, hot) {
  const { hw, h } = BOAT;
  for (let yy = -2; yy <= h; yy++) {
    const k = (yy + 2) / (h + 2);
    const w = Math.round(hw * (1 - Math.pow(k, 2.4) * 0.42));
    rect(ctx, cx - w - 1, top + yy, w * 2 + 2, 1, P.ink);
    const col = yy < 1 ? P.pink4 : yy < 3 ? P.pink3 : yy < 9 ? P.pink2 : yy < h - 7 ? P.pink1 : P.pink0;
    rect(ctx, cx - w, top + yy, w * 2, 1, col);
  }
  rect(ctx, cx - hw, top + 3, hw * 2, 1, P.ink); // rim edge
  // boiled-sweet swirl stripes, glassy
  ctx.save();
  ctx.beginPath();
  for (let yy = 4; yy <= h; yy++) {
    const k = (yy + 2) / (h + 2);
    const w = Math.round(hw * (1 - Math.pow(k, 2.4) * 0.42));
    ctx.rect(cx - w + 1, top + yy, w * 2 - 2, 1);
  }
  ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = -12; i < 14; i++) {
    const x0 = cx + i * 18;
    for (let yy = 4; yy <= h; yy++) ctx.fillRect(x0 + Math.round(yy * 0.6), top + yy, 6, 1);
  }
  ctx.restore();
  // shine
  rect(ctx, cx - hw + 14, top + 6, hw * 0.7, 2, 'rgba(255,255,255,0.75)');
  rect(ctx, cx - hw + 10, top + 10, 8, 1, 'rgba(255,255,255,0.6)');
  rect(ctx, cx + 30, top + 7, hw * 0.4, 1, 'rgba(255,255,255,0.45)');
  // swirly prow and stern
  for (const s of [-1, 1]) {
    const px = cx + s * (hw + 4), py = top - 6;
    rect(ctx, px - 3, py, 6, 12, P.ink); rect(ctx, px - 2, py, 4, 12, P.pink1);
    drawLollipop(ctx, px, py + 2, 9, PROW.pink, t, { stick: -9, sparkle: false });
  }
  // the Grand tour label
  const pulse = hot ? 1 : Math.sin(t * 3) > 0.92 ? 1 : 0;
  text(ctx, 'Grand tour', cx, top + 19 - pulse, { size: 12, color: hot ? P.pink4 : P.white, outline: P.pink0, ow: 2, shadow: P.raspberry, sh: 2 });
  for (const s of [-1, 1]) sparkle(ctx, cx + s * 74, top + 18, Math.round(2 + Math.abs(Math.sin(t * 4 + s)) * 2), P.white);
}

/* ------------------------------------------------------------------- scene */
export class MenuScene {
  constructor(api) {
    this.api = api;
    this.t = 0;
    this.pausable = true;
    this.hover = null;
    this.hello = helloQuip();
    this.card = null;     // { kind: 'kid'|'scores', id, t, closeT }
    this.hop = {};        // kid id -> seconds since hop started
    this.leaving = null;  // { kind: 'play'|'tour', id, t }
    this.kidPos = {};     // last drawn screen position of each kid's feet
    playMusic('menu');
  }

  boatY() { return BOAT.y + Math.round(Math.sin(this.t * 1.8) * 1.5); }
  boatX() { return BOAT.x + (this.leaving?.kind === 'tour' ? this.leaving.t * 220 : 0); }

  // Which kid's pixels are under (x, y)? Front-most first.
  kidAt(x, y) {
    if (y > this.boatY() + 4) return null; // below the rim is the hull
    for (let i = DRAW_ORDER.length - 1; i >= 0; i--) {
      const id = DRAW_ORDER[i];
      const p = this.kidPos[id];
      if (!p) continue;
      const lx = Math.floor((x - p.x) / KID_S + KC.ox), ly = Math.floor((y - p.y) / KID_S + KC.oy);
      if (lx < 1 || ly < 1 || lx >= KC.w - 1 || ly >= KC.h - 1) continue;
      const d = kidSprite(id).g.getImageData(lx - 1, ly - 1, 3, 3).data;
      for (let k = 3; k < d.length; k += 4) if (d[k] > 0) return id;
    }
    return null;
  }
  onHull(x, y) {
    const by = this.boatY();
    return y >= by - 2 && y <= by + BOAT.h + 2 && Math.abs(x - this.boatX()) <= BOAT.hw + 8;
  }
  targetAt(x, y) {
    const kid = this.kidAt(x, y);
    if (kid) return kid;
    if (this.onHull(x, y)) return 'tour';
    if (hit({ x: WONKA.x - 26, y: WONKA.y - 104, w: 52, h: 108 }, x, y) || hit(BOARD, x, y)) return 'wonka';
    return null;
  }

  update(dt) {
    this.t += dt;
    for (const id in this.hop) this.hop[id] += dt;
    if (this.card) {
      this.card.t += dt;
      if (this.card.closeT >= 0) { this.card.closeT += dt; if (this.card.closeT > 0.16) this.card = null; }
    }
    this.hover = !this.card && !this.leaving && input.type === 'mouse' && input.hover ? this.targetAt(input.x, input.y) : null;
    if (this.leaving) {
      this.leaving.t += dt;
      if (this.leaving.t > 0.55 && !this.left) {
        this.left = true;
        if (this.leaving.kind === 'tour') this.api.startTour();
        else this.api.startSingle(this.leaving.id);
      }
    }
  }

  openCard(kind, id) {
    this.card = { kind, id, t: 0, closeT: -1 };
    sfx('pop');
  }
  closeCard() {
    if (!this.card || this.card.closeT >= 0) return;
    this.card.closeT = 0;
    sfx('back');
  }

  onDown(x, y) {
    if (this.leaving || this.t < 0.25) return;
    if (this.card) {
      if (this.card.closeT >= 0 || this.card.t < 0.15) return;
      if (hit({ x: CLOSE.x - 4, y: CLOSE.y - 4, w: CLOSE.w + 8, h: CLOSE.h + 8 }, x, y) || !hit(CARD, x, y)) { this.closeCard(); return; }
      if (this.card.kind === 'kid' && hit(PLAY, x, y)) {
        sfx('tap'); sfx('cheer');
        this.leaving = { kind: 'play', id: this.card.id, t: 0 };
      }
      return;
    }
    const h = this.targetAt(x, y);
    if (!h) return;
    if (h === 'tour') { sfx('boat'); this.leaving = { kind: 'tour', t: 0 }; return; }
    if (h === 'wonka') { this.openCard('scores'); return; }
    this.hop[h] = 0;
    sfx('squeak');
    this.openCard('kid', h);
  }

  /* --------------------------------------------------------------- drawing */
  drawCrew(ctx, t, bx, by) {
    const selected = this.card?.kind === 'kid' && this.card.closeT < 0 ? this.card.id : null;
    for (const id of DRAW_ORDER) {
      const i = CREW.findIndex((c) => c.id === id);
      const c = CREW[i];
      const ht = this.hop[id];
      const hop = ht != null && ht < 0.5 ? Math.abs(Math.sin((ht / 0.25) * Math.PI)) * (ht < 0.25 ? 12 : 5) : 0;
      const sway = Math.round(Math.sin(t * 2.2 + i * 1.3) * 0.6);
      const fx = Math.round(bx + c.dx), fy = Math.round(by + FEET - hop + sway);
      this.kidPos[id] = { x: fx, y: fy };
      const { c: cv, g } = kidSprite(id);
      g.clearRect(0, 0, KC.w, KC.h);
      const hot = this.hover === id;
      const chatter = Math.max(0, Math.sin(t * 9 + i * 2.1)) * (Math.sin(t * 0.8 + i * 1.7) > 0.55 ? 0.45 : 0);
      const pose = selected === id || (this.leaving?.kind === 'tour') ? 'cheer' : id === 'veruca' && Math.sin(t * 0.45) > 0.8 ? 'tantrum' : id === 'violet' && Math.sin(t * 0.37 + 1) > 0.85 ? 'hips' : 'idle';
      drawKid(g, id, KC.ox, KC.oy, {
        pose, t: t + i * 3,
        open: selected === id || hop ? 0.15 + Math.abs(Math.sin(t * 12)) * 0.35 : hot ? 0.3 + Math.abs(Math.sin(t * 10)) * 0.4 : id === 'violet' ? Math.abs(Math.sin(t * 6)) * 0.3 : chatter,
      });
      ctx.drawImage(cv, fx - KC.ox * KID_S, fy - KC.oy * KID_S, KC.w * KID_S, KC.h * KID_S);
      if (hot) {
        const hp = drawHeadTop(id, fx, fy);
        sparkle(ctx, hp.x + 24, hp.y, 2 + Math.round(Math.abs(Math.sin(t * 12)) * 2), P.white);
      }
    }
  }

  drawBoard(ctx, t) {
    const b = BOARD;
    const hot = this.hover === 'wonka';
    for (const px of [b.x + 14, b.x + b.w - 18]) { rect(ctx, px - 1, b.y + b.h, 6, 16, P.ink); rect(ctx, px, b.y + b.h, 4, 16, P.wood1); }
    rect(ctx, b.x - 2, b.y - 2, b.w + 4, b.h + 4, P.ink);
    rect(ctx, b.x, b.y, b.w, b.h, hot ? P.plum2 : P.plum1);
    rect(ctx, b.x + 3, b.y + 3, b.w - 6, b.h - 6, P.plum0);
    rect(ctx, b.x, b.y, b.w, 2, P.gold1);
    text(ctx, 'Scores', b.x + b.w / 2, b.y + 11, { size: 8, color: P.gold2 });
    GAME_IDS.forEach((id, i) => {
      const yy = b.y + 23 + i * 10;
      drawHead(ctx, id, b.x + 16, yy, { scale: 0.24 });
      drawSlots(ctx, b.x + 64, yy, getBest(id), { r: 2, gap: 2, t });
    });
  }

  drawCard(ctx, t) {
    const c = this.card;
    const open = seg(c.t, 0, 0.32, ease.outBack);
    const shut = c.closeT >= 0 ? seg(c.closeT, 0, 0.16, ease.inQuad) : 0;
    const k = Math.max(0, open * (1 - shut));
    ctx.fillStyle = `rgba(40,14,40,${0.38 * Math.min(1, c.t / 0.2) * (1 - shut)})`;
    ctx.fillRect(0, 0, W, H);
    if (k < 0.02) return;
    const { x, y, w, h } = CARD;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(k, k); ctx.translate(-(x + w / 2), -(y + h / 2));
    rect(ctx, x - 3, y + 1, w + 6, h + 6, 'rgba(40,14,40,0.35)');
    rect(ctx, x - 3, y - 3, w + 6, h + 6, P.ink);
    stripeRect(ctx, x, y, w, h, P.pink1, P.white, 6, t * 12);
    rect(ctx, x + 8, y + 8, w - 16, h - 16, P.cream);
    rect(ctx, x + 8, y + 8, w - 16, 2, P.white);
    if (c.kind === 'kid') this.drawKidCard(ctx, t, c);
    else this.drawScoreCard(ctx, t);
    // close button
    const hotX = input.type === 'mouse' && input.hover && hit(CLOSE, input.x, input.y);
    rect(ctx, CLOSE.x - 1, CLOSE.y - 1, CLOSE.w + 2, CLOSE.h + 2, P.ink);
    rect(ctx, CLOSE.x, CLOSE.y, CLOSE.w, CLOSE.h, hotX ? P.pink2 : P.pink1);
    rect(ctx, CLOSE.x, CLOSE.y, CLOSE.w, 2, P.pink3);
    for (let i = 0; i < 9; i++) {
      rect(ctx, CLOSE.x + 4 + i, CLOSE.y + 4 + i, 2, 2, P.white);
      rect(ctx, CLOSE.x + CLOSE.w - 6 - i, CLOSE.y + 4 + i, 2, 2, P.white);
    }
    ctx.restore();
  }

  drawKidCard(ctx, t, c) {
    const { x, y, h } = CARD;
    const id = c.id;
    const meta = GAMES_META[id];
    // a little stage for the kid
    const sx = x + 16, sy = y + 16, sw = 136, sh = h - 32;
    rect(ctx, sx - 1, sy - 1, sw + 2, sh + 2, P.ink);
    stripeRect(ctx, sx, sy, sw, sh, P.lilac3, P.lilac4, 8, 0);
    rect(ctx, sx, sy + sh - 22, sw, 22, P.pink3);
    rect(ctx, sx, sy + sh - 22, sw, 2, P.pink2);
    ctx.save();
    ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
    const cheer = c.t < 0.9;
    drawKid(ctx, id, sx + sw / 2, sy + sh - 8, { pose: cheer ? 'cheer' : 'idle', t, scale: 2, open: cheer ? 0.15 + Math.abs(Math.sin(t * 12)) * 0.35 : Math.max(0, Math.sin(t * 8)) * (Math.sin(t * 0.9) > 0.5 ? 0.35 : 0) });
    ctx.restore();
    const mx = x + 240;
    text(ctx, NAMES[id], mx, y + 40, { size: 16, color: P.pink1, outline: P.ink, ow: 1, shadow: P.pink0, sh: 2 });
    text(ctx, meta.room, mx, y + 64, { size: 8, color: P.lilac0 });
    const best = getBest(id);
    drawSlots(ctx, mx, y + 96, best, { r: 7, gap: 4, t });
    text(ctx, best >= 5 ? 'All five!' : best ? `Best: level ${best}` : 'Not played yet', mx, y + 118, { size: 8, color: P.choc2 });
    const hotP = input.type === 'mouse' && input.hover && hit(PLAY, input.x, input.y);
    drawButton(ctx, PLAY, 'Play', { color: P.pink1, size: 12, t, pressed: this.leaving?.kind === 'play', textColor: hotP ? P.pink0 : P.ink });
  }

  drawScoreCard(ctx, t) {
    const { x, y, w } = CARD;
    text(ctx, 'Best levels', x + w / 2, y + 26, { size: 12, color: P.pink1, outline: P.ink, ow: 1 });
    GAME_IDS.forEach((id, i) => {
      const ry = y + 54 + i * 30;
      rect(ctx, x + 16, ry - 13, w - 32, 26, i % 2 ? P.pink4 : P.lilac4);
      drawHead(ctx, id, x + 34, ry, { scale: 0.55, open: getBest(id) >= 5 ? Math.abs(Math.sin(t * 8 + i)) * 0.5 : 0 });
      text(ctx, NAMES[id], x + 54, ry + 1, { size: 8, align: 'left', color: P.choc1 });
      drawSlots(ctx, x + w - 82, ry, getBest(id), { r: 6, gap: 3, t });
    });
  }

  draw(ctx) {
    const t = this.t;
    ctx.drawImage(candyBackground(calm), 0, 0);
    drawClouds(ctx, t);
    drawRiverLife(ctx, t, (x, y) => Math.abs(x - this.boatX()) < BOAT.hw - 6 && y < this.boatY() + BOAT.h);
    drawWaterfall(ctx, t);
    for (const l of LOLLIPOPS.filter((l) => l.y < 200)) drawLollipop(ctx, l.x, l.y, l.r, LOLLI[l.c], t, { stick: l.stick, sway: true });
    this.drawBoard(ctx, t);

    // the boat, its wake, and the five kids standing in it
    const bx = Math.round(this.boatX()), by = this.boatY();
    for (let i = 0; i < 6; i++) {
      const wx = bx - BOAT.hw - 4 - i * 9 + ((t * 24) % 9);
      rect(ctx, wx, by + BOAT.h - 6 + (i % 2) * 3, 5, 1, P.caramel);
      rect(ctx, bx + BOAT.hw - 10 + i * 4, by + BOAT.h - 2 + Math.round(Math.sin(t * 3 + i)), 3, 1, P.choc4);
    }
    ctx.save(); clipToBoat(ctx, bx, by);
    this.drawCrew(ctx, t, bx, by);
    ctx.restore();
    drawHull(ctx, bx, by, t, this.hover === 'tour');
    rect(ctx, bx - BOAT.hw * 0.62, by + BOAT.h + 1, BOAT.hw * 1.24, 1, P.choc1);

    for (const l of LOLLIPOPS.filter((l) => l.y >= 200)) drawLollipop(ctx, l.x, l.y, l.r, LOLLI[l.c], t, { stick: l.stick, sway: true });

    // Wonka by his scoreboard
    const wsel = this.card?.kind === 'scores' && this.card.closeT < 0;
    ellipse(ctx, WONKA.x + 2, WONKA.y + 1, 17, 3, 'rgba(60,30,80,0.25)');
    drawKid(ctx, 'wonka', WONKA.x, WONKA.y, {
      t, scale: 1.2, pose: wsel ? 'cheer' : t < 3 ? 'talk' : 'present', flip: true,
      open: t > 0.4 && t < 3 ? Math.abs(Math.sin(t * 20)) * 0.6 : this.hover === 'wonka' ? 0.3 : 0,
    });
    if (t > 0.4 && t < 4.2 && !this.card) {
      drawBubble(ctx, W - 6, 152, this.hello, { align: 'right', shown: Math.floor((t - 0.4) * 30), maxChars: 18, tailX: WONKA.x - 4, tailDir: -1 });
    }
    drawLogo(ctx, 402, 22, t, 16);

    if (this.card) this.drawCard(ctx, t);
    if (this.leaving && this.leaving.t > 0.25) {
      ctx.globalAlpha = seg(this.leaving.t, 0.25, 0.3);
      rect(ctx, 0, 0, W, H, P.cream);
      ctx.globalAlpha = 1;
    }
  }
}

// Rough top of a kid's head in screen space (for hover sparkles).
function drawHeadTop(id, fx, fy) {
  const tops = { charlie: -62, violet: -59, veruca: -64, mike: -57, augustus: -65 };
  return { x: fx, y: fy + tops[id] * KID_S };
}
