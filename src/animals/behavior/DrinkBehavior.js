import { HOUR } from '../../config.js';
import { AnimalBehavior } from './AnimalBehavior.js';

const SEARCH_RADIUS = 2500;
const RETRY_AFTER = 6 * HOUR; // yakında su yoksa bir süre aramaz

/** Susayınca en yakın temiz göletin kıyısına gidip içmek. */
export class DrinkBehavior extends AnimalBehavior {
  constructor({ threshold = 0.35 } = {}) {
    super('Suya gidiyor');
    this.threshold = threshold;
    this.shore = null;
    this.nextSearch = 0;
  }

  urgency(animal, world) {
    const water = animal.needs.water;
    if (this.shore && water < 0.95) return 0.8;
    if (water >= this.threshold || world.now < this.nextSearch) return 0;
    return 0.8 + (this.threshold - water);
  }

  start(animal, world) {
    const pond = world.findNearestPond(animal.position, { maxRadius: SEARCH_RADIUS });
    this.shore = pond ? pond.shorePointFrom(animal.position) : null;
    if (!pond) this.nextSearch = world.now + RETRY_AFTER;
  }

  quietFor(animal, world) {
    if (this.shore) return 0;
    return Math.max(this.nextSearch - world.now, AnimalBehavior.timeUntilBelow(animal, 'water', this.threshold));
  }

  tick(animal, world, dt) {
    if (!this.shore) return true;
    if (!animal.moveTowards(this.shore, animal.walkSpeed, dt, world)) return false;
    animal.needs.drink();
    this.shore = null;
    return true;
  }
}
