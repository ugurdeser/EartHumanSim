import { NAMES, POPULATION, SURNAMES } from '../config.js';
import { BASIC_TECHNOLOGIES } from '../tech/Technologies.js';
import { Needs } from './Needs.js';
import { Person } from './Person.js';
import { Personality } from './Personality.js';
import { Relationship } from './Relationship.js';
import { Sex } from './Sex.js';
import { Traits } from './Traits.js';

const FAMILY_AFFINITY = 0.8;

/** Kişi üretimi: başlangıç yetişkinleri ve doğan çocuklar. */
export class PersonFactory {
  constructor(rng) {
    this.rng = rng;
    this.usedNames = new Set();
    this.usedSurnames = new Set();
  }

  /** Mümkün olduğunca tekrar etmeyen isim; havuz biterse soyadı ayırt eder. */
  #pickUnique(pool, used) {
    const unused = pool.filter((n) => !used.has(n));
    const value = this.rng.pick(unused.length > 0 ? unused : pool);
    used.add(value);
    return value;
  }

  #nextName(sex) {
    return this.#pickUnique(sex === Sex.MALE ? NAMES.MALE : NAMES.FEMALE, this.usedNames);
  }

  /** Çocuk, annesinin hanesinin soyadını; hane yoksa babasınınkini alır. */
  static #childSurname(mother, father) {
    return mother.family?.surname ?? father?.surname ?? mother.surname;
  }

  createAdult(sex, position, home) {
    const [minAge, maxAge] = POPULATION.START_AGE;
    const person = new Person({
      name: this.#nextName(sex),
      surname: this.#pickUnique(SURNAMES, this.usedSurnames),
      sex,
      position,
      ageYears: this.rng.range(minAge, maxAge),
      personality: Personality.random(this.rng),
      traits: Traits.random(this.rng),
      home,
      rng: this.rng,
      needs: new Needs({
        food: this.rng.range(0.6, 1),
        water: this.rng.range(0.6, 1),
        energy: this.rng.range(0.7, 1),
      }),
    });
    if (this.rng.chance(POPULATION.STARTING_TECH_CHANCE)) person.knowledge.learn(this.rng.pick(BASIC_TECHNOLOGIES));
    return person;
  }

  createChild(mother, father) {
    const sex = this.rng.chance(0.5) ? Sex.MALE : Sex.FEMALE;
    const child = new Person({
      name: this.#nextName(sex),
      surname: PersonFactory.#childSurname(mother, father),
      sex,
      position: mother.position.clone(),
      ageYears: 0,
      personality: Personality.inherit(this.rng, mother.personality, father?.personality),
      traits: Traits.inherit(this.rng, mother.traits, father?.traits),
      home: mother.home,
      rng: this.rng,
      needs: new Needs({ food: 0.8 }),
      mother,
      father,
    });
    for (const parent of [mother, father].filter(Boolean)) {
      parent.children.push(child);
      parent.relations.set(child, new Relationship({ affinity: FAMILY_AFFINITY }));
      child.relations.set(parent, new Relationship({ affinity: FAMILY_AFFINITY }));
    }
    mother.group?.add(child);
    return child;
  }
}
