import { Action } from './Action.js';

/** Belli bir süre yerinde bir iş yapar (yemek, dinlenmek, sohbet ...). */
export class PerformAction extends Action {
  constructor(label, duration, { onTick = null, onComplete = null, until = null } = {}) {
    super(label);
    this.duration = duration;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.until = until;
    this.elapsed = 0;
  }

  tick(person, world, dt) {
    this.elapsed += dt;
    this.onTick?.(person, world, dt);
    const finished = this.elapsed >= this.duration || this.until?.(person, world, this.elapsed);
    if (!finished) return;
    this.onComplete?.(person, world);
    this.complete();
  }
}
