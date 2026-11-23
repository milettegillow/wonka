// Persistent progress + settings (localStorage, always wrapped in try/catch).
const BEST_KEY = 'wonkaware.bestLevels';
const SET_KEY = 'wonkaware.settings';
export const GAME_IDS = ['charlie', 'violet', 'veruca', 'mike', 'augustus'];
export const MAX_LEVEL = 5;

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? { ...fallback, ...JSON.parse(v) } : { ...fallback };
  } catch (_) { return { ...fallback }; }
}
function write(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch (_) { /* private mode etc. */ }
}

const best = read(BEST_KEY, Object.fromEntries(GAME_IDS.map((g) => [g, 0])));
const settings = read(SET_KEY, { sfx: true, music: true });

export function getBest(id) { return Math.max(0, Math.min(MAX_LEVEL, best[id] | 0)); }
// Record a beaten level. Returns true if it's a new best.
export function recordBeaten(id, level) {
  if (level > getBest(id)) { best[id] = level; write(BEST_KEY, best); return true; }
  return false;
}
export function getSettings() { return settings; }
export function setSetting(k, v) { settings[k] = v; write(SET_KEY, settings); }
