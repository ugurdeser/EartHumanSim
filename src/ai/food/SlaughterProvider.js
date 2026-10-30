import { DOMESTICATION, HOUR } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Capability, Items } from '../../items/Items.js';
import { Technologies } from '../../tech/Technologies.js';
import { AnimalHandling } from '../husbandry/AnimalHandling.js';
import { FoodProvider } from './FoodProvider.js';

/**
 * Ağıldaki fazla hayvanı kesmek: damızlık ayrılır, en huysuzu kesilir. Böylece
 * uysallık geni nesiller boyu sürüde birikir (bilinçli seçilim).
 */
export class SlaughterProvider extends FoodProvider {
  constructor() {
    super('slaughter');
  }

  /** Kesilebilecek hayvan (yoksa null). */
  static findSurplus(person, world) {
    const pen = person.home.pen;
    if (!pen || !person.isAdult || !person.knowledge.knows(Technologies.SLAUGHTERING) || !person.inventory.hasCapability(Capability.CUT)) return null;
    const tamed = pen.animals.filter((a) => a.alive && a.isTamed && a.isAdult);
    if (pen.animals.length <= DOMESTICATION.BREEDING_STOCK) return null;
    const males = tamed.filter((a) => !a.isFemale).length;
    const candidates = tamed.filter((a) => !a.reproduction.isPregnant && !a.reproduction.isLactating(world.now) && (a.isFemale || males > 1));
    return candidates.sort((a, b) => a.genome.get('tameness') - b.genome.get('tameness'))[0] ?? null;
  }

  static slaughterAction(person, animal) {
    return new SequenceAction(`${animal.displayName} kesmeye gidiyor`, [
      new MoveToAction(`${animal.displayName} yanına gidiyor`, () => (animal.alive ? animal.position : null), { arriveDistance: AnimalHandling.REACH }),
      new PerformAction(`${animal.displayName} kesiyor`, DOMESTICATION.SLAUGHTER_TIME / person.workSpeed('butchery', 'strength'), {
        onTick: (_p, w) => AnimalHandling.hold(animal, w),
        onComplete: (p, w) => {
          if (!AnimalHandling.isWithinReach(p, animal)) return;
          animal.catchUp(w);
          const yields = animal.slaughterYields();
          const kept = DOMESTICATION.BASE_YIELD + p.skills.get('butchery') * (1 - DOMESTICATION.BASE_YIELD); // acemi ziyan eder
          animal.die('kesim');
          for (const { type, amount } of yields) p.inventory.add(type, Math.max(1, Math.round(amount * kept)));
          p.improveSkill('butchery', DOMESTICATION.SLAUGHTER_TIME / HOUR, w);
          const broken = p.inventory.wearTool(Capability.CUT);
          if (broken) w.log.personal([p], `💥 ${broken.name} kırıldı`, LogType.INFO);
          w.log.personal([p], `🍖 Ağıldan bir ${animal.displayName.toLocaleLowerCase('tr')} kesti`, LogType.BUILD);
        },
      }),
    ]);
  }

  plan(person, world) {
    const animal = SlaughterProvider.findSurplus(person, world);
    if (!animal) return null;
    const meat = animal.slaughterYields().find((y) => y.type === Items.MEAT)?.amount ?? 0;
    if (meat === 0) return null;
    const cost = (FoodProvider.travelTime(person, person.position, animal.position) + DOMESTICATION.SLAUGHTER_TIME) / (meat * Items.MEAT.cookedNutrition);
    return { cost, action: SlaughterProvider.slaughterAction(person, animal) };
  }
}
