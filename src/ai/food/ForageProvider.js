import { HOUR, MINUTE } from '../../config.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { FoodProvider } from './FoodProvider.js';

const SEARCH_RADIUS = 900;
const WORK_TIME = 10 * MINUTE;

/** Çalılardan yemiş, ağaçlardan meyve toplamak. */
export class ForageProvider extends FoodProvider {
  constructor() {
    super('forage');
  }

  plan(person, world) {
    const source = world.findNearestFood(person.position, SEARCH_RADIUS);
    if (!source) return null;
    const portions = Math.min(source.available(world.now), 2 + Math.floor(person.skills.get('gathering') * 3));
    const cost = (FoodProvider.travelTime(person, person.position, source.position) + WORK_TIME) / (portions * source.food.nutrition);
    const action = new SequenceAction(`${source.food.name} toplamaya gidiyor`, [
      new MoveToAction(`${source.food.name} için yola çıktı`, source.position, { arriveDistance: 2 }),
      new PerformAction(`${source.food.name} topluyor`, WORK_TIME / person.workSpeed('gathering', 'agility'), {
        onComplete: (p, w) => {
          const taken = source.take(Math.min(portions, p.inventory.roomFor(source.food)), w.now);
          p.inventory.add(source.food, taken);
          p.improveSkill('gathering', WORK_TIME / HOUR, w);
        },
      }),
    ]);
    return { cost, action };
  }
}
