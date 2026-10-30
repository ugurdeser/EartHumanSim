import { Entity } from './Entity.js';

/** Ot öbeği. Şimdilik yalnızca görsel; ileride otlayan hayvanlar için kaynak olabilir. */
export class Grass extends Entity {
  constructor(x, y, { radius }) {
    super(x, y);
    this.radius = radius;
  }
}
