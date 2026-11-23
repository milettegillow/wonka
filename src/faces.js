// Faces: South Park "Canadian" style hinged heads.
// Each head is a 40x40 face image split horizontally at `mouthY`. The top
// half hinges open around the back of the head when the kid talks/chomps.
//
// Real art: drop transparent 512x512 PNGs into /faces/{kid}.png and
// optionally /faces/{kid}-scared.png. Missing files fall back gracefully.
import { P } from './palette.js';

export const HEAD = 40;
export const KIDS = ['charlie', 'augustus', 'violet', 'veruca', 'mike'];

// Tune these. mouthY: 0..1 down the head where it splits.
// hinge: which side the lid hinges on when facing right ('back' = left side).
export const FACE_CONFIG = {
  charlie: { mouthY: 0.70, maxOpen: 0.75 },
  augustus: { mouthY: 0.70, maxOpen: 0.7 },
  violet: { mouthY: 0.70, maxOpen: 0.8 },
  veruca: { mouthY: 0.70, maxOpen: 0.75 },
  mike: { mouthY: 0.70, maxOpen: 0.75 },
};

const faces = {}; // kid -> { normal, scared, placeholder:{normal,scared}, real:{normal,scared} }

function mk() {
  const c = document.createElement('canvas');
  c.width = HEAD; c.height = HEAD;
  return c;
}

/* ------------------------------------------------ placeholder painter */
const OUT = '#3a1a1c';
function painter(c) {
  const g = c.getContext('2d');
  const r = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  const e = (cx, cy, rx, ry, col) => {
    g.fillStyle = col;
    for (let dy = -ry; dy <= ry; dy++) {
      const k = 1 - (dy / (ry + 0.5)) ** 2;
      if (k <= 0) continue;
      const hw = Math.round((rx + 0.5) * Math.sqrt(k) - 0.5);
      g.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
    }
  };
  return { g, r, e };
}

function faceShape(p, s) {
  const { cx = 20, cy, rx, ry, skin, shade } = s;
  // ears
  p.e(cx - rx, cy + 1, 3, 4, OUT); p.e(cx + rx, cy + 1, 3, 4, OUT);
  p.e(cx - rx, cy + 1, 2, 3, shade); p.e(cx + rx, cy + 1, 2, 3, shade);
  p.e(cx, cy, rx + 1, ry + 1, OUT);
  p.e(cx, cy, rx, ry, shade);
  p.e(cx - 1, cy - 1, rx - 1, ry - 1, skin);
}

function eyes(p, o) {
  const { cx = 20, y, dx, iris = OUT, scared, kind = 'normal', brow = OUT, skin, shade } = o;
  for (const side of [-1, 1]) {
    const sx = cx + side * dx;
    if (scared) {
      p.r(sx - 3, y - 4, 7, 8, OUT);
      p.r(sx - 2, y - 3, 5, 6, P.white);
      p.r(sx, y - 1, 1, 2, OUT);
      // worried brows: inner end up
      const inner = -side;
      p.r(sx - 2, y - 6, 5, 1, brow);
      p.r(sx + inner * 2, y - 7, 2, 1, brow);
      if (inner < 0) p.r(sx - 3, y - 8, 2, 1, brow); else p.r(sx + 2, y - 8, 2, 1, brow);
    } else if (kind === 'small') {
      p.r(sx - 1, y - 1, 3, 3, OUT);
      p.r(sx, y - 1, 1, 1, P.white);
      p.r(sx - 2, y - 4, 4, 1, brow);
    } else {
      p.r(sx - 2, y - 2, 5, 1, OUT);
      p.r(sx - 2, y - 1, 5, 3, P.white);
      p.r(sx - 1 + (kind === 'side' ? 1 : 0), y - 1, 2, 3, iris);
      p.r(sx - 1 + (kind === 'side' ? 1 : 0), y - 1, 1, 1, P.white);
      if (kind === 'lidded') { p.r(sx - 2, y - 1, 5, 1, shade); p.r(sx - 2, y - 2, 5, 1, OUT); }
      if (kind === 'lashes') { p.r(sx + side * 3, y - 3, 1, 1, OUT); p.r(sx - 2, y - 2, 5, 1, OUT); }
      if (kind === 'tv') { p.r(sx + 1, y, 1, 1, P.blue3); }
      if (o.browTilt) {
        p.r(sx - 2, y - 4 - (side === o.browTilt ? 1 : 0), 3, 1, brow);
        p.r(sx + 1, y - 4 - (side === o.browTilt ? 2 : 0), 2, 1, brow);
      } else p.r(sx - 2, y - 5, 5, 1, brow);
    }
  }
}

