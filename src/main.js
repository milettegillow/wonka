// WonkaWare: state machine + main loop.
import { W, H, initCanvas, initInput, setInputHandler, updateFx, drawFlash, fx, resetFx } from './engine.js';
import { loadFaces } from './faces.js';
import { TitleScene } from './scenes/title.js';
import { TransitionScene } from './scenes/transition.js';
import { PlayScene } from './scenes/play.js';
import { FasterScene } from './scenes/faster.js';
import { GameOverScene } from './scenes/gameover.js';
import { GAMES } from './games/index.js';

export const ORDER = ['charlie', 'violet', 'veruca', 'mike', 'augustus'];
export const START_LIVES = 3;

const SCENES = { title: TitleScene, transition: TransitionScene, play: PlayScene, faster: FasterScene, gameover: GameOverScene };

const params = new URLSearchParams(location.search);
const debugGame = params.get('game');
const debugLoop = Math.max(1, parseInt(params.get('loop') || '1', 10) || 1);
const debugScene = params.get('scene');

const BEST_KEY = 'wonkaware.best';
function loadBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; } catch (_) { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch (_) { /* private mode */ }
}

const run = { lives: START_LIVES, score: 0, loop: 1, idx: 0 };
let scene = null;

export const api = {
  run,
  ORDER,
  best: loadBest(),
  debug: !!debugGame,
  speedFor: (loop) => Math.min(1.9, 1 + 0.13 * (loop - 1)),
  go(name, data = {}) {
    resetFx();
    scene = new SCENES[name](api, data);
    scene.name = name;
    setInputHandler(scene);
  },
  startRun() {
    run.lives = START_LIVES; run.score = 0; run.loop = 1; run.idx = 0;
    api.go('transition', { next: ORDER[0] });
  },
  gameFinished(id, result) {
    if (debugGame) { api.go('play', { id, loop: debugLoop }); return; }
    const won = result === 'win';
    if (won) run.score++; else run.lives--;
    if (run.score > api.best) { api.best = run.score; saveBest(api.best); }
    if (run.lives <= 0) { api.go('gameover', { score: run.score }); return; }
    run.idx++;
    if (run.idx >= ORDER.length) {
      run.idx = 0;
      run.loop++;
      api.go('faster', { won, lostLife: !won });
      return;
    }
    api.go('transition', { next: ORDER[run.idx], won, lostLife: !won });
  },
  playNext() { api.go('play', { id: ORDER[run.idx], loop: run.loop }); },
};

const canvas = document.getElementById('game');
const ctx = initCanvas(canvas);
initInput(canvas);

function frame(last) {
  return (now) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    scene.update(dt);
    updateFx(dt);
    ctx.fillStyle = '#1a0b10';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(fx.ox, fx.oy);
    scene.draw(ctx);
    ctx.restore();
    drawFlash(ctx);
    requestAnimationFrame(frame(now));
  };
}

async function boot() {
  try { await Promise.race([document.fonts.load('16px "Press Start 2P"'), new Promise((r) => setTimeout(r, 2500))]); } catch (_) { /* fall back */ }
  await loadFaces('faces/');
  if (debugGame && GAMES[debugGame]) api.go('play', { id: debugGame, loop: debugLoop });
  else if (debugScene === 'transition') api.go('transition', { next: params.get('next') || 'charlie' });
  else if (debugScene === 'faster') api.go('faster', {});
  else if (debugScene === 'gameover') api.go('gameover', { score: 7 });
  else api.go('title');
  requestAnimationFrame(frame(performance.now()));
}

// Handy for poking at things from the console / test harness.
window.__wonka = { api, get scene() { return scene; } };
boot();
