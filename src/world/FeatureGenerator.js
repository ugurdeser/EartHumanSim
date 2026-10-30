import { FEATURES, WORLD } from '../config.js';
import { Vector2 } from '../core/Vector2.js';
import { ContaminationZone } from './ContaminationZone.js';
import { Mine } from './Mine.js';
import { ALL_MINE_TYPES } from './MineTypes.js';
import { Pond } from './Pond.js';

const KM2 = 1e6;

/**
 * Seyrek ama kalıcı yapıları tüm harita için baştan üretir: göletler, leş alanları, madenler.
 * Bitkiler ise ChunkGenerator ile gerektikçe üretilir.
 */
export class FeatureGenerator {
  constructor(rng) {
    this.rng = rng;
  }

  generate(world, startCenter) {
    const areaKm2 = (world.size * world.size) / KM2;
    this.#placePonds(world, Math.round(areaKm2 * FEATURES.POND_DENSITY));
    this.#placeZones(world, Math.round(areaKm2 * FEATURES.CONTAMINATION_DENSITY));
    for (const type of ALL_MINE_TYPES) this.#placeMines(world, type, Math.round(areaKm2 * type.density));
    this.#guaranteeStartArea(world, startCenter);
  }

  #randomPoint(world, margin) {
    return new Vector2(this.rng.range(margin, world.size - margin), this.rng.range(margin, world.size - margin));
  }

  #pond(position, contaminated) {
    return new Pond(position.x, position.y, { radius: this.rng.range(25, 90), contaminated });
  }

  #mine(position, type) {
    return new Mine(position.x, position.y, { resource: type.resource, name: type.name, color: type.color });
  }

  #placePonds(world, count) {
    for (let i = 0; i < count; i++) {
      world.addPond(this.#pond(this.#randomPoint(world, 200), this.rng.chance(FEATURES.DIRTY_POND_RATIO)));
    }
  }

  #placeZones(world, count) {
    for (let i = 0; i < count; i++) {
      const p = this.#randomPoint(world, 100);
      world.addContaminationZone(new ContaminationZone(p.x, p.y, { radius: this.rng.range(12, 35) }));
    }
  }

  #placeMines(world, type, count) {
    for (let i = 0; i < count; i++) {
      const p = this.#randomPoint(world, 100);
      if (!world.isWater(p.x, p.y, 20)) world.addMine(this.#mine(p, type));
    }
  }

  /** İlk insanların çevresinde temiz su ve her maden türünden en az biri olsun. */
  #guaranteeStartArea(world, center) {
    const near = () => world.randomPointNear(center, WORLD.START_AREA_RADIUS);
    const cleanPonds = world.pondsNear(center, WORLD.START_AREA_RADIUS).filter((p) => !p.contaminated);
    for (let i = cleanPonds.length; i < 2; i++) world.addPond(this.#pond(near(), false));

    for (const type of ALL_MINE_TYPES) {
      if (world.findNearestMine(center, type.resource, WORLD.START_AREA_RADIUS)) continue;
      let p;
      do p = near();
      while (world.isWater(p.x, p.y, 20));
      world.addMine(this.#mine(p, type));
    }
  }
}