function scaredMouth(p, cx = 20, my = 28) {
  p.e(cx, my, 3, 4, OUT);
  p.e(cx, my, 2, 3, P.mouth);
  p.r(cx - 1, my + 2, 3, 1, P.tongue);
  p.r(cx - 2, my - 3, 5, 1, P.white);
}

function sweat(p, x, y) {
  p.r(x, y, 2, 3, '#bfe9ff');
  p.r(x, y + 3, 2, 1, '#7cc6f0');
  p.r(x + 1, y - 1, 1, 1, '#bfe9ff');
}

const DRAW = {
  charlie(p, scared) {
    const skin = scared ? '#fbe2cf' : '#f8d3b7';
    const shade = '#e2ab8a';
    const hair = '#4a2a18', hairHi = '#6e4226';
    p.e(20, 15, 15, 11, OUT);
    p.e(20, 15, 14, 10, hair);
    faceShape(p, { cy: 22, rx: 12, ry: 14, skin, shade });
    // fringe + tufts
    p.r(9, 8, 23, 4, hair);
    for (let x = 9; x < 31; x += 3) p.r(x, 12, 2, x % 2 ? 2 : 3, hair);
    p.r(13, 4, 2, 3, hair); p.r(19, 3, 2, 4, hair); p.r(25, 4, 2, 3, hair);
    p.r(12, 9, 5, 1, hairHi); p.r(21, 8, 6, 1, hairHi);
    // hollow cheeks
    p.r(10, 25, 1, 3, shade); p.r(30, 25, 1, 3, shade);
    eyes(p, { y: 21, dx: 5, iris: '#5a3a22', scared, brow: hair, skin, shade });
    p.r(20, 23, 1, 3, shade);
    if (scared) { scaredMouth(p); sweat(p, 31, 15); }
    else {
      p.r(16, 27, 9, 1, P.mouth); p.r(15, 26, 1, 1, P.mouth); p.r(25, 26, 1, 1, P.mouth);
      p.r(14, 25, 2, 1, P.blush); p.r(25, 25, 2, 1, P.blush);
    }
  },
  augustus(p, scared) {
    const skin = scared ? '#ffe0c4' : '#ffcfa8';
    const shade = '#efa47c';
    faceShape(p, { cy: 22, rx: 18, ry: 16, skin, shade });
    // chins
    p.r(9, 34, 22, 1, shade); p.r(12, 36, 16, 1, shade);
    // slicked thin hair
    p.e(20, 8, 11, 3, '#b8662c');
    p.r(12, 7, 16, 1, '#de8a46');
    p.r(22, 4, 3, 2, '#b8662c'); p.r(24, 3, 2, 1, '#b8662c');
    // fat cheeks
    p.e(8, 25, 4, 3, P.blush); p.e(32, 25, 4, 3, P.blush);
    p.e(8, 24, 3, 1, '#ffb0b6'); p.e(32, 24, 3, 1, '#ffb0b6');
    eyes(p, { y: 19, dx: 4, scared, kind: 'small', brow: '#b8662c', skin, shade });
    p.r(18, 22, 4, 2, shade); p.r(18, 22, 2, 1, '#ffe2cc');
    if (scared) { scaredMouth(p, 20, 29); sweat(p, 33, 12); }
    else {
      p.r(13, 27, 15, 1, P.mouth); p.r(12, 26, 1, 1, P.mouth); p.r(28, 26, 1, 1, P.mouth);
      // chocolate smears
      p.e(25, 30, 3, 1, P.choc3); p.r(14, 31, 2, 1, P.choc3); p.r(22, 25, 2, 1, P.choc3);
    }
    p.r(26, 31, 2, 2, P.choc2);
  },
  violet(p, scared) {
    const skin = scared ? '#ffe6d6' : '#fcd2b6';
    const shade = '#e5a685';
    const hair = '#8a3f22', hairHi = '#b8632f';
    // bunches
    p.e(5, 13, 5, 6, OUT); p.e(35, 13, 5, 6, OUT);
    p.e(5, 13, 4, 5, hair); p.e(35, 13, 4, 5, hair);
    p.r(3, 11, 2, 3, hairHi); p.r(36, 11, 2, 3, hairHi);
    p.e(20, 15, 14, 11, OUT); p.e(20, 15, 13, 10, hair);
    faceShape(p, { cy: 22, rx: 12, ry: 14, skin, shade });
    p.r(9, 8, 23, 5, hair); p.r(9, 13, 2, 3, hair); p.r(30, 13, 2, 3, hair);
    p.r(11, 9, 18, 1, hairHi);
    // bobbles
    p.r(8, 10, 3, 4, P.pink1); p.r(30, 10, 3, 4, P.pink1); p.r(8, 10, 1, 1, P.pink3); p.r(30, 10, 1, 1, P.pink3);
    eyes(p, { y: 21, dx: 5, iris: '#3a5fd0', scared, kind: scared ? 'normal' : 'lidded', brow: hair, skin, shade });
    p.r(20, 23, 1, 2, shade);
    if (scared) { scaredMouth(p); sweat(p, 31, 14); }
    else {
      // chewing smirk with gum
      p.e(28, 26, 3, 2, shade); p.e(28, 25, 3, 2, skin);
      p.r(15, 27, 9, 1, P.mouth); p.r(24, 26, 1, 1, P.mouth);
      p.r(21, 27, 3, 1, P.pink1);
      p.r(13, 24, 2, 1, P.blush);
    }
  },
  veruca(p, scared) {
    const skin = scared ? '#ffeadc' : '#fdd8c0';
    const shade = '#eaa98a';
    const hair = '#f2b632', hairSh = '#c98a1a';
    p.e(20, 17, 16, 13, OUT); p.e(20, 17, 15, 12, hair);
    // ringlets
    for (let y = 14; y <= 34; y += 5) {
      p.e(5, y, 3, 3, OUT); p.e(35, y, 3, 3, OUT);
      p.e(5, y, 2, 2, (y / 5) % 2 ? hair : hairSh); p.e(35, y, 2, 2, (y / 5) % 2 ? hairSh : hair);
    }
    faceShape(p, { cy: 22, rx: 12, ry: 14, skin, shade });
    p.e(20, 10, 12, 4, hair);
    p.r(9, 10, 4, 6, hair); p.r(28, 10, 4, 6, hair);
    p.r(14, 8, 3, 1, P.gold3); p.r(23, 8, 3, 1, hairSh);
    // bow
    p.e(25, 5, 4, 3, OUT); p.e(34, 5, 4, 3, OUT);
    p.e(25, 5, 3, 2, P.pink1); p.e(34, 5, 3, 2, P.pink1);
    p.r(28, 3, 3, 4, P.pink0); p.r(24, 4, 2, 1, P.pink3);
    eyes(p, { y: 21, dx: 5, iris: '#3f8a5a', scared, kind: 'lashes', brow: hairSh, browTilt: 1, skin, shade });
    p.r(20, 24, 2, 1, shade); p.r(20, 25, 1, 1, P.skinDeep); p.r(22, 25, 1, 1, P.skinDeep);
    if (scared) { scaredMouth(p); sweat(p, 31, 15); }
    else {
      p.r(17, 27, 7, 1, '#c03a62'); p.r(18, 26, 5, 1, '#ef6f92');
      p.e(13, 25, 2, 1, P.blush); p.e(27, 25, 2, 1, P.blush);
    }
  },
  mike(p, scared) {
    const skin = scared ? '#ffe4d0' : '#f9cdaa';
    const shade = '#e0a07c';
    const hair = '#3b2416';
    p.e(20, 18, 14, 10, OUT); p.e(20, 18, 13, 9, hair);
    faceShape(p, { cy: 23, rx: 12, ry: 13, skin, shade });
    p.r(9, 13, 4, 5, hair); p.r(27, 13, 4, 5, hair);
    // cowboy hat
    p.e(20, 7, 10, 6, OUT); p.e(20, 7, 9, 5, '#9a5a2c');
    p.r(17, 2, 6, 2, '#7a4220');
    p.r(2, 11, 36, 4, OUT);
    p.r(3, 12, 34, 2, '#7a4220'); p.r(1, 10, 3, 2, OUT); p.r(36, 10, 3, 2, OUT);
    p.r(11, 9, 18, 2, P.red1);
    p.r(13, 5, 3, 3, '#b87442');
    eyes(p, { y: 21, dx: 5, iris: '#2a7ab8', scared, kind: 'tv', brow: hair, skin, shade });
    p.r(20, 23, 1, 2, shade);
    // freckles
    for (const [x, y] of [[14, 24], [16, 25], [24, 24], [26, 25], [15, 23], [25, 23]]) p.r(x, y, 1, 1, '#c97a52');
    if (scared) { scaredMouth(p); sweat(p, 32, 16); }
    else { p.r(15, 27, 10, 1, P.mouth); p.r(15, 26, 1, 1, P.mouth); p.r(17, 27, 6, 1, P.white); }
  },
};

