// Engine: canvas scaling, pointer input, math + tween helpers, particles,
// screen shake / flash and pixel drawing primitives.
import { P } from './palette.js';

export const W = 480;
export const H = 270;
export const FONT = '"Press Start 2P", monospace';

/* ------------------------------------------------------------------ math */
export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const chance = (p) => Math.random() < p;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
export const shuffle = (arr) => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => {
    const c1 = 1.9, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  inBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  outBounce: (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

// Progress (0..1, eased) of a segment starting at `start` lasting `dur`.
export const seg = (t, start, dur, fn = ease.linear) => fn(clamp((t - start) / dur, 0, 1));

/* ------------------------------------------------------------ tweener */
export class Tweens {
  constructor() { this.list = []; }
  to(obj, props, dur, fn = ease.outQuad, delay = 0, done = null) {
    const from = {};
    for (const k in props) from[k] = obj[k];
    this.list.push({ obj, props, from, dur, fn, t: -delay, done });
  }
  update(dt) {
    for (const tw of this.list) {
      tw.t += dt;
      if (tw.t < 0) continue;
      const k = tw.fn(clamp(tw.t / tw.dur, 0, 1));
      for (const p in tw.props) tw.obj[p] = lerp(tw.from[p], tw.props[p], k);
    }
    const finished = this.list.filter((tw) => tw.t >= tw.dur);
    this.list = this.list.filter((tw) => tw.t < tw.dur);
    for (const tw of finished) tw.done && tw.done();
  }
}

/* ---------------------------------------------------------- particles */
export class Particles {
  constructor() { this.list = []; }
  add(o) {
    this.list.push({
      x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0, life: 0.6, size: 2, color: P.white,
      shape: 'sq', shrink: true, t: 0, rot: 0, vr: 0, ...o,
    });
  }
  burst(x, y, n, o = {}) {
    const { speed = [40, 120], colors = [P.white], life = [0.3, 0.7], size = [1, 3], angle = [0, Math.PI * 2] } = o;
    for (let i = 0; i < n; i++) {
      const a = rand(angle[0], angle[1]);
      const s = rand(speed[0], speed[1]);
      this.add({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(life[0], life[1]), size: Math.round(rand(size[0], size[1])),
        color: pick(colors), g: o.g ?? 0, drag: o.drag ?? 2, shape: o.shape ?? 'sq',
        shrink: o.shrink ?? true, vr: rand(-8, 8),
      });
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.t += dt;
      p.vy += p.g * dt;
      const d = Math.max(0, 1 - p.drag * dt);
      p.vx *= d; p.vy *= d;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.list = this.list.filter((p) => p.t < p.life);
  }
  draw(ctx) {
    for (const p of this.list) {
      const k = 1 - p.t / p.life;
      const s = p.shrink ? Math.max(1, Math.round(p.size * (0.4 + 0.6 * k))) : p.size;
      ctx.fillStyle = p.color;
      const x = Math.round(p.x), y = Math.round(p.y);
      if (p.shape === 'spark') {
        // little 4-point twinkle
        ctx.fillRect(x - s, y, s * 2 + 1, 1);
        ctx.fillRect(x, y - s, 1, s * 2 + 1);
      } else if (p.shape === 'ring') {
        ctx.globalAlpha = k;
        ringPx(ctx, x, y, Math.round(p.size * (1.5 - k)), p.color);
        ctx.globalAlpha = 1;
      } else if (p.shape === 'puff') {
        ctx.globalAlpha = Math.min(1, k * 1.5);
        circle(ctx, x, y, Math.max(1, Math.round(p.size * (1.3 - 0.5 * k))), p.color);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
      }
    }
  }
}

/* ------------------------------------------------------- shake + flash */
export const fx = {
  shakeT: 0, shakeDur: 0, shakeAmp: 0,
  flashT: 0, flashDur: 0, flashColor: '#fff',
  ox: 0, oy: 0,
};
export function shake(amp = 3, dur = 0.25) {
  if (amp >= fx.shakeAmp * (fx.shakeT / (fx.shakeDur || 1))) {
    fx.shakeAmp = amp; fx.shakeDur = dur; fx.shakeT = dur;
  }
}
export function flash(color = '#fff', dur = 0.15) {
  fx.flashColor = color; fx.flashDur = dur; fx.flashT = dur;
}
export function updateFx(dt) {
  if (fx.shakeT > 0) {
    fx.shakeT = Math.max(0, fx.shakeT - dt);
    const a = fx.shakeAmp * (fx.shakeT / fx.shakeDur);
    fx.ox = Math.round(rand(-a, a));
    fx.oy = Math.round(rand(-a, a));
  } else { fx.ox = 0; fx.oy = 0; }
  if (fx.flashT > 0) fx.flashT = Math.max(0, fx.flashT - dt);
}
export function drawFlash(ctx) {
  if (fx.flashT <= 0) return;
  ctx.globalAlpha = (fx.flashT / fx.flashDur) * 0.7;
  ctx.fillStyle = fx.flashColor;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}
export function resetFx() { fx.shakeT = 0; fx.flashT = 0; fx.ox = 0; fx.oy = 0; }

/* --------------------------------------------------------- draw prims */
export function rect(ctx, x, y, w, h, c) {
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
// Crisp filled ellipse made of horizontal pixel rows.
export function ellipse(ctx, cx, cy, rx, ry, c) {
  if (rx <= 0 || ry <= 0) return;
  ctx.fillStyle = c;
  cx = Math.round(cx); cy = Math.round(cy);
  const r = Math.ceil(ry);
  for (let dy = -r; dy <= r; dy++) {
    const k = 1 - ((dy + 0.5 * Math.sign(dy) * 0) / ry) ** 2;
    if (k <= 0) continue;
    const hw = Math.round(rx * Math.sqrt(k));
    ctx.fillRect(cx - hw, cy + dy, hw * 2 + 1, 1);
  }
}
export function circle(ctx, cx, cy, r, c) { ellipse(ctx, cx, cy, r, r, c); }
// 1px ring.
export function ringPx(ctx, cx, cy, r, c) {
  if (r <= 0) return;
  ctx.fillStyle = c;
  const steps = Math.max(12, Math.round(r * 7));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1);
  }
}
// Stepped pixel line with square brush of size w.
export function line(ctx, x0, y0, x1, y1, w, c) {
  ctx.fillStyle = c;
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  const o = Math.floor(w / 2);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    ctx.fillRect(Math.round(x0 + (x1 - x0) * t) - o, Math.round(y0 + (y1 - y0) * t) - o, w, w);
  }
}
// Limb from (x,y) at angle a (radians, 0 = right, PI/2 = down) with a hand blob.
export function limb(ctx, x, y, a, len, w, c, hand) {
  const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
  line(ctx, x, y, ex, ey, w, c);
  if (hand) rect(ctx, Math.round(ex) - Math.floor((w + 1) / 2), Math.round(ey) - Math.floor((w + 1) / 2), w + 1, w + 1, hand);
  return [ex, ey];
}
// 4-point sparkle star.
export function sparkle(ctx, x, y, s, c) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = c;
  ctx.fillRect(x - s, y, s * 2 + 1, 1);
  ctx.fillRect(x, y - s, 1, s * 2 + 1);
  if (s >= 3) ctx.fillRect(x - 1, y - 1, 3, 3);
}

