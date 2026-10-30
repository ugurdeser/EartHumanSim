import { AnimalBehavior } from './AnimalBehavior.js';

/** Başka işi yokken sürünün (yavruysa annesinin) çevresinde gezinip dinlenmek. */
export class IdleBehavior extends AnimalBehavior {
  constructor({ radius }) {
    super('Dolaşıyor');
    this.radius = radius;
    this.target = null;
    this.pause = 0;
  }

  /** Gezindiği alanın yarıçapı. */
  radiusFor(animal) {
    return animal.reach(this.radius);
  }

  urgency() {
    return 0.05;
  }

  tick(animal, world, dt) {
    if (this.pause > 0) {
      this.pause -= dt;
      return false;
    }
    this.target ??= world.randomPointNear(animal.anchor, this.radiusFor(animal));
    if (animal.moveTowards(this.target, animal.walkSpeed, dt, world)) {
      this.target = null;
      this.pause = world.rng.range(60, 400);
    }
    return false;
  }
}