export function drawPlaceholder(kid, scared) {
  const c = mk();
  DRAW[kid](painter(c), scared);
  return c;
}

/* ------------------------------------------------------------- loading */
export function rowExtents(c, row) {
  const d = c.getContext('2d').getImageData(0, row, HEAD, 1).data;
  let l = -1, r = -1;
  for (let x = 0; x < HEAD; x++) if (d[x * 4 + 3] > 40) { if (l < 0) l = x; r = x; }
  if (l < 0) return [6, 34];
  return [l, r + 1];
}

function finalize(kid) {
  const f = faces[kid];
  f.normal = f.real.normal || f.placeholder.normal;
  f.scared = f.real.scared || f.real.normal || f.placeholder.scared;
  const split = splitRow(kid);
  f.ext = rowExtents(f.normal, Math.max(0, split - 1));
  f.extScared = rowExtents(f.scared, Math.max(0, split - 1));
}

export function splitRow(kid) {
  return Math.round(HEAD * (FACE_CONFIG[kid]?.mouthY ?? 0.7));
}

function downscale(img) {
  const c = mk();
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, 0, 0, HEAD, HEAD);
  return c;
}

function loadImg(url) {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img.naturalWidth > 1 ? img : null);
    img.onerror = () => res(null);
    img.src = url;
  });
}

