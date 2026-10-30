import { MINUTE } from '../../config.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Combat } from '../../agents/Combat.js';
import { Capability, Items } from '../../items/Items.js';
import { FoodProvider } from './FoodProvider.js';

const SEARCH_RADIUS = 1200;
const CHASE_TIMEOUT = 10 * MINUTE;
const STRIKE_DISTANCE = 4;
const MIN_HERD_TO_HUNT = 3; // küçük sürülere dokunulmaz ki yenilenebilsinler

/** Mızrakla koyun avlamak. */
export class HuntingProvider extends FoodProvider {
  constructor() {
    super('hunting');
  }

  plan(person, world) {
    if (!person.isAdult || !person.inventory.hasCapability(Capability.HUNT)) return null;
    const found = world.nearestAnimal(person.position, SEARCH_RADIUS, (a) => a.isHuntable && (a.herd?.size ?? 0) >= MIN_HERD_TO_HUNT);
    if (!found) return null;
    const prey = found.animal;
    const expected = prey.meat.amount * Items.MEAT.cookedNutrition * 0.5;
    const cost = (found.distance / person.walkSpeed + CHASE_TIMEOUT) / expected;
    const action = new SequenceAction(`${prey.species.name} avına çıktı`, [
      new MoveToAction('Avına sessizce yaklaşıyor', () => (prey.alive ? prey.position : null), { arriveDistance: 30 }),
      new MoveToAction(`${prey.species.name} kovalıyor`, () => (prey.alive ? prey.position : null), {
        arriveDistance: STRIKE_DISTANCE,
        run: true,
        timeout: CHASE_TIMEOUT,
      }),
      new CallbackAction('Mızrağını savuruyor', (p, w) => Combat.hunt(p, prey, w)),
    ]);
    return { cost, action };
  }
}
