import { Calendar } from '../core/Calendar.js';
import { Entity } from './Entity.js';

/**
 * Yenilebilir porsiyonları mevsime bağlı hızla yeniden büyüyen bitki.
 * Yeniden büyüme tembel (lazy) hesaplanır: kışın büyüme durur, ilkbaharda hızlanır.
 */
export class FoodSource extends Entity {
  constructor(x, y, { capacity, regrowTime, food }) {
    super(x, y);
    this.capacity = capacity;
    this.regrowTime = regrowTime;
    this.food = food; // verdiği yiyecek türü (FoodType)
    this.portionsAtHarvest = capacity;
    this.lastHarvest = null;
    this.touched = false; // değiştiyse parça bellekten atılmaz
  }

  available(now) {
    if (this.capacity === 0) return 0;
    if (this.lastHarvest === null) return this.capacity;
    const regrown = Math.floor(Calendar.growthTimeBetween(this.lastHarvest, now) / this.regrowTime);
    return Math.min(this.capacity, this.portionsAtHarvest + regrown);
  }

  take(count, now) {
    const available = this.available(now);
    const taken = Math.min(count, available);
    if (taken > 0) {
      this.portionsAtHarvest = available - taken;
      this.lastHarvest = now;
      this.touched = true;
    }
    return taken;
  }
}
