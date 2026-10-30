import { HOUR } from '../../config.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { Project } from './Project.js';

/** Zeki kişiler boş zamanlarında yeni şeyler dener: icat şansı. */
export class ExperimentProject extends Project {
  constructor() {
    super('Yeni şeyler denemek');
  }

  priority(person) {
    if (!person.isAdult || person.knowledge.researchable.length === 0) return 0;
    return 0.15 + person.traits.intelligence * 0.35;
  }

  createAction(person, _world, onWorkDone) {
    return new PerformAction('Yeni şeyler deniyor', 1 * HOUR, {
      onComplete: (p, w) => {
        w.invention.tryInvent(p, 1);
        p.improveSkill('crafting', 1, w);
        onWorkDone();
      },
    });
  }
}
