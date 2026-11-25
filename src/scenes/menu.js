// Main menu: the Chocolate Room as a candy land. The five kids ride a giant
// boiled-sweet boat down the chocolate river: tap a kid for their close-up
// card, the hull for the Grand tour, Wonka (or his board) for the scores.
import { P, mix } from '../palette.js';
import { W, H, rect, ellipse, text, stripePattern, stripeRect, FONT, seg, ease, sparkle, input } from '../engine.js';
import { drawKid } from '../kids.js';
import { drawSlots, drawBubble, drawButton, hit } from '../ui.js';
import { sfx, playMusic } from '../audio.js';
import { getBest, GAME_IDS } from '../save.js';
import { helloQuip } from '../quips.js';
import { drawHead } from '../faces.js';
import { GAMES } from '../games/index.js';
import { FULL_NAMES, nameParts } from '../names.js';
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
const KID_S = 1;                        // kids in the boat (native sprite size, crisp)
const BOAT = { x: 206, y: 168, hw: 83, h: 24 }; // centre x, deck line y, half-width, hull depth
// Left to right in the boat; Augustus in the middle, drawn first (behind).
const CREW = [
  { id: 'charlie', dx: -66 }, { id: 'violet', dx: -36 }, { id: 'augustus', dx: -3 },
  { id: 'veruca', dx: 34 }, { id: 'mike', dx: 60 },
];
const DRAW_ORDER = ['augustus', 'violet', 'veruca', 'charlie', 'mike'];
const FEET = 15;                        // kid feet sit this far below the deck line (hidden by the hull)
const KC = { w: 110, h: 110, ox: 55, oy: 104 }; // offscreen kid sprite canvas + origin (feet)

const WONKA = { x: 434, y: 262, s: 1.8 };
const WC = { w: 96, h: 112, ox: 48, oy: 106 };  // offscreen Wonka sprite canvas + origin (feet)
const BOARD = { x: 300, y: 58, w: 96, h: 72 };
const LOLLIPOPS = [
  { x: 80, y: 148, r: 12, c: 'berry' },
  { x: 52, y: 266, r: 22, c: 'pink', stick: 18 },
  { x: 300, y: 268, r: 16, c: 'lilac', stick: 22 },
  { x: 176, y: 268, r: 11, c: 'blue', stick: 16 },
];
// Keep the busy stuff away from the boat and kids.
const calm = (x, y) => x > BOAT.x - BOAT.hw - 20 && x < BOAT.x + BOAT.hw + 20 && y > 100 && y < 215;

const CARD = { x: 76, y: 32, w: 328, h: 208 };
const CLOSE = { x: CARD.x + CARD.w - 26, y: CARD.y + 8, w: 18, h: 18 };
const PLAY = { x: CARD.x + 176, y: CARD.y + 152, w: 128, h: 32 };

const GOLD_OUT = '#f7bd34', GOLD_IN = '#ffe27a';
const INFLATE = 0.08;

