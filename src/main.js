// WonkaWare: state machine, modes (single game / grand tour), pause panel,
// main loop.
import { P } from './palette.js';
import { W, H, initCanvas, initInput, setInputHandler, updateFx, drawFlash, fx, resetFx, rect, text, stripeRect } from './engine.js';
import { loadFaces } from './faces.js';
import { unlock, sfx, applySettings, stopMusic, playMusic } from './audio.js';
import { getSettings, setSetting, GAME_IDS, MAX_LEVEL } from './save.js';
import { MENU_BTN, drawMenuButton, drawButton, hit } from './ui.js';
import { SplashScene } from './scenes/splash.js';
import { MenuScene } from './scenes/menu.js';
import { TransitionScene } from './scenes/transition.js';
import { PlayScene } from './scenes/play.js';
import { RoundScene } from './scenes/round.js';
import { ScoreboardScene } from './scenes/scoreboard.js';
import { CelebrateScene } from './scenes/celebrate.js';
import { EndingScene } from './scenes/ending.js';
import { GAMES } from './games/index.js';

export const ORDER = GAME_IDS; // charlie, violet, veruca, mike, augustus (boss last)
export const START_LIVES = 3;

const SCENES = {
  splash: SplashScene, menu: MenuScene, transition: TransitionScene, play: PlayScene,
  round: RoundScene, scoreboard: ScoreboardScene, celebrate: CelebrateScene, ending: EndingScene,
};

const params = new URLSearchParams(location.search);
const debugGame = params.get('game');
const debugLevel = Math.max(1, Math.min(MAX_LEVEL, parseInt(params.get('level') || params.get('loop') || '1', 10) || 1));
const debugScene = params.get('scene');
const FAST = Math.max(0.1, Math.min(8, parseFloat(params.get('fast') || '1') || 1)); // test helper

let scene = null;
let paused = false;

export const api = {
  run: null,
  ORDER,
  debug: !!debugGame,
  // Global speed multiplier per level (1..5).
  speedFor: (level) => [0.72, 0.85, 0.98, 1.13, 1.3][Math.max(1, Math.min(5, level)) - 1],
  go(name, data = {}) {
    resetFx();
    paused = false;
    canvas.style.cursor = '';
    scene = new SCENES[name](api, data);
    scene.name = name;
  },
  toMenu() { api.run = null; api.go('menu'); },
  startSingle(id) {
    api.run = { mode: 'single', id, level: 1, lives: START_LIVES, results: {} };
    api.go('play', { id, level: 1 });
  },
  startTour() {
    api.run = { mode: 'tour', round: 1, idx: 0, lives: START_LIVES, results: Object.fromEntries(ORDER.map((g) => [g, 0])) };
    api.go('transition', { next: ORDER[0] });
  },
  playNext() {
    const r = api.run;
    if (r?.mode === 'tour') api.go('play', { id: ORDER[r.idx], level: r.round });
  },
  gameFinished(id, result, level) {
    const r = api.run;
    if (!r) { api.go('play', { id, level }); return; } // debug: loop the same game forever
    const won = result === 'win';
    if (won) r.results[id] = Math.max(r.results[id] || 0, level);
    else r.lives--;
    if (r.mode === 'single') {
      if (won && level >= MAX_LEVEL) { api.go('celebrate', { id }); return; }
      if (r.lives <= 0) { api.toMenu(); return; }
      if (won) r.level++;
      api.go('play', { id, level: r.level });
      return;
    }
    // grand tour
    if (r.lives <= 0) { api.go('scoreboard', { tour: true, cleared: false }); return; }
    r.idx++;
    if (r.idx >= ORDER.length) {
      r.idx = 0;
      r.round++;
      if (r.round > MAX_LEVEL) { api.go('scoreboard', { tour: true, cleared: true }); return; }
      api.go('round', { round: r.round, won, lostLife: !won });
      return;
    }
    api.go('transition', { next: ORDER[r.idx], won, lostLife: !won });
  },
};

