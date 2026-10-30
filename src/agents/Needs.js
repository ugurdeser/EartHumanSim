import { NEEDS, WEATHER } from '../config.js';
import { clamp01 } from '../core/MathUtils.js';

/** Bedensel ihtiyaçlar (hepsi 0..1, 1 = tamamen karşılanmış). */
export class Needs {
  constructor({ food = 1, water = 1, energy = 1, warmth = 1, health = 1, wetness = 0 } = {}) {
    this.food = food;
    this.water = water;
    this.energy = energy;
    this.warmth = warmth;
    this.health = health;
    this.wetness = wetness; // 0 = kuru, 1 = sırılsıklam (iyilik değil, durum)
  }

  /**
   * @param {number} dt
   * @param {{feltTemperature:number, endurance:number}} env hissedilen sıcaklık ve dayanıklılık
   * @returns {string|null} sağlık bu adımda bir sebeple düştüyse sebebi
   */
  update(dt, { feltTemperature, endurance }) {
    const fatigueRate = 1.2 - endurance * 0.4;
    this.food = clamp01(this.food - dt / NEEDS.FOOD_DURATION);
    this.water = clamp01(this.water - dt / NEEDS.WATER_DURATION);
    this.energy = clamp01(this.energy - (dt * fatigueRate) / NEEDS.ENERGY_DURATION);
    this.#updateWarmth(dt, feltTemperature, endurance);

    if (this.food <= 0 || this.water <= 0) {
      this.health = clamp01(this.health - dt / NEEDS.STARVATION_TIME);
      if (this.water > 0) return 'açlık';
      return this.food > 0 ? 'susuzluk' : 'açlık ve susuzluk';
    }
    if (this.warmth <= 0) {
      this.health = clamp01(this.health - dt / NEEDS.FREEZING_TIME);
      return 'soğuk';
    }
    if (this.food > 0.3 && this.water > 0.3 && this.warmth > 0.3) {
      this.health = clamp01(this.health + dt / NEEDS.HEAL_TIME);
    }
    return null;
  }

  #updateWarmth(dt, feltTemperature, endurance) {
    const cold = NEEDS.COMFORT_TEMPERATURE - feltTemperature;
    if (cold > 0) {
      const severity = (cold / NEEDS.COMFORT_TEMPERATURE) * (1.3 - endurance * 0.6);
      this.warmth = clamp01(this.warmth - (dt * severity) / NEEDS.WARMTH_LOSS_TIME);
    } else {
      this.warmth = clamp01(this.warmth + dt / NEEDS.WARMTH_GAIN_TIME);
    }
  }

  /** Açıkta yağışta ıslanır, kuruyken ya da ateş başında kurur. */
  updateWetness(dt, { precipitation, drying }) {
    const gain = (dt * precipitation) / WEATHER.WET_TIME;
    const loss = (dt * drying) / WEATHER.DRY_TIME;
    this.wetness = clamp01(this.wetness + gain - loss);
  }

  eat(amount) {
    this.food = clamp01(this.food + amount);
  }

  drink() {
    this.water = 1;
  }

  rest(dt, quality) {
    this.energy = clamp01(this.energy + (dt * quality) / NEEDS.REST_TIME);
  }

  damage(amount) {
    this.health = clamp01(this.health - amount);
  }
}
