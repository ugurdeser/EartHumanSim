import { Vector2 } from '../core/Vector2.js';

let nextId = 1;

/** Dünyadaki konumu olan her şeyin temel sınıfı. */
export class Entity {
  constructor(x, y) {
    this.id = nextId++;
    this.position = new Vector2(x, y);
  }
}
