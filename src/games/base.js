// Common microgame interface.
//   init({ level, speed })  set up for a difficulty (level 1..5)
//   duration                seconds of play before onTimeout() fires
//   update(dt)              dt is already scaled by the global speed
//   draw(ctx)
//   onDown/onMove/onUp(x,y) pointer events (only while playing)
//   onTimeout()             timer ran out — decide win or fail
//   result                  null | 'win' | 'fail'
//   done                    true once the outcome animation has finished
import { Particles, Tweens } from '../engine.js';

export class MicroGame {
  constructor() {
    this.t = 0;        // play clock
    this.at = 0;       // ambient clock (always runs, also during the command)
    this.result = null;
    this.outT = 0;     // time since result
    this.outDur = 2.0; // outcome animation length
    this.duration = 6;
    this.parts = new Particles();
    this.tweens = new Tweens();
    this.level = 1;
    this.k = 0;
  }
  // k: 0 at level 1 .. 1 at level 5, for lerping difficulty knobs.
  init({ level = 1, speed = 1 } = {}) { this.level = level; this.k = (level - 1) / 4; this.speed = speed; }
  // pick a value per level from a 5-entry table
  lv(table) { return table[Math.max(0, Math.min(table.length - 1, this.level - 1))]; }
  kl(a, b) { return a + (b - a) * this.k; }
  ambient(dt) { this.at += dt; this.parts.update(dt); this.tweens.update(dt); }
  tick(dt) {
    this.t += dt;
    this.ambient(dt);
    if (this.result) this.outT += dt;
  }
  update(dt) { this.tick(dt); }
  draw() {}
  win() { if (!this.result) { this.result = 'win'; this.outT = 0; this.onWin?.(); } }
  fail() { if (!this.result) { this.result = 'fail'; this.outT = 0; this.onFail?.(); } }
  onTimeout() { this.fail(); }
  get done() { return !!this.result && this.outT >= this.outDur; }
  get playing() { return !this.result; }
}
