// Common microgame interface.
//   init({ loop, speed })   set up for a difficulty (loop is 1-based)
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
    this.outDur = 1.6; // outcome animation length
    this.duration = 6;
    this.parts = new Particles();
    this.tweens = new Tweens();
    this.loop = 1;
  }
  init({ loop = 1, speed = 1 } = {}) { this.loop = loop; this.speed = speed; }
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
