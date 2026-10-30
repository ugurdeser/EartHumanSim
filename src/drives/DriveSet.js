import { DRIVE_TYPES } from './DriveRegistry.js';

/** Bir kişinin 15 güdüsünün koleksiyonu. */
export class DriveSet {
  constructor(drives) {
    this.list = drives;
    this.byId = new Map(drives.map((d) => [d.id, d]));
  }

  static fromPersonality(personality) {
    return new DriveSet(DRIVE_TYPES.map((Type) => new Type(personality.weightOf(Type.ID))));
  }

  get(id) {
    const drive = this.byId.get(id);
    if (!drive) throw new Error(`Bilinmeyen güdü: ${id}`);
    return drive;
  }

  evaluate(person, world, dt) {
    for (const drive of this.list) drive.evaluate(person, world, dt);
  }

  ranked() {
    return [...this.list].sort((a, b) => b.urgency - a.urgency);
  }
}
