// Character bodies (code-drawn pixel caricatures) + Oompa-Loompas + Wonka.
// Origin for drawKid is the point between the feet. Heads are drawn with the
// hinged head renderer from faces.js.
import { P, mix } from './palette.js';
import { rect, ellipse, limb, line } from './engine.js';
import { drawHead } from './faces.js';

const OUT = '#3a1428';
const SKIN = '#f9caa8';

// Arm angles (left, right) per pose. 0 = pointing right, PI/2 = down.
function armAngles(pose, t) {
  const D = Math.PI / 2;
  switch (pose) {
    case 'cheer': return [-D - 0.6 + Math.sin(t * 16) * 0.35, -D + 0.6 - Math.sin(t * 16) * 0.35];
    case 'scared': return [-D - 0.8 + Math.sin(t * 34) * 0.5, -D + 0.8 + Math.sin(t * 31) * 0.5];
    case 'walk': return [D + Math.sin(t * 10) * 0.6, D - Math.sin(t * 10) * 0.6];
    case 'creep': return [-0.5 + Math.sin(t * 8) * 0.15, -0.2 + Math.sin(t * 8 + 1) * 0.15];
    case 'freeze': return [-0.9, -0.3];
    case 'wave': return [D + 0.25, -D + 0.5 + Math.sin(t * 22) * 0.5];
    case 'swim': return [Math.PI + Math.sin(t * 9) * 0.7, Math.sin(t * 9 + Math.PI) * 0.7];
    case 'grab': return [-0.3, -0.5];
    case 'hold': return [-D - 0.3, -D + 0.3];
    case 'hips': return [D + 1.2, D - 1.2];
    case 'tantrum': return [D + 0.5 + Math.sin(t * 24) * 0.5, D - 0.5 - Math.sin(t * 24) * 0.5];
    default: return [D + 0.22 + Math.sin(t * 2) * 0.04, D - 0.22 - Math.sin(t * 2) * 0.04];
  }
}

// Leg offsets: [leftLift, rightLift, leftX, rightX]
function legPose(pose, t) {
  switch (pose) {
    case 'walk': { const s = Math.sin(t * 10); return [Math.max(0, s) * 3, Math.max(0, -s) * 3, s * 2, -s * 2]; }
    case 'creep': { const s = Math.sin(t * 7); return [Math.max(0, s) * 4, Math.max(0, -s) * 4, s * 3, -s * 3]; }
    case 'freeze': return [4, 0, -3, 3];
    case 'cheer': { const j = Math.abs(Math.sin(t * 8)) * 2; return [j, j, -1, 1]; }
    case 'scared': { const s = Math.sin(t * 30); return [Math.max(0, s) * 3, Math.max(0, -s) * 3, 0, 0]; }
    case 'tantrum': { const s = Math.sin(t * 14); return [Math.max(0, s) * 5, 0, 0, 0]; }
    default: return [0, 0, 0, 0];
  }
}

function legs(ctx, pose, t, o) {
  const { legH = 10, gap = 4, w = 4, pants, sock, shoe, pantsLen = 1, shoeW = 2 } = o;
  const [ll, rl, lx, rx] = legPose(pose, t);
  for (const [x, lift] of [[-gap - w + 2 + lx, ll], [gap - 2 + rx, rl]]) {
    const top = -legH - 1;
    const bottom = -3 - lift;
    const pl = Math.round((bottom - top) * pantsLen);
    rect(ctx, x - 1, top, w + 2, bottom - top + 1, OUT);
    rect(ctx, x, top, w, pl, pants);
    if (pl < bottom - top) rect(ctx, x, top + pl, w, bottom - top - pl, sock);
    rect(ctx, x - 1, bottom - 1, w + 1 + shoeW, 4, OUT);
    rect(ctx, x, bottom, w + shoeW, 2, shoe);
  }
}

function arms(ctx, pose, t, sx, sy, sleeve, hand, len = 10, w = 3, cuff = 0) {
  const [la, ra] = armAngles(pose, t);
  for (const [x, a] of [[-sx, la], [sx, ra]]) {
    limb(ctx, x, sy, a, len, w + 2, OUT);
    limb(ctx, x, sy, a, len - cuff, w, sleeve);
    if (cuff) limb(ctx, x + Math.cos(a) * (len - cuff), sy + Math.sin(a) * (len - cuff), a, cuff, w, hand);
    const ex = x + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
    rect(ctx, Math.round(ex) - 2, Math.round(ey) - 2, w + 1, w + 1, hand);
  }
}

