import { AGING, DAY } from '../config.js';

/** Yaşlanma, doğal ölüm ve hamileliğin ilerlemesi. */
export class LifeCourse {
  constructor(person) {
    this.person = person;
  }

  age(world, dt) {
    const wasChild = this.person.isChild;
    const years = (dt / DAY) * AGING.YEARS_PER_DAY;
    this.person.ageYears += years;
    this.person.postpartumYears = Math.max(0, this.person.postpartumYears - years);
    if (wasChild && this.person.isAdult) world.comeOfAge(this.person);
    if (this.person.rng.chance(this.#oldAgeRisk() * years)) world.killPerson(this.person, 'yaşlılık');
  }

  /** Yıllık doğal ölüm olasılığı; OLD_AGE'den sonra üstel artar. */
  #oldAgeRisk() {
    if (this.person.ageYears < AGING.OLD_AGE) return 0;
    return AGING.OLD_AGE_BASE_RISK * Math.exp((this.person.ageYears - AGING.OLD_AGE) / AGING.OLD_AGE_RISK_GROWTH);
  }

  updatePregnancy(world) {
    if (!this.person.pregnancy) return;
    if (world.now - this.person.pregnancy.start < this.person.constructor.yearsToSeconds(AGING.PREGNANCY_YEARS)) return;
    const { father } = this.person.pregnancy;
    this.person.pregnancy = null;
    this.person.postpartumYears = AGING.POSTPARTUM_YEARS;
    world.birth(this.person, father);
  }
}
