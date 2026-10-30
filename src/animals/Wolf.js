import { ANIMALS, COLORS } from '../config.js';
import { Combat } from '../agents/Combat.js';
import { Animal } from './Animal.js';

const State = Object.freeze({ ROAM: 'roam', CHASE: 'chase', REST: 'rest' });
const SCAN_INTERVAL = 10;
const ROAM_RADIUS = 400;
const W = ANIMALS.WOLF;

/** Kurt: koyun avlar, yalnız kalan insanlara saldırır, kalabalıktan çekinir. */
export class Wolf extends Animal {
  static SPECIES = Object.freeze({ id: 'wolf', name: 'Kurt', color: COLORS.WOLF, dangerous: true, huntable: false });

  constructor(x, y) {
    super(x, y);
    this.state = State.ROAM;
    this.target = null;
    this.prey = null;
    this.timer = 0;
    this.scanTimer = 0;
  }

  get isChasing() {
    return this.state === State.CHASE;
  }

  update(world, dt) {
    switch (this.state) {
      case State.ROAM:
        return this.#roam(world, dt);
      case State.CHASE:
        return this.#chase(world, dt);
      case State.REST:
        return this.#rest(world, dt);
    }
  }

  #roam(world, dt) {
    if (!this.target) this.target = world.randomPointNear(this.position, ROAM_RADIUS);
    if (this.moveTowards(this.target, W.ROAM_SPEED, dt, world)) this.target = null;

    this.scanTimer -= dt;
    if (this.scanTimer > 0) return;
    this.scanTimer = SCAN_INTERVAL;
    this.prey = this.#findPrey(world);
    if (!this.prey) return;
    this.timer = 0;
    this.state = State.CHASE;
  }

  /** Önce koyun; yoksa savunmasız insan. */
  #findPrey(world) {
    const sheep = world.nearestAnimal(this.position, W.DETECT_RADIUS, (a) => a.isHuntable);
    if (sheep) return sheep.animal;
    let best = null;
    let bestDistance = W.DETECT_RADIUS;
    for (const person of world.people) {
      const distance = person.position.distanceTo(this.position);
      if (distance < bestDistance && this.#isVulnerable(person, world)) {
        best = person;
        bestDistance = distance;
      }
    }
    return best;
  }

  #isVulnerable(person, world) {
    return world.peopleNear(person.position, 25, person).length < W.GROUP_DETERRENCE;
  }

  #chase(world, dt) {
    const prey = this.prey;
    this.timer += dt;
    const isPerson = !(prey instanceof Animal);
    if (!prey.alive || this.timer > W.CHASE_TIME || (isPerson && !this.#isVulnerable(prey, world))) return this.#giveUp();

    this.moveTowards(prey.position, W.CHASE_SPEED, dt, world);
    if (this.position.distanceTo(prey.position) > 2) return;

    if (isPerson) Combat.wolfAttacksPerson(this, prey, world);
    else prey.die();
    if (this.alive) this.#restAfterHunt(world);
  }

  #restAfterHunt(world) {
    this.prey = null;
    this.timer = W.COOLDOWN;
    this.target = world.randomPointNear(this.position, ROAM_RADIUS);
    this.state = State.REST;
  }

  #giveUp() {
    this.prey = null;
    this.target = null;
    this.state = State.ROAM;
    this.scanTimer = SCAN_INTERVAL * 3;
  }

  #rest(world, dt) {
    this.timer -= dt;
    if (this.target && this.moveTowards(this.target, W.ROAM_SPEED, dt, world)) this.target = null;
    if (this.timer <= 0) this.state = State.ROAM;
  }
}
