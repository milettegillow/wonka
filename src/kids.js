// Kid bodies (code-drawn pixel sprites) + Oompa-Loompas.
// Origin for drawKid is the point between the feet. Heads are drawn with
// the hinged head renderer from faces.js.
import { P, mix } from './palette.js';
import { rect, ellipse, limb, line } from './engine.js';
import { drawHead } from './faces.js';

const OUT = '#3a1a1c';
const SKIN = '#f7c9a6';

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
    default: return [D + 0.22 + Math.sin(t * 2) * 0.04, D - 0.22 - Math.sin(t * 2) * 0.04];
  }
}

// Leg offsets: returns [leftLift, rightLift, leftX, rightX]
function legPose(pose, t) {
  switch (pose) {
    case 'walk': { const s = Math.sin(t * 10); return [Math.max(0, s) * 3, Math.max(0, -s) * 3, s * 2, -s * 2]; }
    case 'creep': { const s = Math.sin(t * 7); return [Math.max(0, s) * 4, Math.max(0, -s) * 4, s * 3, -s * 3]; }
    case 'freeze': return [4, 0, -3, 3];
    case 'cheer': { const j = Math.abs(Math.sin(t * 8)) * 2; return [j, j, -1, 1]; }
    case 'scared': { const s = Math.sin(t * 30); return [Math.max(0, s) * 3, Math.max(0, -s) * 3, 0, 0]; }
    default: return [0, 0, 0, 0];
  }
}

function legs(ctx, pose, t, o) {
  const { legH = 10, gap = 4, w = 4, pants, sock, shoe, pantsLen = 1 } = o;
  const [ll, rl, lx, rx] = legPose(pose, t);
  const legsXY = [[-gap - w + 2 + lx, ll], [gap - 2 + rx, rl]];
  for (const [x, lift] of legsXY) {
    const top = -legH - 1;
    const bottom = -3 - lift;
    const pl = Math.round((bottom - top) * pantsLen);
    rect(ctx, x - 1, top, w + 2, bottom - top + 1, OUT);
    rect(ctx, x, top, w, pl, pants);
    if (pl < bottom - top) rect(ctx, x, top + pl, w, bottom - top - pl, sock);
    rect(ctx, x - 1, bottom - 1, w + 3, 4, OUT);
    rect(ctx, x, bottom, w + 2, 2, shoe);
  }
}

