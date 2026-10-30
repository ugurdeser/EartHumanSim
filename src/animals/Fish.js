import { COLORS } from '../config.js';
import { Items } from '../items/Items.js';
import { Animal } from './Animal.js';

const SWIM_SPEED = 0.4;

/** Balık: göletinin içinde yüzer; oltayla tutulur. */
export class Fish extends Animal {
  static SPECIES = Object.freeze({ id: 'fish', name: 'Balık', color: COLORS.FISH, dangerous: false, huntable: false });

  constructor(pond, rng) {
    const angle = rng.angle();
    const r = Math.sqrt(rng.next()) * pond.radius * 0.8;
    super(pond.position.x + Math.cos(angle) * r, pond.position.y + Math.sin(angle) * r);
    this.pond = pond;
    this.target = null;
    pond.fish.add(this);
  }

  get catch() {
    return { type: Items.FISH, amount: 1 };
  }

  update(world, dt) {
    if (!this.target) {
      const angle = world.rng.angle();
      const r = Math.sqrt(world.rng.next()) * this.pond.radius * 0.8;
      this.target = this.pond.position.clone();
      this.target.x += Math.cos(angle) * r;
      this.target.y += Math.sin(angle) * r;
    }
    if (this.moveTowards(this.target, SWIM_SPEED, dt, world)) this.target = null;
  }

  die() {
    super.die();
    this.pond.fish.delete(this);
  }
}
