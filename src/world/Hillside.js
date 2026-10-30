import { Entity } from './Entity.js';

/**
 * Yamaç: rüzgârı kesen korunaklı arazi. Hayvanlar kışın buraya sığınır;
 * içindekiler daha az üşür (warmth °C) ve karın altında kalmayan otları bulur (forage).
 */
export class Hillside extends Entity {
  constructor(x, y, { radius, warmth, forage }) {
    super(x, y);
    this.radius = radius;
    this.warmth = warmth;
    this.forage = forage;
  }

  contains(point) {
    return this.position.distanceTo(point) <= this.radius;
  }
}