// Torso trapezoid built from rows.
function trap(ctx, topY, botY, wTop, wBot, col, outline = true) {
  for (let y = topY; y <= botY; y++) {
    const k = (y - topY) / Math.max(1, botY - topY);
    const hw = Math.round((wTop + (wBot - wTop) * k) / 2);
    if (outline) rect(ctx, -hw - 1, y, hw * 2 + 2, 1, OUT);
    rect(ctx, -hw, y, hw * 2, 1, col);
  }
  if (outline) {
    rect(ctx, -Math.round(wTop / 2), topY - 1, Math.round(wTop / 2) * 2, 1, OUT);
    rect(ctx, -Math.round(wBot / 2) - 1, botY + 1, Math.round(wBot / 2) * 2 + 2, 1, OUT);
  }
}

const noLegsPose = (pose) => pose === 'swim' || pose === 'sit';

const BODIES = {
  charlie(ctx, pose, t, c) {
    // skinny, half-starved; jumper too small, scarf full of holes
    if (!noLegsPose(pose)) legs(ctx, pose, t, { legH: 11, gap: 3, w: 3, pants: c('#8a7a7e'), sock: SKIN, shoe: c('#3b2a2e'), pantsLen: 0.65, shoeW: 3 });
    const top = -28;
    arms(ctx, pose, t, 6, top + 4, c('#8b86b8'), SKIN, 12, 2, 4);
    trap(ctx, top, -14, 11, 11, c('#8b86b8'));
    rect(ctx, -5, -14, 10, 3, c('#ece0d6')); // shirt showing under the short jumper
    rect(ctx, -5, -15, 10, 1, c('#6f6a9a'));
    rect(ctx, -4, -24, 3, 3, c('#b08a6a')); rect(ctx, -4, -24, 3, 1, c('#8d6c50'));
    rect(ctx, 1, -19, 3, 3, c('#a07c8e'));
    // ribs of a thin boy
    rect(ctx, -3, -21, 1, 1, c('#6f6a9a')); rect(ctx, 2, -23, 1, 1, c('#6f6a9a'));
    // threadbare scarf
    rect(ctx, -6, top - 1, 12, 4, c('#c2566e'));
    rect(ctx, -3, top, 1, 1, c('#8b86b8')); rect(ctx, 2, top + 1, 1, 1, c('#8b86b8'));
    rect(ctx, 3, top + 2, 3, 9, c('#c2566e'));
    rect(ctx, 3, top + 5, 3, 1, c('#e7879a')); rect(ctx, 4, top + 8, 1, 1, c('#8b86b8'));
    rect(ctx, 3, top + 11, 1, 2, c('#c2566e')); rect(ctx, 5, top + 11, 1, 1, c('#c2566e'));
    return top;
  },
  augustus(ctx, pose, t, c) {
    // enormously, absurdly fat
    if (!noLegsPose(pose)) legs(ctx, pose, t, { legH: 6, gap: 11, w: 7, pants: c('#7a5ca8'), sock: '#ffcfae', shoe: c('#3a2418'), pantsLen: 0.5 });
    const cy = -22, rx = 27, ry = 18;
    ellipse(ctx, 0, cy, rx + 1, ry + 1, OUT);
    for (let dy = -ry; dy <= ry; dy++) {
      const k = 1 - (dy / (ry + 0.5)) ** 2;
      if (k <= 0) continue;
      const hw = Math.round(rx * Math.sqrt(k));
      const band = Math.floor((dy + ry) / 3) % 2;
      let col = band ? c(P.red2) : c('#fff0e6');
      if (dy > ry - 6) col = c('#ffcfae'); // belly bursting out the bottom
      rect(ctx, -hw, cy + dy, hw * 2 + 1, 1, col);
    }
    // belly roll + navel + popped seam
    rect(ctx, -16, cy + ry - 6, 32, 1, c('#eba07c'));
    rect(ctx, -1, cy + ry - 3, 3, 2, c('#d0876a'));
    rect(ctx, -22, cy - 2, 2, 1, OUT); rect(ctx, 19, cy + 4, 2, 1, OUT);
    // chocolate stains
    ellipse(ctx, 9, cy - 5, 4, 2, c('#7a3f1a'));
    rect(ctx, -12, cy + 3, 4, 2, c('#7a3f1a')); rect(ctx, 14, cy + 8, 2, 3, c('#7a3f1a'));
    arms(ctx, pose, t, 24, cy - 8, c(P.red2), '#ffcfae', 8, 6);
    return cy - ry + 4;
  },
  violet(ctx, pose, t, c) {
    if (!noLegsPose(pose)) legs(ctx, pose, t, { pants: SKIN, sock: P.white, shoe: c(P.pink1), pantsLen: 0.45 });
    const top = -27;
    arms(ctx, pose === 'idle' ? 'hips' : pose, t, 7, top + 4, c(P.mint2), SKIN);
    trap(ctx, top, -14, 13, 14, c(P.mint2));
    trap(ctx, -19, -8, 12, 22, c(P.lilac2));
    rect(ctx, -4, top + 1, 2, 9, c(P.lilac2)); rect(ctx, 2, top + 1, 2, 9, c(P.lilac2));
    rect(ctx, -10, -10, 20, 1, c(P.lilac1));
    rect(ctx, 2, -16, 4, 3, c(P.lilac1));
    rect(ctx, 3, -16, 2, 1, c(P.pink1)); // spare gum in the pocket
    rect(ctx, -6, -12, 2, 2, c(P.pink2));
    return top;
  },
  veruca(ctx, pose, t, c) {
    if (!noLegsPose(pose)) legs(ctx, pose, t, { pants: P.white, sock: P.white, shoe: c('#2a1426'), pantsLen: 1 });
    const top = -28;
    const ap = pose === 'idle' ? 'hips' : pose;
    // fur-trimmed velvet coat
    arms(ctx, ap, t, 8, top + 4, c(P.pink1), SKIN, 10, 3);
    trap(ctx, top, -6, 15, 24, c(P.pink1));
    rect(ctx, -1, top + 2, 2, 20, c(P.pink0));
    for (let i = 0; i < 4; i++) rect(ctx, 2, top + 4 + i * 5, 2, 2, c(P.gold1));
    // fur hem
    for (let x = -12; x < 12; x += 2) ellipse(ctx, x, -6, 2, 2, P.white);
    // fur collar
    ellipse(ctx, 0, top + 1, 10, 4, OUT);
    ellipse(ctx, 0, top + 1, 9, 3, P.white);
    rect(ctx, -6, top, 2, 1, P.grey3); rect(ctx, 3, top + 2, 2, 1, P.grey3); rect(ctx, 6, top, 1, 1, P.grey3);
    return top;
  },
  mike(ctx, pose, t, c) {
    // slouched cowboy, pistols everywhere
    if (!noLegsPose(pose)) legs(ctx, pose, t, { pants: c(P.blue1), sock: c(P.blue1), shoe: c('#6b3a1c'), pantsLen: 1 });
    const top = -25;
    arms(ctx, pose, t, 7, top + 5, c(P.red2), SKIN, 11);
    trap(ctx, top, -10, 16, 13, c(P.red2));
    for (let y = top; y < -10; y += 3) rect(ctx, -7, y, 14, 1, c('#ffd7de')); // checked shirt
    for (let x = -6; x < 7; x += 3) rect(ctx, x, top, 1, 15, c('#ffd7de'));
    // vest
    rect(ctx, -8, top + 1, 4, 14, c('#c08a5e')); rect(ctx, 4, top + 1, 4, 14, c('#c08a5e'));
    // bandolier of toy pistols
    for (let i = 0; i < 5; i++) {
      const bx = -6 + i * 3, by = top + 2 + i * 2;
      rect(ctx, bx, by, 3, 2, c('#6b3a1c'));
      rect(ctx, bx, by - 1, 2, 1, c(P.grey1));
    }
    rect(ctx, -5, top - 1, 10, 3, c(P.red1)); rect(ctx, -2, top + 2, 4, 2, c(P.red1));
    // belt + holsters with toy pistols
    rect(ctx, -8, -12, 16, 2, c('#5a2e12'));
    rect(ctx, -1, -12, 3, 2, c(P.gold1));
    rect(ctx, -11, -12, 4, 7, c('#7a4220')); rect(ctx, 7, -12, 4, 7, c('#7a4220'));
    rect(ctx, -11, -15, 2, 4, c(P.grey1)); rect(ctx, 9, -15, 2, 4, c(P.grey1));
    return top;
  },
};

