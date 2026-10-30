import { AnimalBehavior } from './AnimalBehavior.js';

const FOLLOW_RANGE = 60; // yavru annesinden bundan fazla uzaklaşamaz
const CLOSE_ENOUGH = 15;

/** Yavru annesinden ayrılmaz: uzaklaşınca peşinden koşar. Yalnızca kaçmak ve aşırı susuzluk bundan önce gelir. */
export class FollowMotherBehavior extends AnimalBehavior {
  constructor() {
    super('Annesinin peşinde');
  }

  urgency(animal) {
    if (!animal.isYoung || !animal.followsMother) return 0;
    return animal.position.distanceTo(animal.mother.position) > FOLLOW_RANGE ? 0.9 : 0;
  }

  quietFor(animal) {
    return this.urgency(animal) > 0 ? 0 : Infinity;
  }

  tick(animal, world, dt) {
    const { mother } = animal;
    if (!animal.followsMother) return true;
    animal.moveTowards(mother.position, animal.runSpeed, dt, world);
    return animal.position.distanceTo(mother.position) <= CLOSE_ENOUGH;
  }
}
