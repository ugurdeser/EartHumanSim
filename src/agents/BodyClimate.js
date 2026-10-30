import { AGING, CLOTHING, DAY, FIRE, WEATHER } from '../config.js';
import { LogType } from '../core/EventLog.js';

/** Bedenin çevreyle ilişkisi: hissedilen sıcaklık, ıslanma, giysilerin eskimesi. */
export class BodyClimate {
  constructor(person) {
    this.person = person;
  }

  /** Hava (açıktaysa rüzgârla) + ateş + barınak yalıtımı + giysi − ıslaklık. */
  feltTemperature(world) {
    const air = this.person.isSheltered ? world.weather.temperature : world.weather.exposedTemperature;
    let temperature = air + this.person.inventory.bestInsulation - this.person.needs.wetness * WEATHER.WET_CHILL;
    if (world.isNearLitFire(this.person.position)) temperature += FIRE.HEAT;
    if (this.person.isAtHome()) temperature += this.person.home.insulation;
    if (this.person.isCarried) temperature += AGING.CARRIED_WARMTH;
    return temperature;
  }

  updateWetness(world, dt) {
    const precipitation = this.person.isSheltered ? 0 : world.weather.precipitation;
    const drying = world.isNearLitFire(this.person.position) ? 4 : precipitation > 0 ? 0 : 1;
    this.person.needs.updateWetness(dt, { precipitation, drying });
  }

  /** Giysiler giyildikçe eskir, ıslakken daha hızlı. */
  wearClothes(world, dt) {
    this.person.clothesWear += dt;
    if (this.person.clothesWear < CLOTHING.CHECK_INTERVAL) return;
    const rate = this.person.needs.wetness > CLOTHING.WET_THRESHOLD ? CLOTHING.WET_WEAR : 1;
    const torn = this.person.inventory.wearClothes((this.person.clothesWear / DAY) * rate);
    this.person.clothesWear = 0;
    for (const type of torn) world.log.personal([this.person], `🧵 ${type.name} eskiyip parçalandı`, LogType.INFO);
  }
}
