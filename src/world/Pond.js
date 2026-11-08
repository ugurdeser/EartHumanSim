import { wrapDelta } from '../core/Planet.js';
import { ANIMALS } from '../config.js';
import { Vector2 } from '../core/Vector2.js';
import { Entity } from './Entity.js';

const NO_FISH = new Set();

export class Pond extends Entity {
  constructor(x, y, { radius, outline = null }) {
    super(x, y);
    this.radius = radius;
    this.outline = outline; // yoksa tam daire
    this.school = null; // içindeki balık sürüsü (Herd)
  }

  /** Yarıçapa göre balık kapasitesi. */
  get fishCapacity() {
    return Math.max(1, Math.round(this.radius / ANIMALS.FISH.PER_POND_RADIUS));
  }

  /** Merkezden her yöne en az bu kadar su var. */
  get innerRadius() {
    return this.outline?.inner ?? this.radius;
  }

  /** İçinde yüzen balıklar. */
  get fish() {
    return this.school?.members ?? NO_FISH;
  }

  get hasFish() {
    return this.fish.size > 0;
  }

  /** Haritada yazan ad. */
  get mapLabel() {
    return 'Gölet';
  }

  get destination() {
    return 'Gölete';
  }

  get shoreLabel() {
    return 'Göletin kıyısına';
  }

  #reach(dx, dy) {
    return this.outline?.radiusToward(Math.atan2(dy, dx)) ?? this.radius;
  }

  /** Verilen noktaya bakan kıyı noktası. */
  shorePointFrom(from) {
    const dir = new Vector2(wrapDelta(from.x - this.position.x), from.y - this.position.y).normalize();
    if (dir.x === 0 && dir.y === 0) dir.set(1, 0);
    return dir.scale(this.#reach(dir.x, dir.y) + 1.5).add(this.position);
  }

  contains(point, margin = 0) {
    return this.position.distanceTo(point) <= this.#reach(wrapDelta(point.x - this.position.x), point.y - this.position.y) + margin;
  }

  /** Kıyı çizgisini yola ekler; `least`: suyun en az görüneceği yarıçap. */
  trace(ctx, scale = 1, least = 0) {
    const grown = Math.max(scale, least / this.radius);
    const x = this.position.x * scale;
    const y = this.position.y * scale;
    if (this.outline) this.outline.trace(ctx, x, y, grown);
    else {
      ctx.moveTo(x + this.radius * grown, y);
      ctx.arc(x, y, this.radius * grown, 0, Math.PI * 2);
    }
  }
}
