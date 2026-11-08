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

  /** Olduğu yerde besleniyorsa (ör. balık): doyana kadar. */
  restTime(animal, world) {
    if (this.radius > 0) return 0;
    const rate = Math.min(1, world.calendar.seasonAt(animal.position).growth + 0.2) / this.feedTime - 1 / animal.needs.profile.foodDuration;
    return rate > 0 ? Math.max(0, (0.95 - animal.needs.food) / rate) : 0;
  }

  quietFor(animal) {
    return AnimalBehavior.timeUntilBelow(animal, 'food', this.threshold);
  }

  tick(animal, world, dt) {
    if (this.radius > 0) {
      this.target ??= world.randomPointNear(animal.anchor, animal.reach(this.radius));
      if (animal.moveTowards(this.target, animal.walkSpeed, dt, world)) this.target = null;
    }
    animal.needs.eat((dt * Math.min(1, world.calendar.seasonAt(animal.position).growth + 0.2)) / this.feedTime);
    return animal.needs.food >= 0.95;
  }
}
