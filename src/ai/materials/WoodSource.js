import { HOUR } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Capability, Items } from '../../items/Items.js';
import { MaterialSource } from './MaterialSource.js';

const SEARCH_RADIUS = 800;

/** Baltayla ağaç kesip odun elde etmek. */
export class WoodSource extends MaterialSource {
  constructor() {
    super(Items.WOOD);
  }

  canGather(person, world) {
    return person.inventory.hasCapability(Capability.CHOP) && Boolean(world.findNearestTree(person.position, SEARCH_RADIUS));
  }

  createAction(person, world) {
    if (!person.inventory.hasCapability(Capability.CHOP)) return null;
    const tree = world.findNearestTree(person.position, SEARCH_RADIUS);
    if (!tree) return null;
    return new SequenceAction('Odun kesmeye gidiyor', [
      new MoveToAction('Ağaca gidiyor', tree.position, { arriveDistance: tree.radius + 1 }),
      new PerformAction('Baltayla ağaç kesiyor', 1.5 * HOUR / person.workSpeed('woodcutting'), {
        onComplete: (p, w) => {
          if (tree.felled) return;
          p.inventory.add(Items.WOOD, tree.fell());
          w.markChanged(tree.position);
          p.improveSkill('woodcutting', 1.5, w);
          const broken = p.inventory.wearTool(Capability.CHOP);
          if (broken) w.log.personal([p], `💥 ${broken.name} kırıldı`, LogType.INFO);
        },
      }),
    ]);
  }
}
