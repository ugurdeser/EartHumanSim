import { ANIMALS } from '../config.js';
import { Vector2 } from '../core/Vector2.js';
import { Entity } from './Entity.js';

export class Pond extends Entity {
  constructor(x, y, { radius, contaminated }) {
    super(x, y);
    this.radius = radius;
    this.contaminated = contaminated;
    this.fish = new Set(); // içinde yüzen Fish hayvanları
  }

  /** Temiz göletlerde yarıçapa göre balık kapasitesi. */
  get fishCapacity() {
    return this.contaminated ? 0 : Math.max(1, Math.round(this.radius / ANIMALS.FISH.PER_POND_RADIUS));
  }

  get hasFish() {
    return this.fish.size > 0;
  }

  /** Verilen noktaya bakan kıyı noktası. */
  shorePointFrom(from) {
    const dir = new Vector2(from.x - this.position.x, from.y - this.position.y).normalize();
    if (dir.x === 0 && dir.y === 0) dir.set(1, 0);
    return dir.scale(this.radius + 1.5).add(this.position);
  }

  contains(point, margin = 0) {
    return this.position.distanceTo(point) <= this.radius + margin;
  }
}
