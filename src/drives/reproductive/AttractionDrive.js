import { Turkish } from '../../core/Turkish.js';
import { MINUTE } from '../../config.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { SocialQueries } from '../../ai/SocialQueries.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

export class AttractionDrive extends Drive {
  static ID = 'attraction';
  static NAME = 'Cezbetmek';
  static CATEGORY = DriveCategory.REPRODUCTIVE;
  static DESCRIPTION = 'Cinsiyete dayalı cazibe uyandırmayı amaçlamak.';

  isApplicable(person) {
    return person.isAdult;
  }

  computeRaw(person, _world, dt) {
    this.accumulate(dt, 14);
    return this.pressure * (person.partner ? 0.35 : 0.85);
  }

  createAction(person, world) {
    const target = person.partner ?? SocialQueries.bestMateCandidate(person, world, 1500);
    if (!target) return null;
    return new SequenceAction(`${Turkish.accusative(target.name)} etkilemek istiyor`, [
      ActionFactory.goToPerson(`${Turkish.dative(target.name)} yaklaşıyor`, target, 6),
      new PerformAction(`${Turkish.dative(target.name)} gösteriş yapıyor`, 10 * MINUTE, {
        onComplete: (p, w) => {
          if (!target.alive) return;
          w.social.impress(p, target);
          this.relieve(0.8);
        },
      }),
    ]);
  }
}
