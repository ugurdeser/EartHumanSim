import { Relationship } from './Relationship.js';

/** Kişinin tanıdığı herkesle ilişkileri; ilk karşılaşmada tembel oluşturulur. */
export class RelationshipBook {
  constructor(owner, rng) {
    this.owner = owner;
    this.rng = rng;
    this.relations = new Map();
  }

  get(other) {
    let relation = this.relations.get(other.id);
    if (!relation) {
      relation = this.#firstImpression(other);
      this.relations.set(other.id, relation);
    }
    return relation;
  }

  /** Var olan ilişki; tanışmamışsa null (yeni ilişki oluşturmaz). */
  peek(other) {
    return this.relations.get(other.id) ?? null;
  }

  /** [kişi kimliği, ilişki] çiftleri. */
  entries() {
    return this.relations.entries();
  }

  set(other, relation) {
    this.relations.set(other.id, relation);
  }

  #firstImpression(other) {
    const potentialMate = this.owner.isAdult && other.isAdult && this.owner.sex !== other.sex;
    return new Relationship({
      affinity: this.rng.range(0, 0.25),
      attraction: potentialMate ? this.rng.range(0, 0.4) : 0,
    });
  }
}
