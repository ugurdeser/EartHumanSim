import { Family } from './Family.js';

/** Ailelerin kurulması, birleşmesi ve dağılması. */
export class FamilyRegistry {
  constructor(world) {
    this.world = world;
    this.families = [];
    this.nextId = 1;
  }

  /**
   * Yeni çift için aile kurar. Kadın erkeğin soyadını alır; iki tarafın da
   * bakmakla yükümlü olduğu çocuklar yeni haneye taşınır.
   */
  found(husband, wife, home) {
    const family = new Family(this.nextId++, { surname: husband.surname, husband, wife, home });
    this.families.push(family);
    const dependents = [...husband.dependentChildren, ...wife.dependentChildren];
    for (const person of [husband, wife, ...dependents]) family.add(person);
    wife.surname = husband.surname;
    this.prune();
    return family;
  }

  /** Doğan çocuk annesinin hanesine katılır. */
  registerBirth(child, mother) {
    mother.family?.add(child);
  }

  /** Yetişkin olan kişi ailesinin hanesinden ayrılır. */
  leave(person) {
    person.family?.remove(person);
    this.prune();
  }

  /** Yaşayan üyesi kalmayan aileleri kaldırır. */
  prune() {
    const [empty, alive] = [[], []];
    for (const family of this.families) (family.isEmpty ? empty : alive).push(family);
    this.families = alive;
    for (const family of empty) {
      if (family.home.family === family) family.home.family = null;
    }
  }
}
