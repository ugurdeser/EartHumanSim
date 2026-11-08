import { ATMOSPHERE, DAY } from '../../config.js';
import { latitudeOf, wrapDelta } from '../../core/Planet.js';
import { Random } from '../../core/Random.js';
import { Circulation } from './Circulation.js';

const RAD = Math.PI / 180;
const REACH = 3; // yarıçapın bu katından ötesi hesaba katılmaz

export const SystemKind = Object.freeze({
  CYCLONE: Object.freeze({ id: 'cyclone', name: 'Alçak basınç', sign: -1, ...ATMOSPHERE.CYCLONE }),
  ANTICYCLONE: Object.freeze({ id: 'anticyclone', name: 'Yüksek basınç', sign: 1, ...ATMOSPHERE.ANTICYCLONE }),
  HURRICANE: Object.freeze({ id: 'hurricane', name: 'Kasırga', sign: -1, ...ATMOSPHERE.HURRICANE }),
});

/**
 * Gezen basınç sistemleri: orta enlemde batı rüzgârlarıyla doğuya ilerleyen alçak basınçlar
 * (cepheler, yağmur), durgun yüksek basınçlar (açık hava) ve sıcak denizde doğan kasırgalar.
 * Basınçlarını alana ekler; rüzgâr, Coriolis ve yakınsama onlardan kendiliğinden doğar.
 */
export class PressureSystems {
  /** `rate`: doğma sıklığının çarpanı (sakin ↔ fırtınalı gezegen). */
  constructor(grid, surface, seed, rate = 1) {
    this.grid = grid;
    this.surface = surface;
    this.rate = rate;
    this.rng = new Random(seed);
    this.list = [];
  }

  /** Sistemleri ilerletir, yaşlandırır, yenilerini doğurur. */
  update(state, dt) {
    for (const system of this.list) this.#move(system, state, dt);
    this.list = this.list.filter((s) => s.age < s.life && Math.abs(latitudeOf(s.y)) < 82 * RAD);
    for (const kind of Object.values(SystemKind)) {
      for (const hemisphere of [1, -1]) {
        if (this.rng.next() < (kind.PER_DAY * this.rate * dt) / DAY) this.#spawn(kind, hemisphere, state);
      }
    }
  }

  #spawn(kind, hemisphere, state) {
    const { grid } = this;
    const latitude = hemisphere * this.rng.range(kind.LATITUDE[0], kind.LATITUDE[1]) * RAD;
    const x = this.rng.range(0, grid.width);
    const y = (0.5 - latitude / Math.PI) * grid.height;
    if (kind === SystemKind.HURRICANE) {
      const cell = grid.cellAt(x, y);
      if (this.surface.land[cell] > 0.3 || state.theta[cell] < kind.SEA_TEMPERATURE) return; // ılık deniz şart
    }
    this.spawnAt(kind, x, y);
  }

  /** Verilen noktada, türünün ölçülerinde yeni bir sistem (geliştirici paneli de kullanır). */
  spawnAt(kind, x, y) {
    this.list.push({
      kind,
      x,
      y,
      depth: this.rng.range(kind.DEPTH[0], kind.DEPTH[1]) * kind.sign, // hPa
      radius: this.rng.range(kind.RADIUS[0], kind.RADIUS[1]), // m (Dünya ölçeği)
      life: this.rng.range(kind.LIFE[0], kind.LIFE[1]) * DAY,
      age: 0,
    });
  }

  /** Genel dolaşımla sürüklenir; kasırga karada çabuk söner. */
  #move(system, state, dt) {
    const { grid } = this;
    const latitude = latitudeOf(system.y);
    const { east } = Circulation.background(latitude, state.declination);
    const pole = Math.sign(latitude) || 1;
    const speedEast = system.kind === SystemKind.HURRICANE ? Math.min(east, -2) * system.kind.DRIFT : east * system.kind.DRIFT;
    system.x += (speedEast * dt) / (grid.scale * Math.max(0.25, Math.cos(latitude)));
    system.y -= (pole * system.kind.POLEWARD * dt) / grid.scale;
    system.x = ((system.x % grid.width) + grid.width) % grid.width;
    const overLand = this.surface.land[grid.cellAt(system.x, system.y)] > 0.5;
    system.age += dt * (system.kind === SystemKind.HURRICANE && overLand ? 4 : 1);
  }

  /** Yaşam döngüsü: güçlenir, olgunlaşır, söner. */
  #strength(system) {
    return Math.sin((Math.PI * system.age) / system.life);
  }

  /** Sistemlerin basıncını (Pa) `field`'a ekler. */
  addPressure(field) {
    const { grid } = this;
    const { cols, rows } = grid;
    for (const system of this.list) {
      const amplitude = system.depth * 100 * this.#strength(system);
      const reach = system.radius * REACH;
      const rowSpan = Math.ceil(reach / grid.dy);
      const centerRow = Math.floor(system.y / grid.cellHeight);
      const twoR2 = 2 * system.radius * system.radius;
      for (let j = Math.max(0, centerRow - rowSpan); j <= Math.min(rows - 1, centerRow + rowSpan); j++) {
        const north = (system.y - grid.yOf(j)) * grid.scale;
        const colSpan = Math.min(cols / 2, Math.ceil(reach / grid.dx[j]));
        const centerCol = Math.floor(system.x / grid.cellWidth);
        for (let c = centerCol - colSpan; c <= centerCol + colSpan; c++) {
          const i = ((c % cols) + cols) % cols;
          const east = grid.eastMeters(wrapDelta(grid.xOf(i) - system.x), j);
          const d2 = east * east + north * north;
          if (d2 > reach * reach) continue;
          field[j * cols + i] += amplitude * Math.exp(-d2 / twoR2);
        }
      }
    }
  }

  /** Arayüz için: en yakın sistem ve uzaklığı (m, Dünya ölçeği). */
  nearest(x, y) {
    let best = null;
    let bestDistance = Infinity;
    for (const system of this.list) {
      const east = wrapDelta(x - system.x) * this.grid.scale * Math.cos(latitudeOf(y));
      const distance = Math.hypot(east, (y - system.y) * this.grid.scale);
      if (distance < bestDistance) {
        best = system;
        bestDistance = distance;
      }
    }
    return best ? { system: best, distance: bestDistance } : null;
  }
}
