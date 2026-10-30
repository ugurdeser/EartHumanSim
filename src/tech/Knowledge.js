import { ALL_TECHNOLOGIES } from './Technologies.js';

/** Bir kişinin bildiği teknolojiler. */
export class Knowledge {
  constructor() {
    this.known = new Set();
  }

  knows(technology) {
    return this.known.has(technology.id);
  }

  learn(technology) {
    if (this.knows(technology)) return false;
    this.known.add(technology.id);
    return true;
  }

  get technologies() {
    return ALL_TECHNOLOGIES.filter((t) => this.knows(t));
  }

  /** Önkoşulları bilinen ama kendisi bilinmeyen teknolojiler. */
  get researchable() {
    return ALL_TECHNOLOGIES.filter((t) => !this.knows(t) && t.prerequisites.every((id) => this.known.has(id)));
  }

  /** Bu kişinin bilip `other`ın bilmediği ve öğrenebileceği teknolojiler. */
  teachableTo(other) {
    return other.researchable.filter((t) => this.knows(t));
  }
}