/* ------------------------------------------------------------ sprites */
// Each character is drawn at 1x into its own canvas, then scaled up with
// nearest-neighbour. The same canvas gives pixel-perfect hit tests and the
// gold hover outline.
const sprites = {};
function sprite(id, dims) {
  if (!sprites[id]) {
    const mkc = () => { const c = document.createElement('canvas'); c.width = dims.w; c.height = dims.h; return c; };
    const c = mkc(), o = mkc(), m = mkc();
    const g = c.getContext('2d', { willReadFrequently: true });
    const og = o.getContext('2d');
    const mg = m.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingEnabled = false; og.imageSmoothingEnabled = false;
    // m: the same pose with the mouth shut, at resting size: a steady hit mask
    sprites[id] = { c, g, o, og, m, mg, dims };
  }
  return sprites[id];
}
// Rebuild the outline canvas: a 2px gold ring around the sprite's silhouette.
const RING1 = [], RING2 = [];
for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
  const d = dx * dx + dy * dy;
  if (d === 0) continue;
  if (d <= 2) RING1.push([dx, dy]); else if (d <= 5) RING2.push([dx, dy]);
}
function buildOutline(sp) {
  const { o, og, c, dims } = sp;
  og.clearRect(0, 0, dims.w, dims.h);
  og.globalCompositeOperation = 'source-over';
  for (const [dx, dy] of RING2) og.drawImage(c, dx, dy);
  og.globalCompositeOperation = 'source-in';
  og.fillStyle = GOLD_OUT; og.fillRect(0, 0, dims.w, dims.h);
  og.globalCompositeOperation = 'source-over';
  // inner ring in a lighter gold
  const tmp = buildOutline.tmp || (buildOutline.tmp = document.createElement('canvas'));
  tmp.width = dims.w; tmp.height = dims.h;
  const tg = tmp.getContext('2d');
  for (const [dx, dy] of RING1) tg.drawImage(c, dx, dy);
  tg.globalCompositeOperation = 'source-in';
  tg.fillStyle = GOLD_IN; tg.fillRect(0, 0, dims.w, dims.h);
  og.drawImage(tmp, 0, 0);
}
// Draw a sprite at feet (fx, fy), scale s, with an optional gold outline.
function blitSprite(ctx, sp, fx, fy, s, outline) {
  const { dims } = sp;
  const x = Math.round(fx - dims.ox * s), y = Math.round(fy - dims.oy * s);
  const w = Math.round(dims.w * s), h = Math.round(dims.h * s);
  if (outline) { buildOutline(sp); ctx.drawImage(sp.o, x, y, w, h); }
  ctx.drawImage(sp.c, x, y, w, h);
}
// Is there an opaque sprite pixel near (x, y)? pos = { x, y, s, base } (feet,
// drawn scale, resting scale). A hit on either what's drawn (maybe inflated,
// mouth open) or the steady mask (mouth shut, resting size) counts, so the
// hover reaction itself can never pull the character out from under the pointer.
// steady = only the mask (used to start a hover, so animation can't flicker it).
function spriteHit(sp, pos, x, y, r = 1, steady = false) {
  return (!steady && canvasHit(sp.g, sp.dims, pos, pos.s, x, y, r)) || canvasHit(sp.mg, sp.dims, pos, pos.base ?? pos.s, x, y, r);
}
function canvasHit(g, dims, pos, s, x, y, r) {
  const lx = Math.floor((x - pos.x) / s + dims.ox), ly = Math.floor((y - pos.y) / s + dims.oy);
  if (lx < r || ly < r || lx >= dims.w - r || ly >= dims.h - r) return false;
  const d = g.getImageData(lx - r, ly - r, r * 2 + 1, r * 2 + 1).data;
  for (let k = 3; k < d.length; k += 4) if (d[k] > 0) return true;
  return false;
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
    const col = yy < 1 ? P.pink4 : yy < 3 ? P.pink3 : yy < 7 ? P.pink2 : yy < h - 5 ? P.pink1 : P.pink0;
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
  for (let i = -10; i < 12; i++) {
    const x0 = cx + i * 14;
    for (let yy = 4; yy <= h; yy++) ctx.fillRect(x0 + Math.round(yy * 0.6), top + yy, 4, 1);
  }
  ctx.restore();
  // shine
  rect(ctx, cx - hw + 10, top + 5, hw * 0.7, 2, 'rgba(255,255,255,0.75)');
  rect(ctx, cx - hw + 7, top + 8, 6, 1, 'rgba(255,255,255,0.6)');
  rect(ctx, cx + 22, top + 6, hw * 0.4, 1, 'rgba(255,255,255,0.45)');
  // swirly prow and stern
  for (const s of [-1, 1]) {
    const px = cx + s * (hw + 3), py = top - 4;
    rect(ctx, px - 2, py, 5, 9, P.ink); rect(ctx, px - 1, py, 3, 9, P.pink1);
    drawLollipop(ctx, px, py + 1, 6, PROW.pink, t, { stick: -6, sparkle: false });
  }
  // the Grand tour label
  const pulse = hot ? 1 : Math.sin(t * 3) > 0.92 ? 1 : 0;
  text(ctx, 'Grand tour', cx, top + 14 - pulse, { size: 12, color: hot ? P.pink4 : P.white, outline: P.pink0, ow: 2, shadow: P.raspberry, sh: 2 });
  for (const s of [-1, 1]) sparkle(ctx, cx + s * 69, top + 13, Math.round(2 + Math.abs(Math.sin(t * 4 + s)) * 2), P.white);
}

/* ------------------------------------------------------------------- scene */
const canvasEl = () => document.getElementById('game');

