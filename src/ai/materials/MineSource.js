import { HOUR } from '../../config.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { MaterialSource } from './MaterialSource.js';

const SEARCH_RADIUS = 4000;

/** Bir madenden (taş ocağı, çakmaktaşı yatağı) malzeme çıkarmak. */
export class MineSource extends MaterialSource {
  constructor(type, { yieldScale = 1 } = {}) {
    super(type);
    this.yieldScale = yieldScale;
  }

  canGather(person, world) {
    return Boolean(world.findNearestMine(person.position, this.type, SEARCH_RADIUS));
  }

  createAction(person, world) {
    const mine = world.findNearestMine(person.position, this.type, SEARCH_RADIUS);
    if (!mine) return null;
    return new SequenceAction(`${mine.name} yoluna çıktı`, [
      new MoveToAction(`${mine.name} yolunda`, mine.position, { arriveDistance: mine.radius }),
      new PerformAction(`${this.type.name} çıkarıyor`, 1 * HOUR / person.workSpeed('mining'), {
        onComplete: (p, w) => {
          const amount = Math.max(1, Math.round((1 + p.traits.strength * 2 + p.skills.get('mining') * 2) * this.yieldScale));
          p.inventory.add(this.type, Math.min(amount, p.inventory.roomFor(this.type)));
          p.improveSkill('mining', 1, w);
        },
      }),
    ]);
  }
}
