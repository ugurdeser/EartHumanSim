import { PLANTS } from '../config.js';
import { Calendar } from '../core/Calendar.js';
import { SEASON_ORDER } from '../core/Season.js';
import { PLANT_LAYERS } from './PlantSpecies.js';
import { Seeding } from './Seeding.js';

/**
 * Bir parçanın bitki topluluğu: büyüme, yaşlanma, ölüm ve tohumla çoğalma.
 * Parça ilk işlendiğinde mevcut durum "denge" kabul edilir; taşıma kapasitesi
 * ilk bitki sayısından hesaplanır (kesilen orman zamanla geri gelir, sonsuz da çoğalmaz).
 */
export class PlantEcology {
  constructor(chunk, now) {
    this.updatedAt = now;
    this.capacity = {};
    for (const layer of PLANT_LAYERS) {
      this.capacity[layer] = Math.ceil(chunk[layer].length * PLANTS.CAPACITY_HEADROOM) + PLANTS.MIN_CAPACITY;
    }
    this.grassBaseline = PlantEcology.#forage(chunk);
    this.grassCover = 1; // otun ilk duruma oranı (otlayan hayvanlar için)
  }

  update(chunk, world) {
    const now = world.now;
    const growthYears = Calendar.growthYearsBetween(this.updatedAt, now) * world.weather.growthFactor;
    const years = (now - this.updatedAt) / Calendar.yearLength;
    this.updatedAt = now;
    if (years <= 0) return;

    const season = world.calendar.season;
    const seedYears = Math.min(years, PLANTS.MAX_CATCH_UP);
    let changed = false;
    for (const layer of PLANT_LAYERS) {
      changed = this.#live(chunk, layer, growthYears, years, world.rng) || changed;
      changed = this.#seed(chunk, layer, season, seedYears, world) || changed;
    }
    this.grassCover = this.grassBaseline > 1 ? Math.min(1.5, PlantEcology.#forage(chunk) / this.grassBaseline) : 1;
    if (changed) chunk.markChanged();
  }

  #live(chunk, layer, growthYears, years, rng) {
    let changed = false;
    for (const plant of chunk[layer]) {
      if (plant.dead) continue;
      changed = plant.grow(growthYears, years) || changed;
      if (rng.chance(Math.min(1, plant.mortality * years))) plant.die();
    }
    const living = chunk[layer].filter((p) => p.alive);
    if (living.length === chunk[layer].length) return changed;
    chunk[layer] = living;
    return true;
  }

  #seed(chunk, layer, season, seedYears, world) {
    let sprouted = false;
    const parents = chunk[layer].filter((p) => p.isMature && p.species.seedSeasons.includes(season));
    for (const plant of parents) {
      // yıllık tohum, tohum mevsimlerine paylaştırılır
      const expected = (plant.seedsPerYear * seedYears * SEASON_ORDER.length) / plant.species.seedSeasons.length;
      const count = Math.floor(expected) + (world.rng.chance(expected % 1) ? 1 : 0);
      for (let i = 0; i < count; i++) {
        if (Seeding.scatter(plant, chunk, world)) sprouted = true;
      }
    }
    return sprouted;
  }

  static #forage(chunk) {
    let sum = 0;
    for (const grass of chunk.grass) if (grass.alive) sum += grass.forage;
    return sum;
  }
}
