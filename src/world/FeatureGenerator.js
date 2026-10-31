import { FEATURES, PLANET, WORLD } from '../config.js';
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
    this.#placeRiver(world, startCenter);
    this.#placePonds(world, this.#points(world, startCenter, FEATURES.POND_DENSITY));
    for (const type of ALL_MINE_TYPES) this.#placeMines(world, type, this.#points(world, startCenter, type.density));
    this.#placeHillsides(world, this.#points(world, startCenter, FEATURES.HILLSIDE_DENSITY));
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

  #pond(position, contaminated) {
    return new Pond(position.x, position.y, { radius: this.rng.range(25, 90), contaminated });
  }

  #mine(position, type) {
    return new Mine(position.x, position.y, { resource: type.resource, name: type.name, color: type.color });
  }

  /** Başlangıç diyarını batıdan doğuya kıvrılarak geçen, başlangıç bölgesinin yakınından akan temiz nehir. */
  #placeRiver(world, startCenter) {
    const rng = this.rng;
    const span = PLANET.HOME_RADIUS;
    const side = rng.chance(0.5) ? 1 : -1;
    const waypoint = startCenter.clone();
    waypoint.y += side * rng.range(...FEATURES.RIVER_WAYPOINT);
    const reach = () => startCenter.y + rng.range(-span * 0.6, span * 0.6);
    const end = new Vector2(startCenter.x + span, reach());
    const point = new Vector2(startCenter.x - span, reach());
    const phase = rng.range(0, Math.PI * 2);
    const [narrow, wide] = FEATURES.RIVER_RADIUS;
    let index = 0;
    let travelled = 0;

    for (const target of [waypoint, end]) {
      while (point.distanceTo(target) > wide) {
        const radius = lerp(narrow, wide, (point.x - startCenter.x + span) / (span * 2));
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

  #placePonds(world, points) {
    for (const p of points) {
      if (world.isPassable(p.x, p.y)) world.addPond(this.#pond(p, this.rng.chance(FEATURES.DIRTY_POND_RATIO)));
    }
  }

  #placeMines(world, type, points) {
    for (const p of points) {
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

  #placeHillsides(world, points) {
    for (const p of points) {
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
