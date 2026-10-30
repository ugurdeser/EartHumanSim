import { CONFLICT, DAY } from '../../config.js';
import { Season } from '../../core/Season.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { FoodPlanner } from '../../ai/food/FoodPlanner.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const COMFORTABLE_FOOD = 12;
const WINTER_FOOD = 60; // sonbaharda kış için istenen stok
const WINTER_FUEL = 6 * DAY; // kış için depoda istenen yakıt (yanma süresi)
const PREPARE_DAYS = 60; // kışa bu kadar gün kala hazırlık başlar
const THEFT_RANGE = 800;
const LOOT_PIECES = 3;

/** Yiyecek ve (soğuk mevsimlerde) yakacak biriktirmek. */
export class HoardingDrive extends Drive {
  static ID = 'hoarding';
  static NAME = 'İstifçilik';
  static CATEGORY = DriveCategory.ENVIRONMENTAL;
  static DESCRIPTION = 'Her durum için gerekli kaynaklara her zaman sahip olmayı amaçlamak.';

  /** 10 yaşından sonra çocuklar da evin yiyecek ve yakacağına yardım eder. */
  isApplicable(person) {
    return !person.isDependent;
  }

  /** Kış hazırlığının aciliyeti (0..1): kış yaklaştıkça artar, kış içinde tamdır. */
  #winterUrgency(world) {
    return Math.max(0, 1 - world.calendar.daysUntil(Season.WINTER) / PREPARE_DAYS);
  }

  #needsFuel(person, world) {
    return this.#winterUrgency(world) > 0 && person.home.storage.fuelSeconds < WINTER_FUEL;
  }

  computeRaw(person, world, dt) {
    this.accumulate(dt, 8);
    const urgency = this.#winterUrgency(world);
    const preparing = urgency > 0 && world.calendar.season !== Season.WINTER;
    const target = preparing ? WINTER_FOOD : COMFORTABLE_FOOD;
    const foodStock = Math.min(1, (person.home.storage.foodCount + person.inventory.foodCount) / target);
    const fuelWorry = this.#needsFuel(person, world) ? 0.4 : 0;
    // kış yaklaşınca hazırlık zamanla biriken baskıyı beklemez
    const drive = Math.max(this.pressure, urgency);
    return drive * (1 - foodStock) + fuelWorry * drive;
  }

  createAction(person, world) {
    const loot = this.#temptation(person, world);
    if (loot) return loot;
    if (this.#needsFuel(person, world)) {
      const gather = ActionFactory.gatherFuel(person, world);
      if (gather) return this.#stockpile(person, gather, 'Kış için yakacak topluyor', (t) => t.isFuel);
    }
    const gather = FoodPlanner.bestAcquisition(person, world, { excludeHome: true });
    return gather ? this.#stockpile(person, gather, 'İstif yapıyor', (t) => t.isFood) : null;
  }

  /** Açgözlülük: adalet duygusu zayıf olan, karnı tok olsa da komşu deposuna göz dikebilir. */
  #temptation(person, world) {
    if (person.isChild || person.drives.get('justice').weight >= CONFLICT.GREED_SCRUPLES) return null;
    if (!world.rng.chance(CONFLICT.GREED_CHANCE * world.social.conflicts.intensity)) return null;
    const victim = world.findHomeWithFood(person.position, THEFT_RANGE, person.home);
    if (!victim) return null;
    return new SequenceAction('Komşu deposuna göz dikti', [
      new MoveToAction('Gizlice depoya gidiyor', victim.position, { arriveDistance: 2 }),
      new CallbackAction('Çalıyor', (p, w) => {
        const stolen = victim.storage.transferTo(p.inventory, () => true, LOOT_PIECES);
        if (stolen === 0) return false;
        w.social.reportTheft(p, victim, stolen);
        return true;
      }),
    ]);
  }

  #stockpile(person, gather, label, filter) {
    return new SequenceAction(label, [gather, ActionFactory.depositAtHome(person, 'Depoya taşıyor', filter, () => this.relieve(0.6))]);
  }
}
