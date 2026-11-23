// Tiny chiptune synth (Web Audio, no files): pulse/triangle/noise voices,
// sfxr-style sound effects and a lookahead step sequencer for music.
//
// Swapping in real audio later: call registerFile('chomp', 'audio/chomp.ogg')
// or registerFile('music:menu', 'audio/menu.ogg'). A registered file is used
// instead of the synth version of that sound/track.
import { getSettings } from './save.js';

let ctx = null, master, musicBus, sfxBus, noiseBuf;
const waves = {};
const files = {};
let pendingMusic = null;

/* ------------------------------------------------------------- setup */
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.connect(master);
    applySettings();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const [name, duty] of [['pulse50', 0.5], ['pulse25', 0.25], ['pulse12', 0.125]]) {
      const n = 40, real = new Float32Array(n), imag = new Float32Array(n);
      for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      waves[name] = ctx.createPeriodicWave(real, imag);
    }
    setInterval(tickMusic, 25);
    for (const [name, url] of Object.entries(files)) if (url && typeof url === 'string') loadFile(name, url);
  }
  if (ctx.state === 'suspended') ctx.resume();
  if (pendingMusic) { const p = pendingMusic; pendingMusic = null; playMusic(p.name, p.opts); }
}

export function applySettings() {
  if (!ctx) return;
  const s = getSettings();
  const now = ctx.currentTime;
  musicBus.gain.setTargetAtTime(s.music ? 0.32 : 0, now, 0.05);
  sfxBus.gain.setTargetAtTime(s.sfx ? 0.85 : 0, now, 0.02);
}

export function registerFile(name, url) {
  files[name] = url;
  if (ctx) loadFile(name, url);
}
async function loadFile(name, url) {
  try {
    const buf = await (await fetch(url)).arrayBuffer();
    files[name] = await ctx.decodeAudioData(buf);
  } catch (_) { delete files[name]; }
}
function playBuffer(buf, bus, loop = false) {
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = loop;
  src.connect(bus); src.start();
  return src;
}

