import { FEATURES, PLANET, WORLD } from '../config.js';
import { Vector2 } from '../core/Vector2.js';
import { Mine } from './Mine.js';
import { Outline } from './Outline.js';
import { ALL_MINE_TYPES } from './MineTypes.js';
import { Pond } from './Pond.js';

const KM2 = 1e6;
const BASIN_STEP = 60; // m: göletin çukura inerken attığı adım
const BASIN_STEPS = 6;
const BASIN_DIRECTIONS = 8;

/**
 * Seyrek ama kalıcı yapıları tüm harita için baştan üretir: göletler, madenler.
 * Bitkiler ise ChunkGenerator ile gerektikçe üretilir.
 */
export class FeatureGenerator {
  constructor(rng) {
    this.rng = rng;
  }

  generate(world, startCenter) {
    this.#placePonds(world, this.#points(world, startCenter, FEATURES.POND_DENSITY));
    for (const type of ALL_MINE_TYPES) this.#placeMines(world, type, this.#points(world, startCenter, type.density));
    this.#guaranteeStartArea(world, startCenter);
  }

  /** Başlangıç çevresinde tam yoğunlukta, gezegenin geri kalanında seyrek noktalar. */
  #points(world, center, density) {
    const homeSide = PLANET.HOME_RADIUS * 2;
    const homeCount = Math.round(((homeSide * homeSide) / KM2) * density);
    const farCount = Math.round(((world.width * world.height) / KM2) * density * PLANET.SPARSE);
    const home = Array.from({ length: homeCount }, () => new Vector2(center.x + this.rng.range(-homeSide / 2, homeSide / 2), center.y + this.rng.range(-homeSide / 2, homeSide / 2)));
    const far = Array.from({ length: farCount }, () => new Vector2(this.rng.range(0, world.width), this.rng.range(0, world.height)));
    return [...home, ...far];
  }

  /** Noktanın çevresindeki yönler. */
  #ring(point, distance) {
    return Array.from({ length: BASIN_DIRECTIONS }, (_, i) => {
      const angle = (i / BASIN_DIRECTIONS) * Math.PI * 2;
      return new Vector2(point.x + Math.cos(angle) * distance, point.y + Math.sin(angle) * distance);
    });
  }

  /** Su akıp çukura iner. */
  #basin(world, start) {
    const { terrain } = world;
    let point = start;
    for (let i = 0; i < BASIN_STEPS; i++) {
      const lower = this.#ring(point, BASIN_STEP)
        .filter((p) => world.isPassable(p.x, p.y))
        .reduce((best, p) => (terrain.elevationAt(p.x, p.y) < terrain.elevationAt(best.x, best.y) ? p : best), point);
      if (lower === point) break;
      point = lower;
    }
    world.clampPosition(point);
    return point;
  }

  #pond(world, start) {
    const position = this.#basin(world, start);
    const radius = this.rng.range(25, 90);
    const outline = Outline.ofWater(world.terrain, position.x, position.y, radius, this.rng);
    return new Pond(position.x, position.y, { radius, outline });
  }

  #mine(position, type) {
    return new Mine(position.x, position.y, { resource: type.resource, name: type.name, color: type.color });
  }

  #placePonds(world, points) {
    for (const p of points) {
      if (world.isPassable(p.x, p.y)) world.addPond(this.#pond(world, p));
    }
  }

  #placeMines(world, type, points) {
    for (const p of points) {
      if (!world.isWater(p.x, p.y, 20)) world.addMine(this.#mine(p, type));
    }
  }

  /** İlk insanların çevresinde su ve her maden türünden en az biri olsun. */
  #guaranteeStartArea(world, center) {
    const near = () => world.randomPointNear(center, WORLD.START_AREA_RADIUS);
    for (let i = world.pondsNear(center, WORLD.START_AREA_RADIUS).length; i < 2; i++) world.addPond(this.#pond(world, near()));

    for (const type of ALL_MINE_TYPES) {
      if (world.findNearestMine(center, type.resource, WORLD.START_AREA_RADIUS)) continue;
      let p;
      do p = near();
      while (world.isWater(p.x, p.y, 20));
      world.addMine(this.#mine(p, type));
    }
  }
}