// Candy-stripe pattern (diagonal), cached per colour pair + width.
const patCache = new Map();
export function stripePattern(ctx, c1, c2, w = 4) {
  const key = c1 + c2 + w;
  if (patCache.has(key)) return patCache.get(key);
  const s = w * 2;
  const cv = document.createElement('canvas');
  cv.width = s; cv.height = s;
  const g = cv.getContext('2d');
  g.fillStyle = c1; g.fillRect(0, 0, s, s);
  g.fillStyle = c2;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) if (((x + y) % s) < w) g.fillRect(x, y, 1, 1);
  const pat = ctx.createPattern(cv, 'repeat');
  patCache.set(key, pat);
  return pat;
}
// Fill a rect with a diagonal candy stripe, scrolling by `off` px.
export function stripeRect(ctx, x, y, w, h, c1, c2, sw = 4, off = 0) {
  const pat = stripePattern(ctx, c1, c2, sw);
  ctx.save();
  ctx.beginPath();
  ctx.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.clip();
  ctx.translate(Math.round(off) % (sw * 2), 0);
  ctx.fillStyle = pat;
  ctx.fillRect(Math.round(x) - sw * 2, Math.round(y), Math.round(w) + sw * 4, Math.round(h));
  ctx.restore();
}

/* --------------------------------------------------------------- text */
export function text(ctx, s, x, y, o = {}) {
  const { size = 8, color = P.white, align = 'center', baseline = 'middle', outline = null, ow = 1, shadow = null, sh = 2, alpha = 1, fill = null } = o;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  x = Math.round(x); y = Math.round(y);
  if (shadow) {
    ctx.fillStyle = shadow;
    for (let dx = -ow; dx <= ow; dx++) for (let dy = -ow; dy <= ow; dy++) ctx.fillText(s, x + dx, y + dy + sh);
  }
  if (outline) {
    ctx.fillStyle = outline;
    for (let dx = -ow; dx <= ow; dx++) for (let dy = -ow; dy <= ow; dy++) if (dx || dy) ctx.fillText(s, x + dx, y + dy);
  }
  ctx.fillStyle = fill || color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

// Big WarioWare-style punchy word: scales in with overshoot and wobbles.
export function bigWord(ctx, s, x, y, t, o = {}) {
  const size = o.size ?? 32;
  const k = seg(t, 0, 0.18, ease.outBack);
  const wob = Math.sin(t * 18) * 0.04 * (1 - seg(t, 0.2, 0.4));
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate((o.tilt ?? -0.06) + wob);
  ctx.scale(k * (1 + wob), k * (1 - wob));
  text(ctx, s, 0, 0, {
    size, color: o.color ?? P.lemon1, outline: o.outline ?? P.ink, ow: o.ow ?? 3,
    shadow: o.shadow ?? P.pink0, sh: o.sh ?? 4,
  });
  ctx.restore();
}

/* -------------------------------------------------------------- input */
export const input = { x: W / 2, y: H / 2, down: false, type: 'mouse', hover: false, id: null };
let handler = null;
let canvasEl = null;
export function setInputHandler(h) { handler = h; }

function toGame(e) {
  const r = canvasEl.getBoundingClientRect();
  return [clamp(((e.clientX - r.left) / r.width) * W, 0, W - 1), clamp(((e.clientY - r.top) / r.height) * H, 0, H - 1)];
}

export function initInput(canvas) {
  canvasEl = canvas;
  const root = document.documentElement;
  const opts = { passive: false };
  root.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    input.id = e.pointerId;
    input.type = e.pointerType || 'mouse';
    [input.x, input.y] = toGame(e);
    input.down = true;
    input.hover = true;
    try { root.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    handler?.onDown?.(input.x, input.y);
  }, opts);
  root.addEventListener('pointermove', (e) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    input.type = e.pointerType || input.type;
    [input.x, input.y] = toGame(e);
    input.hover = true;
    handler?.onMove?.(input.x, input.y);
  }, opts);
  const up = (e) => {
    if (!e.isPrimary) return;
    [input.x, input.y] = toGame(e);
    if (input.down) {
      input.down = false;
      handler?.onUp?.(input.x, input.y);
    }
    if (e.pointerType !== 'mouse') input.hover = false;
  };
  root.addEventListener('pointerup', up, opts);
  root.addEventListener('pointercancel', up, opts);
  root.addEventListener('pointerleave', () => { if (input.type === 'mouse') input.hover = false; });
  // Kill scrolling, pinch-zoom, double-tap zoom, context menus, text selection.
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'gesturestart', 'gesturechange', 'dblclick', 'contextmenu', 'selectstart']) {
    document.addEventListener(ev, (e) => e.preventDefault(), opts);
  }
}

/* ---------------------------------------------------- canvas + scaling */
export function initCanvas(canvas) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;
  const resize = () => {
    const vv = window.visualViewport;
    const vw = vv ? vv.width : window.innerWidth;
    const vh = vv ? vv.height : window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const fit = Math.min((vw * dpr) / W, (vh * dpr) / H);
    const whole = Math.floor(fit);
    // Integer scaling (in device pixels) when it doesn't waste too much screen.
    const s = whole >= 1 && whole / fit >= 0.8 ? whole : fit;
    canvas.style.width = `${(W * s) / dpr}px`;
    canvas.style.height = `${(H * s) / dpr}px`;
  };
  resize();
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  return ctx;
}
