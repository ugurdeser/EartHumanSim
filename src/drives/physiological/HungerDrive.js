import { COMMUNITY, MINUTE } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { Capability, Items } from '../../items/Items.js';
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
const FED_ENOUGH = 0.8;
const JAR_SIPS = 4; // dolu testinin kaç içimlik suyu var

export class HungerDrive extends Drive {
  static ID = 'hunger';
  static NAME = 'Açlık';
  static CATEGORY = DriveCategory.PHYSIOLOGICAL;
  static DESCRIPTION = 'Yeme veya içme yoluyla beslenme arayışı.';
  static WEIGHT_RANGE = [0.9, 1.2];
  static FOR_DEPENDENTS = true;

  computeRaw(person) {
    const need = Math.max(1 - person.needs.food, 1 - person.needs.water);
    return Math.pow(need, 1.4) * 1.4;
  }

  createAction(person, world) {
    if (person.isDependent) return this.#eatWhatIsGiven(person);
    const thirsty = 1 - person.needs.water > 1 - person.needs.food;
    return thirsty ? this.#drink(person, world) : this.#eat(person, world);
  }

  /** Küçük çocuk getirileni ya da evdeki yiyeceği yer; suyunu da yakınları verir. */
  #eatWhatIsGiven(person) {
    if (person.needs.water < COMMUNITY.THIRSTY_WATER && person.inventory.has(Items.WATER)) return this.#sip();
    if (person.needs.food > FED_ENOUGH) return null;
    if (person.inventory.foodCount > 0) return this.#eatCarried(person);
    if (person.home.storage.foodCount === 0) return null;
    return new SequenceAction('Evdeki yiyeceğe gidiyor', [
      ActionFactory.fetchFromHome(person, 'Evdeki yiyeceği alıyor', (t) => t.isFood, 3),
      this.#eatCarried(person),
    ]);
  }

  #drink(person, world) {
    if (person.inventory.has(Items.WATER)) return this.#sip();
    const allowDirty = !person.drives.get('disgust').avoidsDirtyWater && !person.learnedDirtyWater;
    const pond = world.findNearestPond(person.position, { allowContaminated: allowDirty });
    if (!pond) return null;
    return new SequenceAction('Su içmeye gidiyor', [
      new MoveToAction(`${pond.destination} gidiyor`, pond.shorePointFrom(person.position), { arriveDistance: 2 }),
      new PerformAction('Su içiyor', 5 * MINUTE, {
        onComplete: (p, w) => {
          p.needs.drink();
          if (!pond.contaminated) return this.#fillJar(p, w);
          p.learnedDirtyWater = true;
          w.log.add(`🤢 ${p.name} kirli su içip hastalandı`, LogType.DANGER, [p]);
          p.takeDamage(DIRTY_WATER_DAMAGE, w, 'kirli su');
        },
      }),
    ]);
  }

  #sip() {
    return new PerformAction('Testisinden su içiyor', 2 * MINUTE, {
      onComplete: (p) => {
        if (p.inventory.remove(Items.WATER, 1) > 0) p.needs.drink();
      },
    });
  }

  /** Testisi olan su başından ayrılmadan onu doldurur; böylece suya daha seyrek gider. */
  #fillJar(person, world) {
    if (!person.inventory.hasCapability(Capability.CARRY_WATER)) return;
    if (person.inventory.add(Items.WATER, JAR_SIPS - person.inventory.count(Items.WATER)) === 0) return;
    const broken = person.inventory.wearTool(Capability.CARRY_WATER);
    if (broken) world.log.personal([person], `💥 ${broken.name} kırıldı`, LogType.INFO);
  }

  #eat(person, world) {
    if (person.inventory.foodCount > 0) return this.#eatCarried(person);
    const acquire = FoodPlanner.bestAcquisition(person, world) ?? this.#askCommunity(person) ?? this.#tryTheft(person, world);
    if (!acquire) return ActionFactory.searchFar(person, world, 'Uzaklarda yiyecek arıyor');
    return new SequenceAction(acquire.label, [acquire, this.#eatCarried(person)]);
  }

  /** Üzerindekini yer; çiğ et/balık varsa ve ocak yakındaysa önce eve gidip pişirir. */
  #eatCarried(person) {
    const hasRaw = person.inventory.entries().some(({ type }) => type.isFood && type.cookable);
    const canCook = person.canCook && person.home.fire.isLit && person.position.distanceTo(person.home.position) < COOK_AT_HOME_RANGE;
    const eat = new PerformAction(canCook && hasRaw ? 'Ateşte pişirip yiyor' : 'Yemek yiyor', 10 * MINUTE, {
      onComplete: (p, w) => p.eatFrom(p.inventory, w),
    });
    return canCook && hasRaw ? new SequenceAction('Pişirmeye gidiyor', [ActionFactory.goHome(person, 'Ocağa gidiyor'), eat]) : eat;
  }

  /** Topluluk üyesi aç kalanı geri çevirmez: durumu iyi olan evden yiyecek ister. */
  #askCommunity(person) {
    if (person.needs.food > COMMUNITY.HUNGRY_FOOD) return null;
    const homes = person.group?.adults.map((m) => m.home) ?? [];
    const helper = homes.find((h) => h !== person.home && h.storage.foodCount >= COMMUNITY.HELP_MIN_STOCK);
    if (!helper) return null;
    return new SequenceAction('Topluluktan yiyecek istiyor', [
      new MoveToAction(`${helper.label} yiyecek istemeye gidiyor`, helper.position, { arriveDistance: 2 }),
      new CallbackAction('Yiyecek alıyor', (p, w) => {
        const given = helper.storage.transferTo(p.inventory, (t) => t.isFood, COMMUNITY.HELP_PORTIONS);
        if (given === 0) return false;
        for (const owner of helper.owners) p.relationTo(owner).changeAffinity(0.1);
        w.log.personal([p, ...helper.owners], `🤲 ${p.name}, ${helper.label} evinden ${given} yiyecek aldı`, LogType.SOCIAL);
        return true;
      }),
    ]);
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
