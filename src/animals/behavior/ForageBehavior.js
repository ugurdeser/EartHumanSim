import { AnimalBehavior } from './AnimalBehavior.js';

/**
 * Çevreden ufak ufak beslenmek: suda plankton, ormanda küçük av. Ayrı bir besin
 * kaynağı gerektirmeyen tokluk. Hız mevsimin bolluğuna bağlıdır.
 */
export class ForageBehavior extends AnimalBehavior {
  constructor({ label, feedTime, threshold = 0.6, radius = 0 }) {
    super(label);
    this.feedTime = feedTime;
    this.threshold = threshold;
    this.radius = radius;
    this.target = null;
  }

  urgency(animal) {
    return animal.needs.food < this.threshold ? 0.3 + (this.threshold - animal.needs.food) : 0;
  }

  tick(animal, world, dt) {
    if (this.radius > 0) {
      this.target ??= world.randomPointNear(animal.anchor, animal.reach(this.radius));
      if (animal.moveTowards(this.target, animal.walkSpeed, dt, world)) this.target = null;
    }
    animal.needs.eat((dt * Math.min(1, world.calendar.season.growth + 0.2)) / this.feedTime);
    return animal.needs.food >= 0.95;
  }
}
