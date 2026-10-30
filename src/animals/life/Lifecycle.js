import { AGING, DAY } from '../../config.js';

/** Hayvanın yaşı ve yaşlılıktan ölüm riski. Profil: { adultAge, oldAge, oldAgeRisk } (yıl). */
export class Lifecycle {
  constructor(ageYears, profile) {
    this.ageYears = ageYears;
    this.profile = profile;
  }

  get isAdult() {
    return this.ageYears >= this.profile.adultAge;
  }

  /** Yaşlandırır; yaşlılıktan ölürse true döner. */
  update(dt, rng) {
    const years = (dt / DAY) * AGING.YEARS_PER_DAY;
    this.ageYears += years;
    return this.ageYears >= this.profile.oldAge && rng.chance(this.profile.oldAgeRisk * years);
  }
}
