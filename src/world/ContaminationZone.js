import { Entity } from './Entity.js';

/** Leş / çürüme alanı: Tiksinme güdüsünü tetikler. */
export class ContaminationZone extends Entity {
  constructor(x, y, { radius }) {
    super(x, y);
    this.radius = radius;
  }

  distanceToEdge(point) {
    return this.position.distanceTo(point) - this.radius;
  }
}