// Head offsets for slouching etc.
const HEAD_SHIFT = { mike: [3, 3], augustus: [0, 4] };

/**
 * Draw a kid. (x, y) is the ground point between the feet.
 * o: pose, t, open, scared, scale, flip, sx, sy, tint ({color,a}),
 *    bodyTint ({color,a}), headScale, headOnly, rot
 * Returns the head centre in screen space.
 */
export function drawKid(ctx, kid, x, y, o = {}) {
  if (kid === 'wonka') return drawWonka(ctx, x, y, o);
  const pose = o.pose || 'idle';
  const t = o.t || 0;
  const s = o.scale ?? 1;
  const sx = o.sx ?? 1, sy = o.sy ?? 1;
  const bt = o.bodyTint;
  const c = bt && bt.a > 0 ? (col) => mix(col, bt.color, bt.a) : (col) => col;
  const bob = pose === 'idle' ? (Math.sin(t * 3) > 0.6 ? 1 : 0) : 0;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(s * sx * (o.flip ? -1 : 1), s * sy);
  let neck = -27;
  if (!o.headOnly) {
    ctx.translate(0, bob);
    neck = BODIES[kid](ctx, pose, t, c);
    ctx.translate(0, -bob);
  }
  const hs = o.headScale ?? 1;
  const [hdx, hdy] = HEAD_SHIFT[kid] || [0, 0];
  const hy = neck - 16 * hs + bob + hdy;
  drawHead(ctx, kid, hdx, hy, { open: o.open, scared: o.scared, tint: o.tint ?? bt, scale: hs, sx: o.headSx, sy: o.headSy });
  ctx.restore();
  return { x: x + hdx * s, y: y + hy * s * sy };
}

