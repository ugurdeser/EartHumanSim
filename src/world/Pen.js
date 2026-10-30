import { PEN } from '../config.js';
import { Items } from '../items/Items.js';
import { Sex } from '../agents/Sex.js';
import { Herd } from '../animals/Herd.js';
import { Entity } from './Entity.js';

export const PEN_MATERIALS = Object.freeze([
  [Items.BRANCH, 10],
  [Items.WOOD, 4],
]);

/** Ağıl: bir yuvaya aittir; hayvanlar gündüz çevresinde otlar, gece korunur. */
export class Pen extends Entity {
  constructor(home) {
    super(home.position.x + PEN.OFFSET, home.position.y);
    this.home = home;
    this.radius = PEN.RADIUS;
    this.grazeRange = PEN.GRAZE_RANGE;
    this.herd = new Herd(this.position, { maxSize: PEN.CAPACITY, tether: this });
  }

  get animals() {
    return [...this.herd.members];
  }

  get hasRoom() {
    return !this.herd.isFull;
  }

  /** Üreyebilmek için eksik olan cinsiyet (ikisi de varsa null). */
  get missingSex() {
    const animals = this.animals;
    if (!animals.some((a) => a.isFemale)) return Sex.FEMALE;
    return animals.some((a) => !a.isFemale) ? null : Sex.MALE;
  }

  /** Ağıl terk edildi: hayvanlar yabana döner. */
  release(world) {
    for (const animal of this.animals) animal.release(world);
  }
}
