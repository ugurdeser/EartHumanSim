import { HOUR, PEN } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Technologies } from '../../tech/Technologies.js';
import { Pen, PEN_MATERIALS } from '../../world/Pen.js';
import { ActionFactory } from '../ActionFactory.js';
import { MaterialSources } from '../materials/MaterialSources.js';
import { Project } from '../projects/Project.js';

/** Yuvanın yanına ağıl yapmak: malzeme depoya taşınır, sonra çitler çekilir. */
export class PenProject extends Project {
  constructor() {
    super('Ağıl yapmak');
  }

  priority(person, world) {
    const home = person.home;
    if (!person.isAdult || home.pen || !person.knowledge.knows(Technologies.ANIMAL_PEN)) return 0;
    const missing = PEN_MATERIALS.find(([type, n]) => person.inventory.count(type) + home.storage.count(type) < n);
    if (missing && !MaterialSources.canGather(person, world, missing[0])) return 0;
    return 0.6;
  }

  createAction(person, world, onWorkDone) {
    const home = person.home;
    for (const [type, amount] of PEN_MATERIALS) {
      const stored = home.storage.count(type);
      if (stored >= amount) continue;
      if (person.inventory.count(type) > 0) return ActionFactory.depositAtHome(person, `${type.name} taşıyor`, (t) => t === type);
      return ActionFactory.obtainMaterial(person, world, type, Math.min(amount - stored, person.inventory.roomFor(type)));
    }
    return new SequenceAction('Ağıl yapıyor', [
      ActionFactory.goHome(person, 'Ağıl yerine gidiyor'),
      new PerformAction('Ağıl çitlerini çekiyor', PEN.BUILD_TIME / person.workSpeed('fencing'), {
        onComplete: (p, w) => {
          if (home.pen || !PEN_MATERIALS.every(([type, n]) => home.storage.has(type, n))) return;
          for (const [type, n] of PEN_MATERIALS) home.storage.remove(type, n);
          w.addPen(new Pen(home));
          p.improveSkill('fencing', PEN.BUILD_TIME / HOUR, w);
          p.changeStatus(0.05);
          w.log.add(`🐑 ${p.name} yuvasının yanına ağıl yaptı`, LogType.BUILD, [...home.owners, p]);
          onWorkDone();
        },
      }),
    ]);
  }
}
