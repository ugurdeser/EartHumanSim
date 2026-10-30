import { FEATURES, WORLD } from '../config.js';
import { lerp } from '../core/MathUtils.js';
import { Vector2 } from '../core/Vector2.js';
import { Hillside } from './Hillside.js';
import { Mine } from './Mine.js';
import { ALL_MINE_TYPES } from './MineTypes.js';
import { Pond } from './Pond.js';
import { RiverSegment } from './RiverSegment.js';

const KM2 = 1e6;
const SEGMENT_SPACING = 0.7; // ardışık parçalar yarıçapın bu katı kadar arayla: kıyı düzgün görünür
const MEANDER_ANGLE = 0.7; // rad: nehrin kıvrılma açısı
const RIVER_LABEL_EVERY = 90; // kaç parçada bir haritaya "Nehir" yazılır

/**
 * Seyrek ama kalıcı yapıları tüm harita için baştan üretir: nehir, göletler, madenler, yamaçlar.
 * Bitkiler ise ChunkGenerator ile gerektikçe üretilir.
 */
export class FeatureGenerator {
  constructor(rng) {
    this.rng = rng;
  }

  generate(world, startCenter) {
    const areaKm2 = (world.size * world.size) / KM2;
    this.#placeRiver(world, startCenter);
    this.#placePonds(world, Math.round(areaKm2 * FEATURES.POND_DENSITY));
    for (const type of ALL_MINE_TYPES) this.#placeMines(world, type, Math.round(areaKm2 * type.density));
    this.#placeHillsides(world, Math.round(areaKm2 * FEATURES.HILLSIDE_DENSITY));
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

  /** Haritayı batıdan doğuya kıvrılarak geçen, başlangıç bölgesinin yakınından akan temiz nehir. */
  #placeRiver(world, startCenter) {
    const rng = this.rng;
    const size = world.size;
    const side = rng.chance(0.5) ? 1 : -1;
    const waypoint = startCenter.clone();
    waypoint.y += side * rng.range(...FEATURES.RIVER_WAYPOINT);
    const end = new Vector2(size, rng.range(size * 0.2, size * 0.8));
    const point = new Vector2(0, rng.range(size * 0.2, size * 0.8));
    const phase = rng.range(0, Math.PI * 2);
    const [narrow, wide] = FEATURES.RIVER_RADIUS;
    let index = 0;
    let travelled = 0;

    for (const target of [waypoint, end]) {
      while (point.distanceTo(target) > wide) {
        const radius = lerp(narrow, wide, point.x / size);
        const fishy = index % FEATURES.RIVER_FISH_EVERY === 0;
        const named = index % RIVER_LABEL_EVERY === 0;
        index++;
        world.addPond(new RiverSegment(point.x, point.y, { radius, named, fishCapacity: fishy ? FEATURES.RIVER_FISH : 0 }));

        const step = radius * SEGMENT_SPACING;
        const heading = Math.atan2(target.y - point.y, target.x - point.x) + Math.sin(travelled / FEATURES.RIVER_MEANDER + phase) * MEANDER_ANGLE;
        point.x += Math.cos(heading) * step;
        point.y += Math.sin(heading) * step;
        world.clampPosition(point);
        travelled += step;
      }
    }
  }

  #placePonds(world, count) {
    for (let i = 0; i < count; i++) {
      world.addPond(this.#pond(this.#randomPoint(world, 200), this.rng.chance(FEATURES.DIRTY_POND_RATIO)));
    }
  }

  #placeMines(world, type, count) {
    for (let i = 0; i < count; i++) {
      const p = this.#randomPoint(world, 100);
      if (!world.isWater(p.x, p.y, 20)) world.addMine(this.#mine(p, type));
    }
  }

  #hillside(position) {
    return new Hillside(position.x, position.y, {
      radius: this.rng.range(50, 120),
      warmth: this.rng.range(6, 10),
      forage: this.rng.range(0.3, 0.5),
    });
  }

  #placeHillsides(world, count) {
    for (let i = 0; i < count; i++) {
      const p = this.#randomPoint(world, 150);
      if (!world.isWater(p.x, p.y, 60)) world.addHillside(this.#hillside(p));
    }
  }

  /** İlk insanların çevresinde temiz su, bir yamaç ve her maden türünden en az biri olsun. */
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

    if (!world.findNearestHillside(center, WORLD.START_AREA_RADIUS)) {
      let p;
      do p = near();
      while (world.isWater(p.x, p.y, 60));
      world.addHillside(this.#hillside(p));
    }
  }
}