function arms(ctx, pose, t, sx, sy, sleeve, hand, len = 10, w = 3) {
  const [la, ra] = armAngles(pose, t);
  limb(ctx, -sx, sy, la, len, w + 2, OUT);
  limb(ctx, sx, sy, ra, len, w + 2, OUT);
  limb(ctx, -sx, sy, la, len, w, sleeve, hand);
  limb(ctx, sx, sy, ra, len, w, sleeve, hand);
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

const BODIES = {
  charlie(ctx, pose, t, c) {
    const noLegs = pose === 'swim' || pose === 'sit';
    if (!noLegs) legs(ctx, pose, t, { pants: c('#7a6a5a'), sock: SKIN, shoe: c('#2e2522'), pantsLen: 0.7 });
    const top = -27;
    arms(ctx, pose, t, 7, top + 4, c('#6f7fb2'), SKIN);
    trap(ctx, top, -10, 14, 15, c('#6f7fb2'));
    rect(ctx, -7, -12, 14, 2, c('#5a6898'));
    rect(ctx, -5, -20, 4, 4, c('#9a7a52')); rect(ctx, -5, -20, 4, 1, c('#7d6040'));
    rect(ctx, 2, -15, 3, 3, c('#8a6a4a'));
    // scarf
    rect(ctx, -6, top - 1, 12, 4, c('#c0584a'));
    rect(ctx, 3, top + 2, 3, 8, c('#c0584a'));
    rect(ctx, 3, top + 4, 3, 1, c('#e08070')); rect(ctx, 3, top + 7, 3, 1, c('#e08070'));
    return top;
  },
  augustus(ctx, pose, t, c) {
    const noLegs = pose === 'swim' || pose === 'sit';
    if (!noLegs) legs(ctx, pose, t, { legH: 7, gap: 9, w: 6, pants: c('#2e8a4a'), sock: SKIN, shoe: c('#3a2418'), pantsLen: 0.6 });
    const cy = -19, rx = 21, ry = 14;
    ellipse(ctx, 0, cy, rx + 1, ry + 1, OUT);
    // striped tight jumper that's riding up
    ctx.save();
    for (let dy = -ry; dy <= ry; dy++) {
      const k = 1 - (dy / (ry + 0.5)) ** 2;
      if (k <= 0) continue;
      const hw = Math.round(rx * Math.sqrt(k));
      const band = Math.floor((dy + ry) / 3) % 2;
      let col = band ? c('#e8334a') : c('#fff0d8');
      if (dy > ry - 4) col = c('#ffcfa8');
      rect(ctx, -hw, cy + dy, hw * 2 + 1, 1, col);
    }
    ctx.restore();
    rect(ctx, -1, cy + ry - 3, 2, 1, c('#d08a68'));
    ellipse(ctx, 8, cy - 2, 3, 2, c('#7a3f1a'));
    rect(ctx, -12, cy + 4, 3, 2, c('#7a3f1a'));
    arms(ctx, pose, t, 18, cy - 7, c('#e8334a'), SKIN, 9, 5);
    return cy - ry + 2;
  },
  violet(ctx, pose, t, c) {
    const noLegs = pose === 'swim' || pose === 'sit';
    if (!noLegs) legs(ctx, pose, t, { pants: SKIN, sock: P.white, shoe: c(P.pink1), pantsLen: 0.45 });
    const top = -27;
    arms(ctx, pose, t, 7, top + 4, c(P.mint2), SKIN);
    trap(ctx, top, -14, 13, 14, c(P.mint2));
    trap(ctx, -19, -8, 12, 22, c(P.lemon1));
    rect(ctx, -4, top + 1, 2, 9, c(P.lemon1)); rect(ctx, 2, top + 1, 2, 9, c(P.lemon1));
    rect(ctx, -10, -10, 20, 1, c(P.lemon0));
    rect(ctx, 2, -16, 4, 3, c(P.lemon0));
    rect(ctx, 3, -16, 2, 1, c(P.pink1));
    return top;
  },
  veruca(ctx, pose, t, c) {
    const noLegs = pose === 'swim' || pose === 'sit';
    if (!noLegs) legs(ctx, pose, t, { pants: P.white, sock: P.white, shoe: c('#20141c'), pantsLen: 1 });
    const top = -28;
    arms(ctx, pose, t, 8, top + 4, c(P.lilac1), SKIN);
    trap(ctx, top, -6, 15, 22, c(P.lilac1));
    rect(ctx, -1, top + 2, 2, 20, c(P.lilac0));
    for (let i = 0; i < 4; i++) rect(ctx, 2, top + 4 + i * 5, 2, 2, c(P.gold1));
    rect(ctx, -11, -8, 22, 2, P.white);
    // fur collar
    ellipse(ctx, 0, top + 1, 9, 3, OUT);
    ellipse(ctx, 0, top + 1, 8, 2, P.white);
    rect(ctx, -5, top, 2, 1, P.grey3); rect(ctx, 3, top + 1, 2, 1, P.grey3);
    return top;
  },
  mike(ctx, pose, t, c) {
    const noLegs = pose === 'swim' || pose === 'sit';
    if (!noLegs) legs(ctx, pose, t, { pants: c('#3a5fb8'), sock: c('#3a5fb8'), shoe: c('#6b3a1c'), pantsLen: 1 });
    const top = -27;
    arms(ctx, pose, t, 7, top + 4, c('#4a8ae0'), SKIN);
    trap(ctx, top, -10, 14, 15, c('#4a8ae0'));
    // vest
    rect(ctx, -7, top + 1, 4, 16, c('#c08850')); rect(ctx, 3, top + 1, 4, 16, c('#c08850'));
    rect(ctx, -6, top + 5, 1, 1, c(P.gold1)); rect(ctx, 5, top + 5, 1, 1, c(P.gold1));
    // bandana
    rect(ctx, -5, top - 1, 10, 3, c(P.red1));
    rect(ctx, -2, top + 2, 4, 2, c(P.red1)); rect(ctx, -1, top + 4, 2, 1, c(P.red1));
    rect(ctx, -3, top, 1, 1, P.white); rect(ctx, 2, top + 1, 1, 1, P.white);
    // belt + holsters with toy pistols
    rect(ctx, -8, -12, 16, 2, c('#5a2e12'));
    rect(ctx, -1, -12, 3, 2, c(P.gold1));
    rect(ctx, -10, -12, 4, 7, c('#7a4220')); rect(ctx, 6, -12, 4, 7, c('#7a4220'));
    rect(ctx, -10, -15, 2, 4, c(P.grey1)); rect(ctx, 8, -15, 2, 4, c(P.grey1));
    return top;
  },
};

/**
 * Draw a kid. (x, y) is the ground point between the feet.
 * o: pose, t, open, scared, scale, flip, sx, sy, tint ({color,a}),
 *    bodyTint ({color,a}), headScale, headOnly, rot
 * Returns the head centre in screen space.
 */
export function drawKid(ctx, kid, x, y, o = {}) {
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
  const hy = neck - 16 * hs + bob;
  drawHead(ctx, kid, 0, hy, { open: o.open, scared: o.scared, tint: o.tint ?? bt, scale: hs, sx: o.headSx, sy: o.headSy });
  ctx.restore();
  return { x, y: y + hy * s * sy };
}

// Height from feet to head centre at scale 1.
export const HEAD_OFFSET = { charlie: 43, augustus: 33, violet: 43, veruca: 44, mike: 43 };

/* ------------------------------------------------------------ Oompa-Loompa */
// Book Oompa-Loompas: tiny, rosy-white skin, long golden-brown hair, deerskins.
const OL_SKIN = '#ffe4dc', OL_HAIR = '#b07a3a', OL_HAIR2 = '#d9a35a', OL_DEER = '#c49560', OL_DEER2 = '#8e6236';
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
  // tunic
  const by = -6;
  if (pose !== 'swim') {
    rect(ctx, -5, by - 8, 10, 9, OUT);
    rect(ctx, -4, by - 7, 8, 7, OL_DEER);
    for (let i = -4; i < 4; i += 2) rect(ctx, i, by, 1, 1, OL_DEER2);
    rect(ctx, -4, by - 4, 8, 1, OL_DEER2);
  }
  // arms
  let a1 = Math.PI / 2 + 0.3, a2 = Math.PI / 2 - 0.3;
  if (pose === 'push') { a1 = -0.1; a2 = 0.15; }
  if (pose === 'cheer') { a1 = -Math.PI / 2 - 0.5 + step * 0.3; a2 = -Math.PI / 2 + 0.5 - step * 0.3; }
  if (pose === 'row') { a1 = 0.4 + step * 0.6; a2 = 0.4 + step * 0.6; }
  if (pose === 'swim') { a1 = Math.PI + step * 0.8; a2 = -step * 0.8; }
  limb(ctx, -4, by - 6, a1, 5, 2, OL_SKIN);
  limb(ctx, 4, by - 6, a2, 5, 2, OL_SKIN);
  // head with long hair
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

// Tiny line helper re-export for scenes wanting oars etc.
export { line };
