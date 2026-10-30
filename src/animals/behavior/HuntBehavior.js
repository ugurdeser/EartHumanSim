import { Combat } from '../../agents/Combat.js';
import { Animal } from '../Animal.js';
import { AnimalBehavior } from './AnimalBehavior.js';

const BITE_RANGE = 2;

/**
 * Acıkınca avlanmak: önce avlanabilir hayvanlar, yoksa yalnız kalmış insan. Saldırganlık
 * geni insana saldırma isteğini belirler. Düşen av tüm sürüyü doyurur.
 * Profil: { detectRadius, chaseTime, threshold, cooldown, deterrence }.
 */
export class HuntBehavior extends AnimalBehavior {
  constructor(profile) {
    super('Avlanıyor');
    this.profile = profile;
    this.prey = null;
    this.candidate = null;
    this.elapsed = 0;
    this.restUntil = 0;
  }

  get isChasing() {
    return this.prey !== null;
  }

  urgency(animal, world) {
    if (this.prey) return 0.9;
    const { threshold } = this.profile;
    if (animal.domestication || animal.isYoung || animal.needs.food >= threshold || world.now < this.restUntil) return 0;
    this.candidate = this.#findPrey(animal, world);
    return this.candidate ? 0.7 + (threshold - animal.needs.food) : 0;
  }

  start(_animal, world) {
    if (this.prey) return;
    this.prey = this.candidate;
    this.elapsed = 0;
    // kovalanan sürü uyuyorsa uyanır (kaçabilsin)
    if (this.prey instanceof Animal) this.prey.alert(world);
  }

  quietFor(animal, world) {
    if (this.prey) return 0;
    if (animal.domestication || animal.isYoung) return Infinity;
    return Math.max(this.restUntil - world.now, AnimalBehavior.timeUntilBelow(animal, 'food', this.profile.threshold));
  }

  #findPrey(animal, world) {
    const { detectRadius } = this.profile;
    const prey = world.nearestAnimal(animal.position, detectRadius, (a) => a.species.huntable && !a.isSheltered(world));
    if (prey) return prey.animal;
    if (!world.rng.chance(animal.genome.get('ferocity'))) return null;
    let best = null;
    let bestDistance = detectRadius;
    for (const person of world.people) {
      const distance = person.position.distanceTo(animal.position);
      if (distance < bestDistance && this.#isVulnerable(person, world)) {
        best = person;
        bestDistance = distance;
      }
    }
    return best;
  }

  #isVulnerable(person, world) {
    return world.peopleNear(person.position, 25, person).length < this.profile.deterrence;
  }

  tick(animal, world, dt) {
    const prey = this.prey;
    if (!prey) return true;
    this.elapsed += dt;
    const isPerson = !(prey instanceof Animal);
    if (!prey.alive || this.elapsed > this.profile.chaseTime || (isPerson && !this.#isVulnerable(prey, world))) return this.#finish(world);

    animal.moveTowards(prey.position, animal.runSpeed, dt, world);
    if (animal.position.distanceTo(prey.position) > BITE_RANGE) return false;

    if (isPerson) Combat.wolfAttacksPerson(animal, prey, world);
    else prey.die('kurt');
    if (animal.alive && !prey.alive) this.#feedPack(animal);
    return this.#finish(world);
  }

  #feedPack(animal) {
    for (const member of animal.herd?.members ?? [animal]) member.needs.eat(1);
  }

  #finish(world) {
    this.prey = null;
    this.restUntil = world.now + this.profile.cooldown;
    return true;
  }
}
