// Faces: South Park "Canadian" style hinged heads.
// Each head is a 40x40 face image split horizontally at `mouthY`. The top
// half hinges open around the back of the head when the character talks,
// chomps, cheers or screams.
//
// Real art: drop transparent 512x512 PNGs into /faces/{name}.png and
// optionally /faces/{name}-scared.png. Missing files fall back gracefully.
import { P } from './palette.js';

export const HEAD = 40;
export const KIDS = ['charlie', 'augustus', 'violet', 'veruca', 'mike'];
export const CHARACTERS = [...KIDS, 'wonka'];

// Tune these with /faces.html. mouthY: 0..1 down the head where it splits.
export const FACE_CONFIG = {
  charlie: { mouthY: 0.700, maxOpen: 0.75 },
  augustus: { mouthY: 0.700, maxOpen: 0.7 },
  violet: { mouthY: 0.700, maxOpen: 0.8 },
  veruca: { mouthY: 0.700, maxOpen: 0.8 },
  mike: { mouthY: 0.700, maxOpen: 0.75 },
  wonka: { mouthY: 0.775, maxOpen: 0.7 },
};

const faces = {}; // name -> { normal, scared, placeholder:{normal,scared}, real:{normal,scared}, raw }

function mk() {
  const c = document.createElement('canvas');
  c.width = HEAD; c.height = HEAD;
  return c;
}

/* ------------------------------------------------ placeholder painter */
const OUT = '#3a1428';
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
  // 1px-stepped line with brush w
  const l = (x0, y0, x1, y1, col, w = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    g.fillStyle = col;
    for (let i = 0; i <= n; i++) g.fillRect(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), w, w);
  };
  return { g, r, e, l };
}

function faceShape(p, s) {
  const { cx = 20, cy, rx, ry, skin, shade, ears = true } = s;
  if (ears) {
    p.e(cx - rx, cy + 1, 3, 4, OUT); p.e(cx + rx, cy + 1, 3, 4, OUT);
    p.e(cx - rx, cy + 1, 2, 3, shade); p.e(cx + rx, cy + 1, 2, 3, shade);
  }
  p.e(cx, cy, rx + 1, ry + 1, OUT);
  p.e(cx, cy, rx, ry, shade);
  p.e(cx - 1, cy - 1, rx - 1, ry - 1, skin);
}

// Bulging terrified eyes with pinprick pupils.
function bulgeEyes(p, cx, y, dx, rx = 3, ry = 4) {
  for (const s of [-1, 1]) {
    const sx = cx + s * dx;
    p.e(sx, y, rx + 1, ry + 1, OUT);
    p.e(sx, y, rx, ry, P.white);
    p.r(sx, y, 1, 1, OUT);
    p.r(sx - rx + 1, y + ry - 1, 1, 1, P.red2); // little veins
  }
}
// Eyebrows flying up off the forehead (worried, inner ends high).
function flyingBrows(p, cx, y, dx, col) {
  p.l(cx - dx - 4, y, cx - dx + 2, y - 4, col, 2);
  p.l(cx + dx + 3, y, cx + dx - 3, y - 4, col, 2);
}
function tears(p, x, y, len) {
  p.r(x, y, 2, len, P.tear);
  p.r(x, y + len, 2, 2, P.tearDeep);
  p.r(x, y, 1, len, P.white);
}
function sweat(p, x, y) {
  p.r(x, y, 3, 4, P.tear); p.r(x + 1, y - 2, 1, 2, P.tear);
  p.r(x, y + 4, 3, 1, P.tearDeep); p.r(x, y + 1, 1, 2, P.white);
}
// Huge gaping scream across the split line.
function gape(p, cx, my, rx, ry) {
  p.e(cx, my, rx + 1, ry + 1, OUT);
  p.e(cx, my, rx, ry, P.mouth);
  p.e(cx, my + ry - 2, rx - 2, 2, P.tongue);
  p.r(cx - rx + 2, my - ry + 1, rx * 2 - 3, 2, P.white);
  p.r(cx, my - ry + 3, 1, 2, '#c43a6a'); // uvula
}

