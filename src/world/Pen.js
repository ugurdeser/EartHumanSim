import { PEN } from '../config.js';
import { Items } from '../items/Items.js';
import { Sex } from '../agents/Sex.js';
import { Herd } from '../animals/Herd.js';
import { Vector2 } from '../core/Vector2.js';
import { Entity } from './Entity.js';

export const PEN_MATERIALS = Object.freeze([
  [Items.BRANCH, 10],
  [Items.WOOD, 4],
]);

const INNER_MARGIN = 1.5; // hayvanlar çitin bu kadar içinde kalır

/** Ağıl: bir yuvaya ait kare çit; hayvanlar içinde gezer ve otlar, yalnızca su içmeye çıkar. */
export class Pen extends Entity {
  constructor(home) {
    super(home.position.x + PEN.OFFSET, home.position.y);
    this.home = home;
    this.halfSize = PEN.HALF_SIZE;
    this.fence = this.#fencePosts();
    this.herd = new Herd(this.position, { maxSize: PEN.CAPACITY, tether: this });
  }

  /** Karenin kenarları boyunca çit noktaları. */
  #fencePosts() {
    const { x, y } = this.position;
    const size = this.halfSize;
    const steps = Math.round((size * 2) / PEN.POST_SPACING);
    const posts = [];
    for (let i = 0; i < steps; i++) {
      const along = -size + (i * size * 2) / steps;
      posts.push(new Vector2(x + along, y - size), new Vector2(x + size, y + along), new Vector2(x - along, y + size), new Vector2(x - size, y - along));
    }
    return posts.map((position) => ({ position }));
  }

  /** Çitin içinde rastgele bir nokta. */
  randomPointInside(rng) {
    const reach = this.halfSize - INNER_MARGIN;
    return new Vector2(this.position.x + rng.range(-reach, reach), this.position.y + rng.range(-reach, reach));
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
