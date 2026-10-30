import { MINUTE } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { FoodPlanner } from '../../ai/food/FoodPlanner.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const THEFT_RANGE = 800;
const COOK_AT_HOME_RANGE = 500;
const DIRTY_WATER_DAMAGE = 0.2;

export class HungerDrive extends Drive {
  static ID = 'hunger';
  static NAME = 'Açlık';
  static CATEGORY = DriveCategory.PHYSIOLOGICAL;
  static DESCRIPTION = 'Yeme veya içme yoluyla beslenme arayışı.';
  static WEIGHT_RANGE = [0.9, 1.2];

  computeRaw(person) {
    const need = Math.max(1 - person.needs.food, 1 - person.needs.water);
    return Math.pow(need, 1.4) * 1.4;
  }

  createAction(person, world) {
    const thirsty = 1 - person.needs.water > 1 - person.needs.food;
    return thirsty ? this.#drink(person, world) : this.#eat(person, world);
  }

  #drink(person, world) {
    const allowDirty = !person.drives.get('disgust').avoidsDirtyWater && !person.learnedDirtyWater;
    const pond = world.findNearestPond(person.position, { allowContaminated: allowDirty });
    if (!pond) return null;
    return new SequenceAction('Su içmeye gidiyor', [
      new MoveToAction('Gölete gidiyor', pond.shorePointFrom(person.position), { arriveDistance: 2 }),
      new PerformAction('Su içiyor', 5 * MINUTE, {
        onComplete: (p, w) => {
          p.needs.drink();
          if (!pond.contaminated) return;
          p.learnedDirtyWater = true;
          w.log.add(`🤢 ${p.name} kirli su içip hastalandı`, LogType.DANGER, [p]);
          p.takeDamage(DIRTY_WATER_DAMAGE, w, 'kirli su');
        },
      }),
    ]);
  }

  #eat(person, world) {
    if (person.inventory.foodCount > 0) return this.#eatCarried(person);
    const acquire = FoodPlanner.bestAcquisition(person, world) ?? this.#tryTheft(person, world);
    if (!acquire) return ActionFactory.searchFar(person, world, 'Uzaklarda yiyecek arıyor');
    return new SequenceAction(acquire.label, [acquire, this.#eatCarried(person)]);
  }

  /** Üzerindekini yer; çiğ et/balık varsa ve ocak yakındaysa önce eve gidip pişirir. */
  #eatCarried(person) {
    const hasRaw = person.inventory.entries().some(({ type }) => type.isFood && type.cookable);
    const canCook = person.home.fire.isLit && person.position.distanceTo(person.home.position) < COOK_AT_HOME_RANGE;
    const eat = new PerformAction(canCook && hasRaw ? 'Ateşte pişirip yiyor' : 'Yemek yiyor', 10 * MINUTE, {
      onComplete: (p, w) => p.eatFrom(p.inventory, w),
    });
    return canCook && hasRaw ? new SequenceAction('Pişirmeye gidiyor', [ActionFactory.goHome(person, 'Ocağa gidiyor'), eat]) : eat;
  }

  /** Adalet duygusu zayıf ve çaresiz olan, başkasının deposundan çalabilir. */
  #tryTheft(person, world) {
    const scruples = person.drives.get('justice').weight;
    if (scruples >= 0.8 || person.needs.food > 0.35) return null;
    const victim = world.findHomeWithFood(person.position, THEFT_RANGE, person.home);
    if (!victim) return null;
    return new SequenceAction('Gizlice depoya gidiyor', [
      new MoveToAction('Gizlice depoya gidiyor', victim.position, { arriveDistance: 2 }),
      new CallbackAction('Çalıyor', (p, w) => {
        const stolen = victim.storage.transferTo(p.inventory, (t) => t.isFood, 3);
        if (stolen === 0) return false;
        w.social.reportTheft(p, victim, stolen);
        return true;
      }),
    ]);
  }
}
