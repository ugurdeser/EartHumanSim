import { Entity } from './Entity.js';

/** Taş ocağı, çakmaktaşı yatağı ... Tükenmez, ama çıkarmak zaman ve güç ister. */
export class Mine extends Entity {
  constructor(x, y, { resource, name, color, radius = 12 }) {
    super(x, y);
    this.resource = resource; // MaterialType
    this.name = name;
    this.color = color;
    this.radius = radius;
  }
}
