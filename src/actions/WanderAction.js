import { Action } from './Action.js';

/** Bir merkez etrafında rastgele dolaşır, arada durur. */
export class WanderAction extends Action {
  constructor(label, center, radius, duration) {
    super(label);
    this.center = center.clone();
    this.radius = radius;
    this.duration = duration;
    this.elapsed = 0;
    this.target = null;
    this.pause = 0;
  }

  tick(person, world, dt) {
    this.elapsed += dt;
    if (this.elapsed >= this.duration) return this.complete();

    if (this.pause > 0) {
      this.pause -= dt;
      return;
    }
    if (!this.target) this.target = world.randomPointNear(this.center, this.radius);
    if (person.moveTowards(this.target, person.walkSpeed, dt, world)) {
      this.target = null;
      this.pause = world.rng.range(30, 180);
    }
  }
}
