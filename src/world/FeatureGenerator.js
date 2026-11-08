import { FEATURES, PLANET, WORLD } from '../config.js';
import { Vector2 } from '../core/Vector2.js';
import { FeatureRegions } from './FeatureRegions.js';
import { Mine } from './Mine.js';
import { Outline } from './Outline.js';
import { ALL_MINE_TYPES } from './MineTypes.js';
import { Pond } from './Pond.js';

const KM2 = 1e6;
const BASIN_STEP = 60; // m: göletin çukura inerken attığı adım
const BASIN_STEPS = 6;
const BASIN_DIRECTIONS = 8;

/**
 * Seyrek ama kalıcı yapılar: göletler, madenler. Başlangıç çevresi tam yoğunlukta baştan üretilir;
 * gezegenin geri kalanı seyrek, bölge bölge ve gerektikçe (FeatureRegions).
 * Bitkiler ise ChunkGenerator ile gerektikçe üretilir.
 */
export class FeatureGenerator {
  constructor(rng) {
    this.rng = rng;
  }

  generate(world, startCenter) {
    const homeSide = PLANET.HOME_RADIUS * 2;
    const home = (density) => this.#scatter(this.rng, startCenter.x - homeSide / 2, startCenter.y - homeSide / 2, homeSide, homeSide, density);
    this.#placePonds(world, this.rng, home(FEATURES.POND_DENSITY));
    for (const type of ALL_MINE_TYPES) this.#placeMines(world, type, home(type.density));

    const regions = new FeatureRegions(world.width, world.height, this.rng.seed, (rng, minX, minY, maxX, maxY) => this.#populate(world, rng, minX, minY, maxX, maxY));
    const ensure = (...rect) => regions.ensure(...rect);
    world.pondGrid.onQuery = ensure;
    world.mineGrid.onQuery = ensure;
    world.featureRegions = regions;
    regions.generateAllIfSmall();

    this.#guaranteeStartArea(world, startCenter);
  }

  /** Uzak bir bölgenin seyrek göletleri ve madenleri. */
  #populate(world, rng, minX, minY, maxX, maxY) {
    const scatter = (density) => this.#scatter(rng, minX, minY, maxX - minX, maxY - minY, density * PLANET.SPARSE);
    this.#placePonds(world, rng, scatter(FEATURES.POND_DENSITY));
    for (const type of ALL_MINE_TYPES) this.#placeMines(world, type, scatter(type.density));
  }

  /** Alana yoğunluğa göre rastgele noktalar (beklenen sayının kesri de olasılıkla eklenir). */
  #scatter(rng, x, y, width, height, density) {
    const expected = ((width * height) / KM2) * density;
    const count = Math.floor(expected) + (rng.next() < expected % 1 ? 1 : 0);
    return Array.from({ length: count }, () => new Vector2(x + rng.range(0, width), y + rng.range(0, height)));
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

  #pond(world, rng, start) {
    const position = this.#basin(world, start);
    const radius = rng.range(25, 90);
    const outline = Outline.ofWater(world.terrain, position.x, position.y, radius, rng);
    return new Pond(position.x, position.y, { radius, outline });
  }

  #mine(position, type) {
    return new Mine(position.x, position.y, { resource: type.resource, name: type.name, color: type.color });
  }

  #placePonds(world, rng, points) {
    for (const p of points) {
      world.clampPosition(p);
      if (world.isPassable(p.x, p.y)) world.addPond(this.#pond(world, rng, p));
    }
  }

  #placeMines(world, type, points) {
    for (const p of points) {
      world.clampPosition(p);
      if (!world.isWater(p.x, p.y, 20)) world.addMine(this.#mine(p, type));
    }
  }

  /** İlk insanların çevresinde su ve her maden türünden en az biri olsun. */
  #guaranteeStartArea(world, center) {
    const near = () => world.randomPointNear(center, WORLD.START_AREA_RADIUS);
    for (let i = world.pondsNear(center, WORLD.START_AREA_RADIUS).length; i < 2; i++) world.addPond(this.#pond(world, this.rng, near()));

    for (const type of ALL_MINE_TYPES) {
      if (world.findNearestMine(center, type.resource, WORLD.START_AREA_RADIUS)) continue;
      let p;
      do p = near();
      while (world.isWater(p.x, p.y, 20));
      world.addMine(this.#mine(p, type));
    }
  }
}
