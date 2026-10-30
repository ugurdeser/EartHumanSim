import { ANIMALS, COLORS } from '../config.js';
import { Items } from '../items/Items.js';
import { Animal } from './Animal.js';

const GRAZE_RADIUS = 25;
const THREAT_CHECK_INTERVAL = 4;
const S = ANIMALS.SHEEP;

/** Koyun: sürüyle otlar, insan ya da kurt yaklaşınca kaçar. Avlanınca et verir. */
export class Sheep extends Animal {
  static SPECIES = Object.freeze({ id: 'sheep', name: 'Koyun', color: COLORS.SHEEP, dangerous: false, huntable: true });

  constructor(x, y) {
    super(x, y);
    this.herd = null;
    this.target = null;
    this.pause = 0;
    this.threat = null;
    this.threatTimer = 0;
  }

  get meat() {
    return { type: Items.MEAT, amount: S.MEAT };
  }

  update(world, dt) {
    if (this.herd?.leader === this) this.herd.update(world, dt);
    this.threatTimer -= dt;
    if (this.threatTimer <= 0) {
      this.threatTimer = THREAT_CHECK_INTERVAL;
      this.threat = this.#nearestThreat(world);
    }
    if (this.threat) return this.#flee(this.threat, world, dt);
    this.#graze(world, dt);
  }

  #nearestThreat(world) {
    const person = world.peopleNear(this.position, S.FLEE_RADIUS)[0];
    if (person) return person.position.clone();
    return world.nearestDanger(this.position, S.FLEE_RADIUS * 1.5)?.animal.position.clone() ?? null;
  }

  #flee(from, world, dt) {
    const away = this.position.clone().sub(from).normalize().scale(30).add(this.position);
    this.moveTowards(away, S.FLEE_SPEED, dt, world);
    this.target = null;
  }

  #graze(world, dt) {
    if (this.pause > 0) {
      this.pause -= dt;
      return;
    }
    const center = this.herd?.center ?? this.position;
    if (!this.target) this.target = world.randomPointNear(center, GRAZE_RADIUS);
    if (this.moveTowards(this.target, S.WALK_SPEED, dt, world)) {
      this.target = null;
      this.pause = world.rng.range(60, 400);
    }
  }

  die() {
    super.die();
    this.herd?.members.delete(this);
  }
}