/* ------------------------------------------------------------ voices */
const NOTE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
export function freq(n) {
  if (typeof n === 'number') return n;
  const m = /^([A-G]#?)(-?\d)$/.exec(n);
  if (!m) return 440;
  return 440 * Math.pow(2, (NOTE[m[1]] + (parseInt(m[2], 10) + 1) * 12 - 69) / 12);
}

function setWave(osc, w) {
  if (waves[w]) osc.setPeriodicWave(waves[w]);
  else osc.type = w === 'square' ? 'square' : w || 'square';
}

// One oscillator note. env: 'pluck' (decay) or 'hold' (sustain then release).
function tone(o) {
  const t = o.t ?? ctx.currentTime;
  const dur = o.dur ?? 0.1;
  const vol = o.vol ?? 0.2;
  const osc = ctx.createOscillator();
  setWave(osc, o.wave || 'pulse50');
  const f0 = freq(o.f);
  osc.frequency.setValueAtTime(f0, t);
  if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq(o.f1)), t + (o.slide ?? dur));
  if (o.vib) {
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = o.vib[0]; lg.gain.value = o.vib[1];
    lfo.connect(lg).connect(osc.frequency);
    lfo.start(t + (o.vibDelay || 0)); lfo.stop(t + dur + 0.1);
  }
  const g = ctx.createGain();
  const a = o.a ?? 0.004;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  if (o.env === 'hold') {
    g.gain.setValueAtTime(vol, t + Math.max(a, dur * 0.8));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  osc.connect(g).connect(o.bus || sfxBus);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function noise(o) {
  const t = o.t ?? ctx.currentTime;
  const dur = o.dur ?? 0.1;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = o.filter || 'lowpass';
  f.frequency.setValueAtTime(o.f ?? 2000, t);
  if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(o.vol ?? 0.2, t + (o.a ?? 0.003));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(o.bus || sfxBus);
  src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
}

/* ------------------------------------------------------------- sfx */
const SFX = {
  tap: () => tone({ wave: 'pulse25', f: 880, f1: 1400, dur: 0.07, vol: 0.14 }),
  back: () => tone({ wave: 'pulse25', f: 900, f1: 500, dur: 0.08, vol: 0.14 }),
  pop: (t) => { tone({ wave: 'sine', f: 260, f1: 980, dur: 0.12, vol: 0.3, t }); tone({ wave: 'pulse12', f: 1300, dur: 0.06, vol: 0.08, t: t + 0.06 }); },
  blip: () => tone({ wave: 'pulse12', f: 480 + Math.random() * 380, dur: 0.045, vol: 0.07 }),
  boat: (t) => {
    noise({ filter: 'lowpass', f: 500, f1: 250, dur: 0.9, vol: 0.07, a: 0.2, t });
    tone({ wave: 'triangle', f: 'G4', dur: 0.22, vol: 0.18, env: 'hold', t: t + 0.1 });
    tone({ wave: 'triangle', f: 'C5', dur: 0.35, vol: 0.18, env: 'hold', t: t + 0.34 });
  },
  rustle: (t) => { for (let i = 0; i < 6; i++) noise({ filter: 'highpass', f: 2500 + Math.random() * 2500, dur: 0.035, vol: 0.09, t: t + i * 0.035 + Math.random() * 0.01 }); },
  sparkle: (t) => { ['E6', 'G6', 'C7', 'E7', 'G7'].forEach((n, i) => tone({ wave: 'triangle', f: n, dur: 0.14, vol: 0.13, t: t + i * 0.06 })); },
  swap: (t) => noise({ filter: 'bandpass', f: 900, f1: 2400, dur: 0.14, vol: 0.06, q: 2, t }),
  chomp: (t) => { tone({ wave: 'pulse50', f: 230, f1: 80, dur: 0.09, vol: 0.22, t }); noise({ filter: 'lowpass', f: 1800, dur: 0.05, vol: 0.12, t }); },
  perfect: (t) => { SFX.chomp(t); tone({ wave: 'triangle', f: 'C6', dur: 0.08, vol: 0.12, t: t + 0.03 }); tone({ wave: 'triangle', f: 'G6', dur: 0.1, vol: 0.1, t: t + 0.08 }); },
  squelch: (t) => {
    tone({ wave: 'triangle', f: 140, f1: 460, dur: 0.42, vol: 0.28, vib: [16, 40], t });
    noise({ filter: 'lowpass', f: 700, f1: 180, dur: 0.35, vol: 0.14, t });
  },
  miss: (t) => { noise({ filter: 'bandpass', f: 700, dur: 0.18, vol: 0.08, q: 1.5, t }); tone({ wave: 'pulse25', f: 220, f1: 120, dur: 0.14, vol: 0.08, t }); },
  step: (t) => noise({ filter: 'lowpass', f: 380, dur: 0.04, vol: 0.12, t }),
  squeak: (t) => { tone({ wave: 'pulse25', f: 1700, f1: 2700, dur: 0.06, vol: 0.08, t }); tone({ wave: 'pulse25', f: 2600, f1: 1500, dur: 0.07, vol: 0.07, t: t + 0.07 }); },
  knock: (t) => tone({ wave: 'pulse50', f: 320, f1: 180, dur: 0.05, vol: 0.12, t }),
  chute: (t) => tone({ wave: 'triangle', f: 1000, f1: 110, dur: 0.9, slide: 0.85, vol: 0.22, vib: [9, 25], t }),
  ping: (t, n = 0) => { const f = 880 * Math.pow(2, Math.min(n, 24) / 12); tone({ wave: 'pulse25', f, dur: 0.07, vol: 0.1, t }); tone({ wave: 'triangle', f: f * 2, dur: 0.09, vol: 0.06, t: t + 0.02 }); },
  zap: (t) => { noise({ filter: 'highpass', f: 1800, dur: 0.22, vol: 0.09, t }); tone({ wave: 'sawtooth', f: 70, dur: 0.22, vol: 0.08, vib: [40, 30], t }); },
  splash: (t) => noise({ filter: 'lowpass', f: 1400, f1: 260, dur: 0.38, vol: 0.18, t }),
  bubble: (t) => { tone({ wave: 'sine', f: 700, f1: 180, dur: 0.08, vol: 0.2, t }); noise({ filter: 'lowpass', f: 900, dur: 0.1, vol: 0.08, t }); },
  oar: (t) => { tone({ wave: 'pulse50', f: 130, f1: 60, dur: 0.14, vol: 0.18, t }); noise({ filter: 'lowpass', f: 700, dur: 0.1, vol: 0.12, t }); },
  suck: (t) => { noise({ filter: 'bandpass', f: 250, f1: 1600, dur: 0.85, vol: 0.14, q: 1.2, a: 0.25, t }); tone({ wave: 'triangle', f: 55, f1: 110, dur: 0.85, vol: 0.12, t }); },
  warn: (t) => { tone({ wave: 'pulse25', f: 'E6', dur: 0.06, vol: 0.07, t }); tone({ wave: 'pulse25', f: 'B5', dur: 0.06, vol: 0.07, t: t + 0.09 }); },
  whoosh: (t) => { noise({ filter: 'highpass', f: 400, f1: 5000, dur: 0.55, vol: 0.18, a: 0.08, t }); tone({ wave: 'pulse25', f: 180, f1: 1800, dur: 0.55, vol: 0.09, t }); },
  strain: (t) => tone({ wave: 'sawtooth', f: 90, f1: 140, dur: 0.5, vol: 0.06, vib: [30, 15], t }),
  lifeLost: (t) => { tone({ wave: 'pulse50', f: 'C5', dur: 0.12, vol: 0.14, t }); tone({ wave: 'pulse50', f: 'G4', dur: 0.12, vol: 0.14, t: t + 0.12 }); tone({ wave: 'pulse50', f: 'C4', f1: 'A3', dur: 0.32, vol: 0.14, t: t + 0.24 }); },
  gobstopper: (t) => { ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => tone({ wave: 'pulse25', f: n, dur: 0.12, vol: 0.11, t: t + i * 0.055 })); tone({ wave: 'triangle', f: 'C7', dur: 0.4, vol: 0.12, t: t + 0.24 }); },
  gate: (t) => { tone({ wave: 'sawtooth', f: 95, f1: 70, dur: 0.8, vol: 0.07, vib: [7, 8], t }); noise({ filter: 'bandpass', f: 500, dur: 0.6, vol: 0.05, q: 3, t }); },
  cheer: (t) => { ['G5', 'C6', 'E6'].forEach((n, i) => tone({ wave: 'pulse12', f: n, dur: 0.09, vol: 0.09, t: t + i * 0.05 })); },
};