/* ------------------------------------------------------------ Willy Wonka */
// Plum velvet tailcoat, bottle-green trousers, pearly gloves, gold-topped
// cane, top hat. Moves in quick, jerky, birdlike snaps.
function hash(n) { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
export function drawWonka(ctx, x, y, o = {}) {
  const t = o.t || 0;
  const pose = o.pose || 'idle';
  const s = o.scale ?? 1;
  const step = Math.floor(t * 6);       // snap timing: birdlike jerks
  const jx = (hash(step) - 0.5) * 2;
  const tilt = (hash(step + 9) - 0.5) * 0.22;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(s * (o.flip ? -1 : 1), s);
  // long bottle-green legs
  const hop = pose === 'cheer' ? Math.round(Math.abs(Math.sin(t * 9)) * 3) : 0;
  ctx.translate(0, -hop);
  for (const lx of [-5, 2]) {
    rect(ctx, lx - 1, -18, 5, 16, OUT);
    rect(ctx, lx, -18, 3, 15, P.bottle1);
    rect(ctx, lx, -18, 1, 15, P.bottle0);
    rect(ctx, lx - 1, -4, 6, 4, OUT); rect(ctx, lx, -3, 5, 2, P.plum0);
  }
  // coat tails flaring behind
  const flap = Math.sin(t * 5) * 2;
  for (let i = 0; i < 6; i++) rect(ctx, -10 - i * 0.5 - flap * (i / 6), -20 + i * 2, 6, 2, i === 5 ? OUT : P.plum0);
  // body: plum velvet tailcoat over a waistcoat
  const top = -40;
  trap(ctx, top, -18, 14, 16, P.plum1);
  rect(ctx, -3, top + 2, 6, 18, P.gold1);           // waistcoat
  rect(ctx, -3, top + 2, 6, 2, P.white);            // cravat
  rect(ctx, -1, top + 4, 2, 2, P.pink0);
  for (let i = 0; i < 3; i++) rect(ctx, 0, top + 8 + i * 4, 1, 1, P.gold0);
  rect(ctx, -7, top + 1, 3, 18, P.plum2); rect(ctx, 4, top + 1, 3, 18, P.plum0); // lapels/velvet sheen
  // arms (snappy) with pearly grey gloves, cane in the right hand
  const D = Math.PI / 2;
  let la, ra;
  switch (pose) {
    case 'cheer': la = -D - 0.6 + jx * 0.2; ra = -D + 0.4; break;
    case 'present': la = D + 0.2; ra = -0.25 + jx * 0.15; break;
    case 'talk': la = -0.7 + jx * 0.5; ra = D - 0.3; break;
    case 'shrug': la = -0.5; ra = Math.PI + 0.5; break;
    default: la = D + 0.3; ra = D - 0.3 + jx * 0.08;
  }
  const sy = top + 4;
  const [lhx, lhy] = limb(ctx, -7, sy, la, 13, 5, OUT);
  limb(ctx, -7, sy, la, 13, 3, P.plum1);
  rect(ctx, Math.round(lhx) - 2, Math.round(lhy) - 2, 4, 4, P.pearl);
  const [rhx, rhy] = limb(ctx, 7, sy, ra, 13, 5, OUT);
  limb(ctx, 7, sy, ra, 13, 3, P.plum1);
  // cane
  const caneLen = 30;
  const ca = pose === 'cheer' ? -D + 0.2 : D + 0.05;
  const cx1 = rhx + Math.cos(ca) * caneLen, cy1 = rhy + Math.sin(ca) * caneLen;
  line(ctx, rhx, rhy - 4, cx1, cy1, 2, P.black);
  const kx = pose === 'cheer' ? cx1 : rhx, ky = pose === 'cheer' ? cy1 : rhy - 5;
  ellipse(ctx, kx, ky, 3, 3, OUT); ellipse(ctx, kx, ky, 2, 2, P.gold1); rect(ctx, kx - 1, ky - 1, 1, 1, P.gold3);
  rect(ctx, Math.round(rhx) - 2, Math.round(rhy) - 2, 4, 4, P.pearl);
  rect(ctx, Math.round(rhx) - 2, Math.round(rhy) - 2, 4, 1, P.pearl2);
  // head: snaps between tilts like a bird
  const hs = o.headScale ?? 1.15;
  drawHead(ctx, 'wonka', Math.round(jx), top - 18 * hs + 2, { open: o.open, scared: o.scared, scale: hs, rot: tilt });
  ctx.restore();
  return { x, y: y + (top - 18 * hs - hop) * s };
}

/* ------------------------------------------------------------ Oompa-Loompa */
// Book Oompa-Loompas: tiny, rosy-white skin, long golden-brown hair, deerskins.
const OL_SKIN = '#ffe4dc', OL_HAIR = '#b07a4a', OL_HAIR2 = '#d9a36e', OL_DEER = '#c49570', OL_DEER2 = '#8e6246';
export function drawOompa(ctx, x, y, t, o = {}) {
  const pose = o.pose || 'walk';
  const s = o.scale ?? 1;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(s * (o.flip ? -1 : 1), s);
  const step = Math.sin(t * 14 + (o.phase || 0));
  if (pose !== 'swim' && pose !== 'row') {
    const l1 = pose === 'walk' || pose === 'push' ? Math.max(0, step) * 2 : 0;
    const l2 = pose === 'walk' || pose === 'push' ? Math.max(0, -step) * 2 : 0;
    rect(ctx, -4, -6 - l1, 3, 6, OUT); rect(ctx, 1, -6 - l2, 3, 6, OUT);
    rect(ctx, -3, -6 - l1, 2, 5, OL_SKIN); rect(ctx, 2, -6 - l2, 2, 5, OL_SKIN);
  }
  const by = -6;
  if (pose !== 'swim') {
    rect(ctx, -5, by - 8, 10, 9, OUT);
    rect(ctx, -4, by - 7, 8, 7, OL_DEER);
    for (let i = -4; i < 4; i += 2) rect(ctx, i, by, 1, 1, OL_DEER2);
    rect(ctx, -4, by - 4, 8, 1, OL_DEER2);
  }
  let a1 = Math.PI / 2 + 0.3, a2 = Math.PI / 2 - 0.3;
  if (pose === 'push') { a1 = -0.1; a2 = 0.15; }
  if (pose === 'cheer') { a1 = -Math.PI / 2 - 0.5 + step * 0.3; a2 = -Math.PI / 2 + 0.5 - step * 0.3; }
  if (pose === 'row') { a1 = 0.4 + step * 0.6; a2 = 0.4 + step * 0.6; }
  if (pose === 'swim') { a1 = Math.PI + step * 0.8; a2 = -step * 0.8; }
  limb(ctx, -4, by - 6, a1, 5, 2, OL_SKIN);
  limb(ctx, 4, by - 6, a2, 5, 2, OL_SKIN);
  const hy = by - 13;
  ellipse(ctx, 0, hy + 1, 6, 7, OUT);
  ellipse(ctx, 0, hy + 1, 5, 6, OL_HAIR);
  rect(ctx, -5, hy + 2, 2, 6, OL_HAIR); rect(ctx, 3, hy + 2, 2, 6, OL_HAIR);
  ellipse(ctx, 1, hy + 1, 3, 4, OL_SKIN);
  rect(ctx, -2, hy - 4, 6, 2, OL_HAIR2);
  rect(ctx, 0, hy, 1, 1, OUT); rect(ctx, 3, hy, 1, 1, OUT);
  rect(ctx, -1, hy + 2, 1, 1, P.blush); rect(ctx, 4, hy + 2, 1, 1, P.blush);
  if (o.mouth) rect(ctx, 1, hy + 3, 2, 2, P.mouth); else rect(ctx, 1, hy + 3, 2, 1, P.mouth);
  ctx.restore();
}

export { line };
