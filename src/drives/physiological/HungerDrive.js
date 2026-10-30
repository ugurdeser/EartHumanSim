import { COMMUNITY, MINUTE } from '../../config.js';
import { Items } from '../../items/Items.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { DrinkPlanner } from '../../ai/food/DrinkPlanner.js';
import { FoodFromOthers } from '../../ai/food/FoodFromOthers.js';
import { FoodPlanner } from '../../ai/food/FoodPlanner.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const COOK_AT_HOME_RANGE = 500;
const CRITICAL_NEED = 0.8; // açlık ya da susuzluk bundan sonra hayati
const CRITICAL_URGE = 3;
const FED_ENOUGH = 0.8;
const MIN_FREE_WEIGHT = 1;

export class HungerDrive extends Drive {
  static ID = 'hunger';
  static NAME = 'Açlık';
  static CATEGORY = DriveCategory.PHYSIOLOGICAL;
  static DESCRIPTION = 'Yeme veya içme yoluyla beslenme arayışı.';
  static WEIGHT_RANGE = [0.9, 1.2];
  static FOR_DEPENDENTS = true;
  static MAX_RAW = 1.4 + CRITICAL_URGE; // hayati eşikten sonra diğer güdülerin üstüne çıkabilsin

  computeRaw(person) {
    const need = Math.max(1 - person.needs.food, 1 - person.needs.water);
    // Ölüme yaklaşınca soğuk ve yorgunluğun önüne geçer: yanında yiyecekle açlıktan ölünmez
    const danger = Math.max(0, need - CRITICAL_NEED) / (1 - CRITICAL_NEED);
    return Math.pow(need, 1.4) * 1.4 + danger * CRITICAL_URGE;
  }

  createAction(person, world) {
    if (person.isDependent) return this.#eatWhatIsGiven(person);
    const thirsty = person.needs.water <= person.needs.food; // eşitlikte su: susuzluk daha çabuk öldürür
    return thirsty ? DrinkPlanner.drink(person, world) : this.#eat(person, world);
  }

  /** Küçük çocuk getirileni ya da evdeki yiyeceği yer; suyunu da yakınları verir. */
  #eatWhatIsGiven(person) {
    if (person.needs.water < COMMUNITY.THIRSTY_WATER && person.inventory.has(Items.WATER)) return DrinkPlanner.sip();
    if (person.needs.food > FED_ENOUGH) return null;
    if (person.inventory.foodCount > 0) return this.#eatCarried(person);
    if (person.home.storage.foodCount === 0) return null;
    return new SequenceAction('Evdeki yiyeceğe gidiyor', [
      ActionFactory.fetchFromHome(person, 'Evdeki yiyeceği alıyor', (t) => t.isFood, 3),
      this.#eatCarried(person),
    ]);
  }

  #eat(person, world) {
    if (person.inventory.foodCount > 0) return this.#eatCarried(person);
    if (person.inventory.freeWeight < MIN_FREE_WEIGHT) return ActionFactory.makeRoom(person); // sırtı odunla doluyken yiyecek alınamaz
    const acquire = FoodPlanner.bestAcquisition(person, world) ?? FoodFromOthers.askCommunity(person) ?? FoodFromOthers.tryTheft(person, world);
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
}
