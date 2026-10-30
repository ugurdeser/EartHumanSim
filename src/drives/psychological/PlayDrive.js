import { Turkish } from '../../core/Turkish.js';
import { MINUTE } from '../../config.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { SocialQueries } from '../../ai/SocialQueries.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

export class PlayDrive extends Drive {
  static ID = 'play';
  static NAME = 'Oyun';
  static CATEGORY = DriveCategory.PSYCHOLOGICAL;
  static DESCRIPTION = 'Yeni beceriler edinmek için fırsatlar peşinde koşmak.';

  computeRaw(person, _world, dt) {
    this.accumulate(dt, person.isChild ? 3 : 8);
    return this.pressure * 0.75;
  }

  createAction(person, world) {
    const mate = SocialQueries.playmate(person, world);
    if (!mate) {
      return new PerformAction('Tek başına beceri geliştiriyor', 15 * MINUTE, {
        onComplete: (p) => {
          p.improveRandomSkill(0.015);
          this.relieve(0.7);
        },
      });
    }
    return new SequenceAction(`${mate.name} ile oynamak istiyor`, [
      ActionFactory.goToPerson(`${Turkish.dative(mate.name)} gidiyor`, mate, 3),
      new PerformAction(`${mate.name} ile oynuyor`, 20 * MINUTE, {
        onComplete: (p, w) => {
          if (!mate.alive) return;
          w.social.play(p, mate);
          mate.drives.get('play').relieve(0.8);
          this.relieve(1);
        },
      }),
    ]);
  }
}