/* --------------------------------------------------------- pause panel */
const PANEL = { x: 80, y: 38, w: 320, h: 196 };
function panelButtons() {
  const s = getSettings();
  const bx = PANEL.x + 24, bw = PANEL.w - 48;
  const list = [{ id: 'resume', label: 'Resume' }];
  if (scene?.name !== 'menu') list.push({ id: 'room', label: 'Back to the Chocolate Room' });
  list.push({ id: 'sfx', label: `Sound effects: ${s.sfx ? 'On' : 'Off'}` });
  list.push({ id: 'music', label: `Music: ${s.music ? 'On' : 'Off'}` });
  return list.map((b, i) => ({ ...b, x: bx, y: PANEL.y + 40 + i * 36, w: bw, h: 28 }));
}
function drawPause(ctx, t) {
  ctx.fillStyle = 'rgba(30,10,22,0.6)';
  ctx.fillRect(0, 0, W, H);
  rect(ctx, PANEL.x - 3, PANEL.y - 3, PANEL.w + 6, PANEL.h + 6, P.ink);
  stripeRect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, P.pink1, P.pink3, 5, t * 12);
  rect(ctx, PANEL.x + 8, PANEL.y + 8, PANEL.w - 16, PANEL.h - 16, P.lilac4);
  text(ctx, 'Paused', W / 2, PANEL.y + 24, { size: 16, color: P.pink1, outline: P.ink, ow: 1 });
  for (const b of panelButtons()) drawButton(ctx, b, b.label, { color: b.id === 'resume' ? P.mint1 : P.lilac1 });
}
function pauseTap(x, y) {
  for (const b of panelButtons()) {
    if (!hit(b, x, y)) continue;
    if (b.id === 'resume') { sfx('back'); paused = false; }
    else if (b.id === 'room') { sfx('back'); paused = false; stopMusic(); api.toMenu(); }
    else if (b.id === 'sfx') { setSetting('sfx', !getSettings().sfx); applySettings(); sfx('tap'); }
    else if (b.id === 'music') { setSetting('music', !getSettings().music); applySettings(); sfx('tap'); }
    return;
  }
  if (!hit(PANEL, x, y)) { paused = false; sfx('back'); }
}

/* -------------------------------------------------------------- input */
const router = {
  onDown(x, y) {
    unlock();
    if (paused) { pauseTap(x, y); return; }
    if (scene?.pausable && hit({ x: MENU_BTN.x - 3, y: MENU_BTN.y - 3, w: MENU_BTN.w + 8, h: MENU_BTN.h + 8 }, x, y)) {
      paused = true; sfx('tap');
      canvas.style.cursor = '';
      scene.onPause?.();
      return;
    }
    scene?.onDown?.(x, y);
  },
  onMove(x, y) { if (!paused) scene?.onMove?.(x, y); },
  onUp(x, y) { if (!paused) scene?.onUp?.(x, y); },
};

const canvas = document.getElementById('game');
const ctx = initCanvas(canvas);
initInput(canvas);
setInputHandler(router);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && scene?.pausable && !paused) { paused = true; scene.onPause?.(); }
});

let clock = 0;
function frame(last) {
  return (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)) * FAST;
    clock += dt;
    if (!paused) { scene.update(dt); updateFx(dt); }
    ctx.fillStyle = P.black;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(fx.ox, fx.oy);
    scene.draw(ctx);
    ctx.restore();
    drawFlash(ctx);
    if (scene.pausable) drawMenuButton(ctx, clock);
    if (paused) drawPause(ctx, clock);
    requestAnimationFrame(frame(now));
  };
}

async function boot() {
  try { await Promise.race([document.fonts.load('16px "Press Start 2P"'), new Promise((r) => setTimeout(r, 2500))]); } catch (_) { /* fall back */ }
  await loadFaces('faces/');
  if (debugGame && GAMES[debugGame]) api.go('play', { id: debugGame, level: debugLevel });
  else if (debugScene === 'menu') api.go('menu');
  else if (debugScene === 'transition') { api.startTour(); }
  else if (debugScene === 'round') { api.startTour(); api.run.round = 2; api.go('round', { round: 2 }); }
  else if (debugScene === 'scoreboard') api.go('scoreboard', {});
  else if (debugScene === 'tourend') { api.startTour(); Object.assign(api.run.results, { charlie: 3, violet: 2, veruca: 2, mike: 1, augustus: 1 }); api.run.lives = 0; api.go('scoreboard', { tour: true, cleared: false }); }
  else if (debugScene === 'celebrate') { api.run = { mode: 'single', id: params.get('id') || 'violet', level: 5, lives: 2, results: {} }; api.go('celebrate', { id: api.run.id }); }
  else if (debugScene === 'ending') api.go('ending', {});
  else api.go('splash');
  requestAnimationFrame(frame(performance.now()));
}

// Handy for poking at things from the console / test harness.
window.__wonka = { api, get scene() { return scene; }, get paused() { return paused; }, playMusic };
boot();
