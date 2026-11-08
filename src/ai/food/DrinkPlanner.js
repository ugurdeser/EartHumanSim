import { MINUTE } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { Capability, Items } from '../../items/Items.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';

const JAR_SIPS = 4; // dolu testinin kaç içimlik suyu var

/** Su içmek: testiden ya da göletten. */
export class DrinkPlanner {
  static drink(person, world) {
    if (person.inventory.has(Items.WATER)) return DrinkPlanner.sip();
    const pond = world.findNearestPond(person.position);
    if (!pond) return null;
    return new SequenceAction('Su içmeye gidiyor', [
      new MoveToAction(`${pond.destination} gidiyor`, pond.shorePointFrom(person.position), { arriveDistance: 2 }),
      new PerformAction('Su içiyor', 5 * MINUTE, {
        onComplete: (p, w) => {
          p.needs.drink();
          DrinkPlanner.fillJar(p, w);
        },
      }),
    ]);
  }

  static sip() {
    return new PerformAction('Testisinden su içiyor', 2 * MINUTE, {
      onComplete: (p) => {
        if (p.inventory.remove(Items.WATER, 1) > 0) p.needs.drink();
      },
    });
  }

  /** Testisi olan su başından ayrılmadan onu doldurur; böylece suya daha seyrek gider. */
  static fillJar(person, world) {
    if (!person.inventory.hasCapability(Capability.CARRY_WATER)) return;
    if (person.inventory.add(Items.WATER, JAR_SIPS - person.inventory.count(Items.WATER)) === 0) return;
    const broken = person.inventory.wearTool(Capability.CARRY_WATER);
    if (broken) world.log.personal([person], `💥 ${broken.name} kırıldı`, LogType.INFO);
  }
}
