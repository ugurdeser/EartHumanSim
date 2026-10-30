import { clamp01 } from '../../core/MathUtils.js';

const COLD_SCALE = 10; // her 10 °C eksik soğukta zarar bir kat artar

/**
 * Hayvanların bedensel ihtiyaçları (0..1). Profil: { foodDuration, waterDuration,
 * starvationTime, freezingTime, healTime, comfortTemperature }.
 */
export class AnimalNeeds {
  constructor(profile) {
    this.profile = profile;
    this.food = 1;
    this.water = 1;
    this.health = 1;
  }

  /** @returns {string|null} sağlık bu adımda düştüyse sebebi */
  update(dt, { feltTemperature, hardiness }) {
    const p = this.profile;
    const frailty = 1.3 - hardiness * 0.6;
    this.food = clamp01(this.food - dt / p.foodDuration);
    this.water = clamp01(this.water - dt / p.waterDuration);

    if (this.food <= 0 || this.water <= 0) {
      this.health = clamp01(this.health - (dt * frailty) / p.starvationTime);
      return 'açlık / susuzluk';
    }
    const cold = p.comfortTemperature - feltTemperature;
    if (cold > 0) {
      this.health = clamp01(this.health - (dt * frailty * (cold / COLD_SCALE)) / p.freezingTime);
      return 'soğuk';
    }
    if (this.food > 0.3 && this.water > 0.3) this.health = clamp01(this.health + dt / p.healTime);
    return null;
  }

  eat(amount) {
    this.food = clamp01(this.food + amount);
  }

  drink() {
    this.water = 1;
  }
}