export function sfx(name, arg) {
  if (!ctx || !getSettings().sfx) return;
  if (files[name] instanceof AudioBuffer) { playBuffer(files[name], sfxBus); return; }
  const fn = SFX[name];
  if (fn) fn(ctx.currentTime + 0.005, arg);
}

/* ------------------------------------------------------------- music */
// Tracks: 8th-note steps. Tokens: note (C5, F#4), '-' rest, '.' hold.
// Drum tokens: k kick, s snare, h hat, '-' rest.
const bar = (...b) => b.join(' ');
const TRACKS = {
  menu: {
    bpm: 128, loop: true,
    ch: [
      { wave: 'pulse25', vol: 0.11, n: bar(
        'F5 . A5 C6 A5 . F5 .', 'E5 . G5 A#5 G5 . E5 .', 'D5 . F5 A5 G5 F5 E5 D5', 'C5 . . A4 A#4 C5 . -',
        'F5 . A5 C6 D6 C6 A5 .', 'G5 . A#5 D6 C6 A#5 G5 .', 'E5 G5 A#5 G5 E5 C5 D5 E5', 'F5 . . - F4 . - -') },
      { wave: 'pulse12', vol: 0.045, n: bar(
        'A4 C5 A4 C5 A4 C5 A4 C5', 'G4 A#4 G4 A#4 G4 A#4 G4 A#4', 'F4 A4 F4 A4 F4 A4 F4 A4', 'D4 F4 D4 F4 E4 G4 E4 G4',
        'A4 C5 A4 C5 A4 C5 A4 C5', 'A#4 D5 A#4 D5 A#4 D5 A#4 D5', 'G4 A#4 G4 A#4 G4 A#4 G4 A#4', 'A4 C5 A4 C5 A4 - - -') },
      { wave: 'triangle', vol: 0.2, n: bar(
        'F3 - C3 - F3 - C3 -', 'C3 - G2 - C3 - G2 -', 'D3 - A2 - D3 - A2 -', 'A#2 - F2 - C3 - E3 -',
        'F3 - C3 - F3 - C3 -', 'G2 - D3 - G2 - D3 -', 'C3 - G2 - A#2 - G2 -', 'F2 - C3 - F2 - - -') },
      { drum: true, vol: 0.5, n: bar('k - h - s - h -', 'k - h - s - h h', 'k - h - s - h -', 'k - h k s - h h', 'k - h - s - h -', 'k - h - s - h h', 'k - h k s - h -', 'k - s - k k s -') },
    ],
  },
  game: {
    bpm: 136, loop: true,
    ch: [
      { wave: 'pulse25', vol: 0.1, n: bar(
        'G5 . B5 . D6 . B5 .', 'C6 . A5 . F#5 . D5 .', 'E5 . G5 . B5 . A5 G5', 'F#5 . A5 . D5 . - .',
        'G5 . B5 . D6 . G6 .', 'E6 . C6 . A5 . F#5 .', 'G5 A5 B5 C6 D6 C6 B5 A5', 'G5 . D5 . G5 . - -') },
      { wave: 'triangle', vol: 0.2, n: bar(
        'G2 - D3 - G2 - D3 -', 'D3 - A2 - D3 - A2 -', 'E2 - B2 - E2 - B2 -', 'D3 - A2 - D3 - F#3 -',
        'G2 - D3 - G2 - D3 -', 'A2 - E3 - A2 - E3 -', 'D3 - A2 - D3 - A2 -', 'G2 - D3 - G2 - - -') },
      { wave: 'pulse12', vol: 0.04, n: bar(
        'B4 D5 B4 D5 B4 D5 B4 D5', 'A4 D5 A4 D5 A4 D5 A4 D5', 'G4 B4 G4 B4 G4 B4 G4 B4', 'F#4 A4 F#4 A4 F#4 A4 F#4 A4',
        'B4 D5 B4 D5 B4 D5 B4 D5', 'C5 E5 C5 E5 C5 E5 C5 E5', 'A4 D5 A4 D5 A4 D5 A4 D5', 'B4 D5 B4 D5 B4 - - -') },
      { drum: true, vol: 0.5, n: bar('k h s h k h s h', 'k h s h k k s h', 'k h s h k h s h', 'k h s h k k s s') },
    ],
  },
  boss: {
    bpm: 150, loop: true,
    ch: [
      { wave: 'pulse25', vol: 0.1, n: bar(
        'A4 . C5 . E5 . D5 C5', 'B4 . G#4 . E4 . . -', 'F5 . E5 . D5 . C5 B4', 'C5 . B4 . G#4 . E5 .',
        'A5 . G5 . F5 . E5 .', 'D5 . E5 . F5 . G#5 .', 'A5 . C6 . B5 . G#5 .', 'A5 . E5 . A4 . - -') },
      { wave: 'triangle', vol: 0.22, n: bar(
        'A2 A2 A3 A2 A2 A3 A2 G2', 'E2 E2 E3 E2 E2 E3 E2 G#2', 'F2 F2 F3 F2 D2 D2 D3 D2', 'E2 E2 E3 E2 G#2 G#2 B2 E3',
        'F2 F2 F3 F2 C3 C3 C3 C3', 'D2 D2 D3 D2 E2 E2 E3 E2', 'F2 F2 F3 F2 E2 E2 E3 E2', 'A2 A2 A3 A2 E2 E2 A2 -') },
      { drum: true, vol: 0.55, n: bar('k h s h k k s h', 'k h s h k k s s') },
    ],
  },
  win: {
    bpm: 170, loop: false,
    ch: [
      { wave: 'pulse25', vol: 0.13, n: 'C5 E5 G5 C6 . E6 . G6 . . . -' },
      { wave: 'pulse12', vol: 0.06, n: 'E4 G4 C5 E5 . G5 . C6 . . . -' },
      { wave: 'triangle', vol: 0.22, n: 'C3 - G2 - C3 . . C3 . . . -' },
      { drum: true, vol: 0.5, n: 'k - - - s - k - s - - -' },
    ],
  },
  fail: {
    bpm: 120, loop: false,
    ch: [
      { wave: 'pulse50', vol: 0.11, vib: [6, 10], n: 'G4 . F#4 . F4 . E4 . . . . -' },
      { wave: 'triangle', vol: 0.2, n: 'C3 - B2 - A#2 - A2 . . . . -' },
    ],
  },
  celebrate: {
    bpm: 144, loop: true,
    ch: [
      { wave: 'pulse25', vol: 0.11, n: bar(
        'C5 . C5 C5 G5 . . .', 'E5 . G5 . C6 . . .', 'A5 . C6 . F6 . . .', 'E6 . D6 . C6 . . -',
        'D6 . B5 . G5 . B5 .', 'C6 . A5 . F5 . A5 .', 'G5 C6 E6 G6 E6 C6 D6 E6', 'C6 . . - C5 . - -') },
      { wave: 'pulse12', vol: 0.05, n: bar(
        'E4 G4 E4 G4 E4 G4 E4 G4', 'G4 C5 G4 C5 G4 C5 G4 C5', 'F4 A4 F4 A4 F4 A4 F4 A4', 'G4 C5 G4 C5 G4 B4 G4 B4',
        'G4 B4 G4 B4 G4 B4 G4 B4', 'F4 A4 F4 A4 F4 A4 F4 A4', 'E4 G4 E4 G4 F4 A4 G4 B4', 'E4 G4 C5 - - - - -') },
      { wave: 'triangle', vol: 0.22, n: bar(
        'C3 - G2 - C3 - G2 -', 'C3 - E3 - G3 - E3 -', 'F2 - C3 - F2 - C3 -', 'G2 - D3 - G2 - B2 -',
        'G2 - D3 - G2 - D3 -', 'F2 - C3 - F2 - C3 -', 'C3 - G2 - F2 - G2 -', 'C3 - G2 - C3 - - -') },
      { drum: true, vol: 0.55, n: bar('k - h k s - h -', 'k - h k s - h h') },
    ],
  },
};

