import { MINUTE } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Capability, Items } from '../../items/Items.js';
import { FoodProvider } from './FoodProvider.js';

const SEARCH_RADIUS = 2000;
const WORK_TIME = 45 * MINUTE;

/** Oltayla göletten balık tutmak. Başarı beceriye ve zekâya bağlı. */
export class FishingProvider extends FoodProvider {
  constructor() {
    super('fishing');
  }

  static successChance(person) {
    return 0.3 + person.skills.get('fishing') * 0.45 + person.traits.intelligence * 0.15;
  }

  plan(person, world) {
    if (!person.inventory.hasCapability(Capability.FISH)) return null;
    const pond = world.findNearestPond(person.position, { withFish: true, maxRadius: SEARCH_RADIUS });
    if (!pond) return null;
    const shore = pond.shorePointFrom(person.position);
    const expected = FishingProvider.successChance(person) * Items.FISH.cookedNutrition;
    const cost = (FoodProvider.travelTime(person, person.position, shore) + WORK_TIME) / expected;
    const action = new SequenceAction('Balık tutmaya gidiyor', [
      new MoveToAction('Göletin kıyısına gidiyor', shore, { arriveDistance: 2 }),
      new PerformAction('Oltayla balık tutuyor', WORK_TIME / person.workSpeed('fishing', 'intelligence'), {
        onComplete: (p, w) => FishingProvider.#tryCatch(p, w, pond),
      }),
    ]);
    return { cost, action };
  }

  static #tryCatch(person, world, pond) {
    person.improveSkill('fishing', 0.02);
    const broken = person.inventory.wearTool(Capability.FISH);
    if (broken) world.log.personal([person], `💥 ${broken.name} kırıldı`, LogType.INFO);
    const [fish] = pond.fish;
    if (!fish || !world.rng.chance(FishingProvider.successChance(person))) return;
    fish.die();
    person.inventory.add(Items.FISH, 1);
  }
}