let ready = false;
export function initPlaceholders() {
  if (ready) return;
  ready = true;
  for (const kid of KIDS) {
    faces[kid] = {
      placeholder: { normal: drawPlaceholder(kid, false), scared: drawPlaceholder(kid, true) },
      real: { normal: null, scared: null },
      raw: { normal: null, scared: null },
    };
    finalize(kid);
  }
}

// Load optional real face PNGs. Resolves once every attempt has settled.
export async function loadFaces(base = 'faces/') {
  initPlaceholders();
  const jobs = [];
  for (const kid of KIDS) {
    for (const v of ['normal', 'scared']) {
      const url = `${base}${kid}${v === 'scared' ? '-scared' : ''}.png`;
      jobs.push(loadImg(url).then((img) => {
        if (!img) return;
        faces[kid].raw[v] = img;
        faces[kid].real[v] = downscale(img);
      }));
    }
  }
  await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, 4000))]);
  for (const kid of KIDS) finalize(kid);
  return faces;
}

export function getFaces() { return faces; }
export function refreshFace(kid) { finalize(kid); }

/* ------------------------------------------------------------ renderer */
let scratch = null;
function tinted(src, color, a) {
  if (!scratch) scratch = mk();
  const g = scratch.getContext('2d');
  g.clearRect(0, 0, HEAD, HEAD);
  g.globalCompositeOperation = 'source-over';
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = a;
  g.fillStyle = color;
  g.fillRect(0, 0, HEAD, HEAD);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  return scratch;
}

/**
 * Draw a hinged head centred at (x, y).
 * o.open   0..1 how far the lid is hinged open
 * o.scared use the scared face
 * o.scale  uniform scale; o.sx / o.sy extra squash/stretch
 * o.flip   face left (hinge moves to the right side)
 * o.rot    rotation in radians
 * o.tint   { color, a } colour wash (e.g. Violet turning blue)
 * o.img    override face canvas (for the dev page)
 */
export function drawHead(ctx, kid, x, y, o = {}) {
  const f = faces[kid];
  if (!f) return;
  const scared = !!o.scared;
  let img = o.img || (scared ? f.scared : f.normal);
  const ext = o.ext || (scared ? f.extScared : f.ext);
  if (o.tint && o.tint.a > 0) img = tinted(img, o.tint.color, o.tint.a);
  const cfg = FACE_CONFIG[kid] || {};
  const split = o.split ?? splitRow(kid);
  const s = o.scale ?? 1;
  const half = HEAD / 2;
  const open = Math.max(0, Math.min(1, o.open || 0));
  const ang = -open * (cfg.maxOpen ?? 0.75);

  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(s * (o.sx ?? 1) * (o.flip ? -1 : 1), s * (o.sy ?? 1));
  if (o.alpha != null) ctx.globalAlpha = o.alpha;

  // lower jaw
  ctx.drawImage(img, 0, split, HEAD, HEAD - split, -half, -half + split, HEAD, HEAD - split);

  const hx = -half + ext[0];
  const hy = -half + split;
  const reach = ext[1] - ext[0];
  if (open > 0.01) {
    // mouth wedge
    const ex = hx + Math.cos(ang) * reach, ey = hy + Math.sin(ang) * reach;
    ctx.fillStyle = P.mouth;
    ctx.beginPath();
    ctx.moveTo(hx + 1, hy + 1);
    ctx.lineTo(hx + reach - 1, hy + 1);
    ctx.lineTo(ex, ey);
    ctx.closePath();
    ctx.fill();
    // tongue
    ctx.fillStyle = P.tongue;
    ctx.fillRect(Math.round(hx + reach * 0.45), hy - 2, Math.round(reach * 0.35), 2);
  }
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(ang);
  if (open > 0.01) {
    // teeth along the upper lip
    ctx.fillStyle = P.white;
    ctx.fillRect(Math.round(reach * 0.35), 0, Math.round(reach * 0.5), 2);
  }
  ctx.drawImage(img, 0, 0, HEAD, split, -ext[0], -split, HEAD, split);
  ctx.restore();
  ctx.restore();
}