export class MenuScene {
  constructor(api) {
    this.api = api;
    this.t = 0;
    this.pausable = true;
    this.hover = null;    // character under the mouse, or under a pressed finger
    this.pressed = null;  // what the pointer went down on (activates on release)
    this.hello = helloQuip();
    this.card = null;     // { kind: 'kid'|'scores', id, t, closeT }
    this.hop = {};        // kid id -> seconds since hop started
    this.leaving = null;  // { kind: 'play'|'tour', id, t }
    this.pos = {};        // last drawn feet position + scale of each character
    this.order = DRAW_ORDER.slice();
    this.spring = {};     // id -> { k, v } hover inflate spring
    playMusic('menu');
  }

  boatY() { return BOAT.y + Math.round(Math.sin(this.t * 1.8) * 1); }
  boatX() { return BOAT.x + (this.leaving?.kind === 'tour' ? this.leaving.t * 220 : 0); }

  // Which kid's pixels are under (x, y)? Top-most (as last drawn) first.
  kidAt(x, y, steady = false) {
    if (y > this.boatY() + 3) return null; // below the rim is the hull
    for (let i = this.order.length - 1; i >= 0; i--) {
      const id = this.order[i];
      if (this.pos[id] && spriteHit(sprite(id, KC), this.pos[id], x, y, 1, steady)) return id;
    }
    return null;
  }
  onHull(x, y) {
    const by = this.boatY();
    return y >= by - 2 && y <= by + BOAT.h + 2 && Math.abs(x - this.boatX()) <= BOAT.hw + 6;
  }
  targetAt(x, y, steady = false) {
    if (this.pos.wonka && spriteHit(sprite('wonka', WC), this.pos.wonka, x, y, 1, steady)) return 'wonka';
    const kid = this.kidAt(x, y, steady);
    if (kid) return kid;
    if (this.onHull(x, y)) return 'tour';
    if (hit(BOARD, x, y)) return 'board';
    return null;
  }
  // Still close to the character we're already hovering? (Hover makes the
  // mouth open, which moves the head; this stops it flickering on and off.)
  nearHovered(x, y) {
    const id = this.hover === 'board' ? null : this.hover;
    if (!id || id === 'tour' || !this.pos[id]) return false;
    if (id !== 'wonka' && y > this.boatY() + 3) return false;
    const sp = id === 'wonka' ? sprite('wonka', WC) : sprite(id, KC);
    return spriteHit(sp, this.pos[id], x, y, 3);
  }
  // Mouse hovering, or a finger held down, over r?
  cursorOn(r) {
    const live = input.type === 'mouse' ? input.hover : input.down;
    return live && hit(r, input.x, input.y);
  }