const DRAW = {
  charlie(p, scared) {
    // skinny, starving, too-big hopeful eyes, threadbare
    const skin = scared ? '#fde6da' : '#fbdccb';
    const shade = '#d7a38e';
    const hair = '#4a2a20', hairHi = '#6e4232';
    p.e(20, 14, 14, 11, OUT); p.e(20, 14, 13, 10, hair);
    faceShape(p, { cy: 22, rx: 11, ry: 14, skin, shade });
    // hollow cheeks + sunken temples
    p.r(10, 23, 2, 6, shade); p.r(29, 23, 2, 6, shade);
    p.r(11, 29, 2, 2, shade); p.r(28, 29, 2, 2, shade);
    // messy fringe
    p.r(9, 8, 22, 4, hair);
    for (let x = 9; x < 30; x += 3) p.r(x, 12, 2, (x % 2) ? 2 : 3, hair);
    p.r(13, 3, 2, 3, hair); p.r(19, 2, 2, 4, hair); p.r(25, 4, 2, 3, hair); p.r(28, 6, 2, 2, hair);
    p.r(12, 9, 5, 1, hairHi); p.r(21, 8, 6, 1, hairHi);
    if (scared) {
      bulgeEyes(p, 20, 20, 5, 3, 4);
      flyingBrows(p, 20, 14, 5, hair);
      gape(p, 20, 29, 4, 5);
      tears(p, 12, 24, 6); tears(p, 27, 24, 7);
      sweat(p, 31, 12);
    } else {
      // too-big shining eyes
      for (const sx of [15, 25]) {
        p.e(sx, 20, 4, 4, OUT); p.e(sx, 20, 3, 3, P.white);
        p.e(sx, 21, 2, 2, '#6b3a26'); p.r(sx - 1, 21, 2, 2, OUT);
        p.r(sx - 2, 18, 2, 2, P.white); p.r(sx + 1, 22, 1, 1, P.white);
      }
      // hopeful brows (inner ends lifted)
      p.l(11, 15, 16, 13, hair); p.l(29, 15, 24, 13, hair);
      p.r(20, 24, 1, 2, shade);
      p.r(17, 27, 7, 1, P.mouth); p.r(16, 26, 1, 1, P.mouth); p.r(24, 26, 1, 1, P.mouth);
      p.r(18, 28, 5, 1, '#e98a9c');
    }
  },

  augustus(p, scared) {
    // a monstrous ball of dough: chins, cheeks swallowing the eyes, chocolate
    const skin = scared ? '#ffdcc4' : '#ffcfae';
    const shade = '#e99c7a';
    faceShape(p, { cy: 21, rx: 19, ry: 17, skin, shade, ears: false });
    // stacked chins
    for (const [y, w] of [[32, 24], [34, 20], [36, 15], [38, 9]]) {
      p.r(20 - (w >> 1), y, w, 1, shade);
      p.r(20 - (w >> 1) + 2, y - 1, w - 4, 1, '#ffe2cf');
    }
    // thin slicked hair with a parting
    p.e(20, 6, 9, 3, OUT); p.e(20, 6, 8, 2, '#c06a34');
    p.r(16, 5, 1, 3, '#8e4a22'); p.r(21, 4, 5, 1, '#e0894c');
    // vast cheeks pushing up into the eyes
    p.e(9, 23, 7, 6, shade); p.e(31, 23, 7, 6, shade);
    p.e(9, 22, 6, 5, '#ffb9a6'); p.e(31, 22, 6, 5, '#ffb9a6');
    p.e(7, 20, 2, 1, P.white); p.e(29, 20, 2, 1, P.white);
    if (scared) {
      // even tiny eyes go wide
      for (const sx of [14, 26]) { p.r(sx - 2, 14, 5, 4, OUT); p.r(sx - 1, 15, 3, 2, P.white); p.r(sx, 15, 1, 1, OUT); }
      flyingBrows(p, 20, 10, 6, '#c06a34');
      p.e(20, 20, 2, 1, shade); p.r(19, 20, 1, 1, P.skinDeep); p.r(21, 20, 1, 1, P.skinDeep);
      gape(p, 20, 28, 6, 5);
      p.e(13, 31, 2, 1, P.choc3); p.r(27, 30, 3, 1, P.choc3);
      sweat(p, 2, 8); sweat(p, 35, 6);
      tears(p, 9, 17, 4); tears(p, 30, 17, 4);
    } else {
      // greedy little currant eyes, squeezed into slits by the cheeks
      p.r(12, 16, 5, 2, OUT); p.r(13, 16, 1, 1, P.white);
      p.r(24, 16, 5, 2, OUT); p.r(25, 16, 1, 1, P.white);
      p.r(12, 13, 5, 1, '#c06a34'); p.r(24, 13, 5, 1, '#c06a34');
      // piggy upturned nose
      p.e(20, 21, 3, 2, shade); p.r(18, 22, 1, 1, P.skinDeep); p.r(21, 22, 1, 1, P.skinDeep); p.r(19, 20, 2, 1, '#ffe2cf');
      // greedy grin + chocolate everywhere
      p.r(11, 27, 19, 1, P.mouth); p.r(10, 26, 1, 1, P.mouth); p.r(30, 26, 1, 1, P.mouth);
      p.r(13, 26, 15, 1, P.white);
      p.e(13, 29, 3, 2, P.choc3); p.e(27, 29, 4, 2, P.choc3); p.r(16, 25, 3, 1, P.choc3);
      p.r(25, 30, 1, 4, P.choc2); p.r(14, 30, 1, 3, P.choc2); p.r(30, 24, 2, 1, P.choc3);
      p.r(20, 29, 3, 1, P.choc3);
    }
  },

  violet(p, scared) {
    // gum-chewing champion: smug lidded eyes, jaw working, bubble
    const skin = scared ? '#fde4d6' : '#fcd5bd';
    const shade = '#e3a586';
    // blonde, pulled up into one high ponytail at the back of the crown
    const hair = '#f2c766', hairHi = '#fde7a2', hairSh = '#c9963a';
    // the tail: springs up from the crown and swings down behind her right side
    const tail = [[25, 3, 3], [28, 1, 3], [31, 1, 3], [33, 3, 3], [34, 6, 3], [35, 10, 3], [35, 14, 2], [35, 18, 2], [36, 21, 2], [36, 24, 1]];
    for (const [x, y, r] of tail) p.e(x, y, r + 1, r + 1, OUT);
    for (const [x, y, r] of tail) p.e(x, y, r, r, hair);
    for (const [x, y, r] of tail.slice(1, 7)) p.r(x - 1, y - r + 1, 2, 1, hairHi);
    p.l(35, 8, 36, 19, hairSh); p.l(29, 0, 32, 1, hairHi);
    p.e(20, 15, 14, 11, OUT); p.e(20, 15, 13, 10, hair);
    faceShape(p, { cy: 22, rx: 12, ry: 14, skin, shade });
    // hair scraped back: smooth top, a short side-swept fringe
    p.r(9, 8, 22, 4, hair); p.r(9, 12, 2, 3, hair); p.r(29, 12, 2, 4, hair);
    p.l(10, 12, 18, 9, hair, 2); p.r(11, 13, 4, 1, hair);
    for (let x = 12; x < 28; x += 4) p.r(x, 6, 1, 4, hairSh);
    p.r(12, 7, 14, 1, hairHi); p.r(14, 5, 8, 1, hairHi);
    // pink scrunchie round the ponytail
    p.e(25, 4, 3, 2, OUT); p.e(25, 4, 2, 1, P.pink1); p.r(24, 3, 1, 1, P.pink3);
    if (scared) {
      bulgeEyes(p, 20, 20, 5, 3, 4);
      flyingBrows(p, 20, 14, 5, hairSh);
      gape(p, 20, 29, 5, 5);
      p.l(15, 28, 25, 30, P.pink1); // gum strand across the scream
      tears(p, 12, 24, 5); tears(p, 28, 24, 6);
      sweat(p, 31, 13);
    } else {
      // smug half-lidded eyes
      for (const sx of [15, 25]) {
        p.r(sx - 3, 19, 6, 1, OUT); p.r(sx - 3, 20, 6, 3, P.white);
        p.r(sx - 3, 20, 6, 1, shade);
        p.r(sx - 1, 21, 2, 2, P.lilac1); p.r(sx - 1, 21, 1, 1, OUT);
        p.r(sx + 3, 18, 1, 1, OUT);
      }
      p.l(11, 16, 17, 16, hairSh); p.l(23, 15, 29, 13, hairSh); // one brow cocked
      p.r(20, 24, 1, 2, shade);
      // chewing jaw: lopsided mouth, bulging cheek
      p.e(29, 26, 4, 3, shade); p.e(28, 25, 4, 3, skin);
      p.r(17, 27, 8, 1, P.mouth); p.r(25, 26, 1, 1, P.mouth);
      p.r(26, 25, 1, 1, P.mouth);
      // bubble swelling from the corner
      p.e(14, 27, 4, 4, '#e0407e'); p.e(14, 27, 3, 3, P.pink2); p.r(12, 25, 2, 1, P.white);
      p.r(11, 23, 2, 1, P.blush);
    }
  },

  veruca(p, scared) {
    // spoilt rotten: upturned snout, sneer, tantrum brows, ringlets + bow
    const skin = scared ? '#ffc9c0' : '#fdd8c4';
    const shade = '#e7a48a';
    // rich chocolate-brown ringlets
    const hair = '#7a4122', hairSh = '#52291a', hairHi = '#a8653a';
    p.e(20, 17, 16, 13, OUT); p.e(20, 17, 15, 12, hair);
    for (let y = 13; y <= 35; y += 5) {
      for (const x of [4, 36]) { p.e(x, y, 3, 3, OUT); p.e(x, y, 2, 2, ((y / 5) | 0) % 2 ? hair : hairSh); p.r(x - 1, y - 1, 1, 1, hairHi); }
    }
    faceShape(p, { cy: 22, rx: 12, ry: 14, skin, shade });
    p.e(20, 10, 12, 4, hair);
    p.r(9, 10, 4, 6, hair); p.r(27, 10, 4, 6, hair);
    p.r(14, 8, 3, 1, hairHi); p.r(22, 9, 2, 1, hairHi);
    // enormous bow
    p.e(23, 4, 5, 4, OUT); p.e(35, 4, 5, 4, OUT);
    p.e(23, 4, 4, 3, P.pink1); p.e(35, 4, 4, 3, P.pink1);
    p.r(27, 2, 4, 5, P.pink0); p.r(21, 2, 3, 1, P.pink3); p.r(33, 2, 3, 1, P.pink3);
    p.r(28, 7, 2, 4, P.pink1);
    if (scared) {
      // full screaming tantrum: eyes squeezed shut, tears spraying
      p.l(12, 18, 16, 20, OUT, 2); p.l(12, 22, 16, 20, OUT, 2);
      p.l(28, 18, 24, 20, OUT, 2); p.l(28, 22, 24, 20, OUT, 2);
      p.l(10, 14, 17, 17, hairSh, 2); p.l(30, 14, 23, 17, hairSh, 2);
      p.r(5, 20, 3, 2, P.tear); p.r(2, 23, 2, 2, P.tear); p.r(33, 20, 3, 2, P.tear); p.r(37, 23, 2, 2, P.tear);
      p.e(20, 24, 2, 1, shade); p.r(19, 24, 1, 1, OUT); p.r(21, 24, 1, 1, OUT);
      p.r(12, 25, 17, 9, OUT); p.r(13, 26, 15, 7, P.mouth);
      p.r(13, 26, 15, 1, P.white); p.r(13, 32, 15, 1, P.white); p.r(16, 30, 9, 2, P.tongue);
      p.e(10, 24, 2, 1, P.red1); p.e(30, 24, 2, 1, P.red1);
    } else {
      // furious little eyes under tantrum brows
      for (const sx of [15, 25]) { p.r(sx - 2, 20, 5, 2, P.white); p.r(sx - 1, 20, 2, 2, '#4f8a6a'); p.r(sx - 2, 22, 5, 1, shade); }
      p.l(10, 16, 17, 19, hairSh, 2); p.l(30, 16, 23, 19, hairSh, 2);
      // upturned snout with nostrils on show
      p.e(20, 24, 3, 2, shade); p.e(20, 23, 2, 1, skin);
      p.r(18, 25, 2, 1, OUT); p.r(21, 25, 2, 1, OUT);
      // sneer: one side curled up showing teeth
      p.r(15, 27, 10, 1, P.mouth); p.r(22, 25, 4, 1, P.mouth); p.r(25, 26, 1, 1, P.mouth);
      p.r(21, 26, 4, 1, P.white);
      p.e(11, 25, 2, 1, P.red2); p.e(29, 25, 2, 1, P.red2);
    }
  },

  mike(p, scared) {
    // telly-addled: square glassy eyes, dark circles, cowboy hat
    const skin = scared ? '#fbe2d4' : '#f2d2c0';
    const shade = '#d1a08c';
    const hair = '#3b2418';
    p.e(20, 18, 14, 10, OUT); p.e(20, 18, 13, 9, hair);
    faceShape(p, { cy: 23, rx: 12, ry: 13, skin, shade });
    p.r(9, 13, 4, 5, hair); p.r(27, 13, 4, 5, hair);
    const hy = scared ? -3 : 0; // hat jumps off in fright
    p.e(20, 7 + hy, 10, 6, OUT); p.e(20, 7 + hy, 9, 5, '#93593a');
    p.r(17, 2 + hy, 6, 2, '#6e3d24');
    p.r(2, 11 + hy, 36, 4, OUT); p.r(3, 12 + hy, 34, 2, '#6e3d24');
    p.r(1, 10 + hy, 3, 2, OUT); p.r(36, 10 + hy, 3, 2, OUT);
    p.r(11, 9 + hy, 18, 2, P.red1); p.r(13, 5 + hy, 3, 3, '#b07a55');
    for (const [x, y] of [[13, 26], [15, 27], [25, 26], [27, 27], [14, 25], [26, 25]]) p.r(x, y, 1, 1, '#c58566');
    if (scared) {
      for (const sx of [15, 25]) { p.r(sx - 4, 16, 8, 8, OUT); p.r(sx - 3, 17, 6, 6, P.white); p.r(sx, 19, 1, 1, OUT); }
      flyingBrows(p, 20, 14, 5, hair);
      gape(p, 20, 30, 5, 5);
      sweat(p, 32, 15); tears(p, 11, 24, 5);
    } else {
      // square TV-stare eyes with scanlines + bruised dark circles
      for (const sx of [15, 25]) {
        p.r(sx - 3, 17, 7, 7, OUT);
        p.r(sx - 2, 18, 5, 5, '#f1ebff');
        p.r(sx - 2, 19, 5, 1, P.lilac3); p.r(sx - 2, 21, 5, 1, P.lilac3);
        p.r(sx, 20, 1, 1, OUT);
        p.r(sx - 3, 24, 7, 1, '#9c7a9e'); p.r(sx - 2, 25, 5, 1, '#c79fb6');
      }
      p.r(11, 15, 7, 1, hair); p.r(22, 15, 7, 1, hair);
      p.r(20, 25, 1, 2, shade);
      // slack jaw, half open
      p.r(17, 27, 7, 1, P.mouth); p.r(17, 28, 7, 2, P.mouth); p.r(19, 29, 3, 1, P.tongue);
    }
  },

  wonka(p, scared) {
    // top hat, twinkling eyes, neat pointed black goatee
    const skin = scared ? '#fbe0cd' : '#f6cfb2';
    const shade = '#d99c7d';
    const hair = '#5a3424';
    const hy = scared ? -4 : 0;
    // curls peeking out
    p.e(9, 19, 4, 5, OUT); p.e(31, 19, 4, 5, OUT);
    p.e(9, 19, 3, 4, hair); p.e(31, 19, 3, 4, hair);
    p.r(7, 17, 2, 1, '#7a4a34'); p.r(32, 21, 2, 1, '#7a4a34');
    faceShape(p, { cy: 24, rx: 11, ry: 12, skin, shade });
    // top hat
    p.r(11, 0 + hy, 19, 13, OUT);
    p.r(12, 0 + hy, 17, 12, P.plum0);
    p.r(13, 0 + hy, 3, 12, P.plum1);
    p.r(12, 8 + hy, 17, 3, P.gold1); p.r(12, 8 + hy, 17, 1, P.gold2);
    p.r(5, 12 + hy, 31, 4, OUT); p.r(6, 13 + hy, 29, 2, P.plum1); p.r(6, 13 + hy, 29, 1, P.plum2);
    p.r(4, 11 + hy, 2, 2, OUT); p.r(35, 11 + hy, 2, 2, OUT);
    // long nose
    p.r(20, 23, 1, 4, shade); p.r(21, 26, 1, 1, shade);
    // goatee: neat and pointed
    p.r(17, 33, 7, 1, P.black); p.r(17, 34, 7, 1, P.black); p.r(18, 35, 5, 1, P.black);
    p.r(19, 36, 3, 1, P.black); p.r(19, 37, 3, 1, P.black); p.r(20, 38, 1, 2, P.black);
    p.r(19, 34, 1, 1, '#4a2a3a');
    if (scared) {
      bulgeEyes(p, 20, 21, 5, 3, 3);
      flyingBrows(p, 20, 16, 5, hair);
      gape(p, 20, 30, 4, 3);
      sweat(p, 32, 18);
    } else {
      // twinkling, mischievous eyes
      for (const sx of [15, 25]) {
        p.r(sx - 2, 20, 5, 3, P.white); p.r(sx - 1, 20, 3, 3, '#5a2a46'); p.r(sx - 1, 20, 1, 1, P.white);
        p.r(sx - 2, 19, 5, 1, OUT);
      }
      p.l(11, 17, 16, 16, hair); p.l(24, 15, 29, 17, hair); // one brow arched high
      // sparkle
      p.r(33, 14, 1, 3, P.gold2); p.r(32, 15, 3, 1, P.gold2);
      // grin
      p.r(14, 30, 13, 1, P.mouth); p.r(13, 29, 1, 1, P.mouth); p.r(27, 29, 1, 1, P.mouth);
      p.r(15, 29, 11, 1, P.white);
      p.r(12, 27, 2, 1, P.blush); p.r(27, 27, 2, 1, P.blush);
    }
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
  for (const kid of CHARACTERS) {
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
  for (const kid of CHARACTERS) {
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
  for (const kid of CHARACTERS) finalize(kid);
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
