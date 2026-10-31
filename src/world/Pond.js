import { wrapDelta } from '../core/Planet.js';
import { ANIMALS } from '../config.js';
import { Vector2 } from '../core/Vector2.js';
import { Entity } from './Entity.js';

const NO_FISH = new Set();

export class Pond extends Entity {
  constructor(x, y, { radius, contaminated }) {
    super(x, y);
    this.radius = radius;
    this.contaminated = contaminated;
    this.school = null; // içindeki balık sürüsü (Herd)
  }

  /** Temiz göletlerde yarıçapa göre balık kapasitesi. */
  get fishCapacity() {
    return this.contaminated ? 0 : Math.max(1, Math.round(this.radius / ANIMALS.FISH.PER_POND_RADIUS));
  }

  /** İçinde yüzen balıklar. */
  get fish() {
    return this.school?.members ?? NO_FISH;
  }

  get hasFish() {
    return this.fish.size > 0;
  }

  /** Haritada yazan ad. */
  get mapLabel() {
    return this.contaminated ? 'Kirli gölet' : 'Gölet';
  }

  get destination() {
    return 'Gölete';
  }

  get shoreLabel() {
    return 'Göletin kıyısına';
  }

  /** Verilen noktaya bakan kıyı noktası. */
  shorePointFrom(from) {
    const dir = new Vector2(wrapDelta(from.x - this.position.x), from.y - this.position.y).normalize();
    if (dir.x === 0 && dir.y === 0) dir.set(1, 0);
    return dir.scale(this.radius + 1.5).add(this.position);
  }

  contains(point, margin = 0) {
    return this.position.distanceTo(point) <= this.radius + margin;
  }
}