  update(dt) {
    this.t += dt;
    for (const id in this.hop) this.hop[id] += dt;
    if (this.card) {
      this.card.t += dt;
      if (this.card.closeT >= 0) { this.card.closeT += dt; if (this.card.closeT > 0.16) this.card = null; }
    }
    // hover: the mouse over a character, or a finger held down on one
    const live = input.type === 'mouse' ? input.hover : input.down;
    this.hover = !this.card && !this.leaving && live ? (this.nearHovered(input.x, input.y) ? this.hover : this.targetAt(input.x, input.y, true)) : null;
    // springy inflate toward 1 while hovered
    for (const id of [...CREW.map((c) => c.id), 'wonka']) {
      const sp = this.spring[id] || (this.spring[id] = { k: 0, v: 0 });
      const target = this.hover === id || (id === 'wonka' && this.hover === 'board') ? 1 : 0;
      sp.v += ((target - sp.k) * 420 - sp.v * 22) * dt;
      sp.k += sp.v * dt;
      if (!target && sp.k < 0.002 && Math.abs(sp.v) < 0.01) { sp.k = 0; sp.v = 0; }
    }
    // pointer cursor over anything tappable
    const el = canvasEl();
    if (el) {
      const onBtn = this.card && this.card.closeT < 0 && (this.cursorOn(CLOSE) || (this.card.kind === 'kid' && this.cursorOn(PLAY)));
      const want = input.type === 'mouse' && (this.hover || onBtn) ? 'pointer' : '';
      if (el.style.cursor !== want) el.style.cursor = want;
    }
    if (this.leaving) {
      this.leaving.t += dt;
      if (this.leaving.t > 0.55 && !this.left) {
        this.left = true;
        if (el) el.style.cursor = '';
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
    // characters and the boat act on release, so a held finger shows the outline first
    this.pressed = this.targetAt(x, y);
    if (this.pressed && this.pressed !== 'tour') sfx('blip');
  }
  onUp(x, y) {
    const p = this.pressed;
    this.pressed = null;
    if (!p || this.card || this.leaving) return;
    const h = this.targetAt(x, y);
    const same = h === p || ((h === 'board' || h === 'wonka') && (p === 'board' || p === 'wonka'));
    if (!same) return;
    if (p === 'tour') { sfx('boat'); this.leaving = { kind: 'tour', t: 0 }; return; }
    if (p === 'wonka' || p === 'board') { this.openCard('scores'); return; }
    this.hop[p] = 0;
    sfx('squeak');
    this.openCard('kid', p);
  }

  /* --------------------------------------------------------------- drawing */
  drawCrew(ctx, t, bx, by) {
    const selected = this.card?.kind === 'kid' && this.card.closeT < 0 ? this.card.id : null;
    // the hovered kid draws on top so their outline is fully visible
    const front = CREW.some((c) => c.id === this.hover) ? this.hover : selected;
    this.order = DRAW_ORDER.filter((id) => id !== front).concat(front ? [front] : []);
    for (const id of this.order) {
      const i = CREW.findIndex((c) => c.id === id);
      const c = CREW[i];
      const ht = this.hop[id];
      const hop = ht != null && ht < 0.5 ? Math.abs(Math.sin((ht / 0.25) * Math.PI)) * (ht < 0.25 ? 9 : 4) : 0;
      const sway = Math.round(Math.sin(t * 2.2 + i * 1.3) * 0.6);
      const fx = Math.round(bx + c.dx), fy = Math.round(by + FEET - hop + sway);
      const hk = this.spring[id]?.k ?? 0;
      const s = KID_S * (1 + INFLATE * hk);
      this.pos[id] = { x: fx, y: fy, s, base: KID_S };
      const sp = sprite(id, KC);
      sp.g.clearRect(0, 0, KC.w, KC.h);
      const hot = this.hover === id;
      const chatter = Math.max(0, Math.sin(t * 9 + i * 2.1)) * (Math.sin(t * 0.8 + i * 1.7) > 0.55 ? 0.45 : 0);
      const pose = selected === id || this.leaving?.kind === 'tour' ? 'cheer' : id === 'veruca' && Math.sin(t * 0.45) > 0.8 ? 'tantrum' : id === 'violet' && Math.sin(t * 0.37 + 1) > 0.85 ? 'hips' : 'idle';
      sp.mg.clearRect(0, 0, KC.w, KC.h);
      drawKid(sp.mg, id, KC.ox, KC.oy, { pose, t: t + i * 3, open: 0 });
      drawKid(sp.g, id, KC.ox, KC.oy, {
        pose, t: t + i * 3,
        open: selected === id || hop ? 0.15 + Math.abs(Math.sin(t * 12)) * 0.35 : hot ? 0.3 + Math.abs(Math.sin(t * 10)) * 0.4 : id === 'violet' ? Math.abs(Math.sin(t * 6)) * 0.3 : chatter,
      });
      blitSprite(ctx, sp, fx, fy, s, hot || hk > 0.05);
    }
  }

  drawWonka(ctx, t) {
    const wsel = this.card?.kind === 'scores' && this.card.closeT < 0;
    const hot = this.hover === 'wonka' || this.hover === 'board';
    const sp = sprite('wonka', WC);
    sp.g.clearRect(0, 0, WC.w, WC.h);
    sp.mg.clearRect(0, 0, WC.w, WC.h);
    drawKid(sp.mg, 'wonka', WC.ox, WC.oy, { t, pose: wsel ? 'cheer' : t < 3 ? 'talk' : 'present', flip: true, open: 0 });
    drawKid(sp.g, 'wonka', WC.ox, WC.oy, {
      t, pose: wsel ? 'cheer' : t < 3 ? 'talk' : 'present', flip: true,
      open: t > 0.4 && t < 3 ? Math.abs(Math.sin(t * 20)) * 0.6 : hot ? 0.3 + Math.abs(Math.sin(t * 10)) * 0.3 : 0,
    });
    const hk = this.spring.wonka?.k ?? 0;
    const s = WONKA.s * (1 + INFLATE * hk);
    this.pos.wonka = { x: WONKA.x, y: WONKA.y, s, base: WONKA.s };
    ellipse(ctx, WONKA.x + 2, WONKA.y + 1, 26, 4, 'rgba(60,30,80,0.25)');
    blitSprite(ctx, sp, WONKA.x, WONKA.y, s, hot || hk > 0.05);
  }

  drawBoard(ctx, t) {
    const b = BOARD;
    const hot = this.hover === 'wonka' || this.hover === 'board';
    for (const px of [b.x + 12, b.x + b.w - 16]) { rect(ctx, px - 1, b.y + b.h, 6, 18, P.ink); rect(ctx, px, b.y + b.h, 4, 18, P.wood1); }
    rect(ctx, b.x - 2, b.y - 2, b.w + 4, b.h + 4, hot ? GOLD_OUT : P.ink);
    rect(ctx, b.x, b.y, b.w, b.h, hot ? P.plum2 : P.plum1);
    rect(ctx, b.x + 3, b.y + 3, b.w - 6, b.h - 6, P.plum0);
    rect(ctx, b.x, b.y, b.w, 2, P.gold1);
    text(ctx, 'Scores', b.x + b.w / 2, b.y + 11, { size: 8, color: P.gold2 });
    GAME_IDS.forEach((id, i) => {
      const yy = b.y + 22 + i * 10;
      drawHead(ctx, id, b.x + 15, yy, { scale: 0.24 });
      drawSlots(ctx, b.x + 60, yy, getBest(id), { r: 2, gap: 2, t });
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
    const hotX = this.cursorOn(CLOSE);
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
    const [first, last] = nameParts(id);
    text(ctx, first, mx, y + 36, { size: 16, color: P.pink1, outline: P.ink, ow: 1, shadow: P.pink0, sh: 2 });
    text(ctx, last, mx, y + 58, { size: 12, color: P.pink1, outline: P.ink, ow: 1, shadow: P.pink0, sh: 2 });
    text(ctx, meta.room, mx, y + 80, { size: 8, color: P.lilac0 });
    const best = getBest(id);
    drawSlots(ctx, mx, y + 104, best, { r: 7, gap: 4, t });
    text(ctx, best >= 5 ? 'All five!' : best ? `Best: level ${best}` : 'Not played yet', mx, y + 126, { size: 8, color: P.choc2 });
    const hotP = this.cursorOn(PLAY);
    drawButton(ctx, PLAY, 'Play', { color: P.pink1, size: 12, t, pressed: this.leaving?.kind === 'play', textColor: hotP ? P.pink0 : P.ink });
  }

  drawScoreCard(ctx, t) {
    const { x, y, w } = CARD;
    text(ctx, 'Best levels', x + w / 2, y + 26, { size: 12, color: P.pink1, outline: P.ink, ow: 1 });
    GAME_IDS.forEach((id, i) => {
      const ry = y + 54 + i * 30;
      rect(ctx, x + 16, ry - 13, w - 32, 26, i % 2 ? P.pink4 : P.lilac4);
      drawHead(ctx, id, x + 34, ry, { scale: 0.55, open: getBest(id) >= 5 ? Math.abs(Math.sin(t * 8 + i)) * 0.5 : 0 });
      text(ctx, FULL_NAMES[id], x + 54, ry + 1, { size: 8, align: 'left', color: P.choc1 });
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
      const wx = bx - BOAT.hw - 4 - i * 7 + ((t * 20) % 7);
      rect(ctx, wx, by + BOAT.h - 5 + (i % 2) * 2, 4, 1, P.caramel);
      rect(ctx, bx + BOAT.hw - 8 + i * 3, by + BOAT.h - 2 + Math.round(Math.sin(t * 3 + i)), 2, 1, P.choc4);
    }
    ctx.save(); clipToBoat(ctx, bx, by);
    this.drawCrew(ctx, t, bx, by);
    ctx.restore();
    drawHull(ctx, bx, by, t, this.hover === 'tour');
    rect(ctx, bx - BOAT.hw * 0.62, by + BOAT.h + 1, BOAT.hw * 1.24, 1, P.choc1);

    for (const l of LOLLIPOPS.filter((l) => l.y >= 200)) drawLollipop(ctx, l.x, l.y, l.r, LOLLI[l.c], t, { stick: l.stick, sway: true });

    // Wonka on the right bank, by his scoreboard
    this.drawWonka(ctx, t);
    if (t > 0.4 && t < 4.2 && !this.card) {
      drawBubble(ctx, 402, 132, this.hello, { align: 'right', shown: Math.floor((t - 0.4) * 30), maxChars: 18, tailX: 386, tailDir: 1 });
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