let mus = null;   // { name, track, step, next, tempo, srcNode }

function parse(track) {
  if (track.parsed) return;
  for (const c of track.ch) c.tok = c.n.split(/\s+/).filter(Boolean);
  track.len = Math.max(...track.ch.map((c) => c.tok.length));
  track.parsed = true;
}

function drum(kind, t, vol) {
  if (kind === 'k') { tone({ wave: 'sine', f: 150, f1: 45, dur: 0.12, vol: vol * 0.9, t, bus: musicBus }); }
  else if (kind === 's') { noise({ filter: 'bandpass', f: 1800, dur: 0.1, vol: vol * 0.35, q: 0.8, t, bus: musicBus }); }
  else if (kind === 'h') { noise({ filter: 'highpass', f: 7000, dur: 0.03, vol: vol * 0.18, t, bus: musicBus }); }
}

function scheduleStep(track, step, t, stepDur) {
  for (const c of track.ch) {
    const tok = c.tok[step % c.tok.length];
    if (!tok || tok === '-' || tok === '.') continue;
    if (c.drum) { drum(tok, t, c.vol); continue; }
    let hold = 1;
    while (hold < 16 && c.tok[(step + hold) % c.tok.length] === '.') hold++;
    tone({ wave: c.wave, f: tok, dur: hold * stepDur * 0.95, vol: c.vol, env: 'hold', a: 0.006, t, bus: musicBus, vib: c.vib && hold > 2 ? c.vib : null, vibDelay: stepDur });
  }
}

