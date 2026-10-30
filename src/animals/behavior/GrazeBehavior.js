import { AnimalBehavior } from './AnimalBehavior.js';

const SPOT_SAMPLES = 4;
const MIN_FORAGE = 0.05; // bu kadar çıplak yerde otlamaya değmez, yer değiştirilir

/** Acıkınca sürünün yakınında en otlu yeri seçip otlamak. Doyma hızı otun bolluğuna bağlı. */
export class GrazeBehavior extends AnimalBehavior {
  constructor({ radius, grazeTime, threshold = 0.7 }) {
    super('Otluyor');
    this.radius = radius;
    this.grazeTime = grazeTime;
    this.threshold = threshold;
    this.spot = null;
  }

  urgency(animal) {
    const food = animal.needs.food;
    if (this.spot && food < 0.97) return 0.5;
    return food < this.threshold ? 0.5 + (this.threshold - food) : 0;
  }

  start(animal, world) {
    this.spot = this.#bestSpot(animal, world);
  }

  #bestSpot(animal, world) {
    const center = animal.anchor;
    let best = null;
    let bestForage = -1;
    for (let i = 0; i < SPOT_SAMPLES; i++) {
      const point = world.randomPointNear(center, animal.reach(this.radius));
      if (world.isWater(point.x, point.y, 1)) continue;
      const forage = world.forageAt(point);
      if (forage > bestForage) {
        best = point;
        bestForage = forage;
      }
    }
    return best;
  }

  tick(animal, world, dt) {
    if (!this.spot) return true;
    if (!animal.moveTowards(this.spot, animal.walkSpeed, dt, world)) return false;
    const forage = world.forageAt(animal.position);
    if (forage < MIN_FORAGE) {
      this.spot = this.#bestSpot(animal, world);
      return !this.spot;
    }
    const eaten = (dt * forage) / this.grazeTime;
    animal.needs.eat(eaten);
    world.graze(animal.position, eaten);
    if (animal.needs.food < 0.97) return false;
    this.spot = null;
    return true;
  }
}
