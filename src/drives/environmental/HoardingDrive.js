import { HOUR } from '../../config.js';
import { Season } from '../../core/Season.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { FoodPlanner } from '../../ai/food/FoodPlanner.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const COMFORTABLE_FOOD = 12;
const WINTER_FOOD = 30; // sonbaharda kış için istenen stok
const WINTER_FUEL = 48 * HOUR; // kış için depoda istenen yakıt (yanma süresi)

/** Yiyecek ve (soğuk mevsimlerde) yakacak biriktirmek. */
export class HoardingDrive extends Drive {
  static ID = 'hoarding';
  static NAME = 'İstifçilik';
  static CATEGORY = DriveCategory.ENVIRONMENTAL;
  static DESCRIPTION = 'Her durum için gerekli kaynaklara her zaman sahip olmayı amaçlamak.';

  isApplicable(person) {
    return person.isAdult;
  }

  #needsFuel(person, world) {
    const season = world.calendar.season;
    const coldAhead = season === Season.AUTUMN || season === Season.WINTER;
    return coldAhead && person.home.storage.fuelSeconds < WINTER_FUEL;
  }

  computeRaw(person, world, dt) {
    this.accumulate(dt, 8);
    const target = world.calendar.season === Season.AUTUMN ? WINTER_FOOD : COMFORTABLE_FOOD;
    const foodStock = Math.min(1, (person.home.storage.foodCount + person.inventory.foodCount) / target);
    const fuelWorry = this.#needsFuel(person, world) ? 0.4 : 0;
    return this.pressure * (1 - foodStock) + fuelWorry * this.pressure;
  }

  createAction(person, world) {
    if (this.#needsFuel(person, world)) {
      const gather = ActionFactory.gatherFuel(person, world);
      if (gather) return this.#stockpile(person, gather, 'Kış için yakacak topluyor', (t) => t.isFuel);
    }
    const gather = FoodPlanner.bestAcquisition(person, world, { excludeHome: true });
    return gather ? this.#stockpile(person, gather, 'İstif yapıyor', (t) => t.isFood) : null;
  }

  #stockpile(person, gather, label, filter) {
    return new SequenceAction(label, [gather, ActionFactory.depositAtHome(person, 'Depoya taşıyor', filter, () => this.relieve(0.6))]);
  }
}