function tickMusic() {
  if (!ctx || !mus || mus.srcNode) return;
  const tr = mus.track;
  const stepDur = 60 / (tr.bpm * mus.tempo) / 2;
  while (mus.next < ctx.currentTime + 0.12) {
    if (mus.step >= tr.len) {
      if (!tr.loop) { mus = null; return; }
      mus.step = 0;
    }
    scheduleStep(tr, mus.step, mus.next, stepDur);
    mus.next += stepDur;
    mus.step++;
  }
}

export function playMusic(name, opts = {}) {
  const tempo = opts.tempo ?? 1;
  if (!ctx) { pendingMusic = { name, opts }; return; }
  if (mus && mus.name === name && mus.tempo === tempo && !opts.restart && TRACKS[name]?.loop) return;
  stopMusic();
  const fileKey = 'music:' + name;
  if (files[fileKey] instanceof AudioBuffer) {
    mus = { name, tempo, srcNode: playBuffer(files[fileKey], musicBus, TRACKS[name]?.loop ?? true) };
    return;
  }
  const track = TRACKS[name];
  if (!track) return;
  parse(track);
  mus = { name, track, step: 0, next: ctx.currentTime + 0.06, tempo };
}

export function stopMusic() {
  pendingMusic = null;
  if (mus?.srcNode) { try { mus.srcNode.stop(); } catch (_) { /* already stopped */ } }
  mus = null;
}

export function musicName() { return mus?.name || pendingMusic?.name || null; }
