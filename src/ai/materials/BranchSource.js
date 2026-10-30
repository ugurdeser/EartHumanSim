import { MINUTE } from '../../config.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Items } from '../../items/Items.js';
import { MaterialSource } from './MaterialSource.js';

const SEARCH_RADIUS = 800;

/** Ağaç diplerinden kuru dal toplamak: alet gerekmez. */
export class BranchSource extends MaterialSource {
  constructor() {
    super(Items.BRANCH);
  }

  canGather(person, world) {
    return Boolean(world.findNearestTree(person.position, SEARCH_RADIUS));
  }

  createAction(person, world) {
    const tree = world.findNearestTree(person.position, SEARCH_RADIUS);
    if (!tree) return null;
    return new SequenceAction('Dal toplamaya gidiyor', [
      new MoveToAction('Ağaçlığa gidiyor', tree.position, { arriveDistance: tree.radius + 1 }),
      new PerformAction('Dal topluyor', 20 * MINUTE / person.workSpeed('gathering', 'agility'), {
        onComplete: (p) => {
          p.inventory.add(Items.BRANCH, 2 + Math.round(p.skills.get('gathering') * 2));
          p.improveSkill('gathering', 0.005);
        },
      }),
    ]);
  }
}
