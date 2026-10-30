import { Turkish } from '../../core/Turkish.js';
import { HOUR, MINUTE } from '../../config.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { SocialQueries } from '../../ai/SocialQueries.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

export class AffiliationDrive extends Drive {
  static ID = 'affiliation';
  static NAME = 'Bağlılık';
  static CATEGORY = DriveCategory.SOCIAL;
  static DESCRIPTION = 'Başkalarını sizi kendi topluluklarına dahil etmeye teşvik edecek şekilde davranmayı amaçlamak.';

  computeRaw(person, world, dt) {
    if (SocialQueries.isAlone(person, world)) this.accumulate(dt, person.isChild ? 1 : 4);
    else this.relieve(dt / HOUR);
    return this.pressure;
  }

  createAction(person, world) {
    const friend = SocialQueries.closestCompanion(person, world);
    if (!friend) return null;
    return new SequenceAction(`${Turkish.accusative(friend.name)} arıyor`, [
      ActionFactory.goToPerson(`${Turkish.genitive(friend.name)} yanına gidiyor`, friend, 4),
      new PerformAction(`${friend.name} ile sohbet ediyor`, 15 * MINUTE, {
        onComplete: (p, w) => {
          if (!friend.alive) return;
          if (p.isAdult && friend.isAdult) w.social.chat(p, friend);
          else p.relationTo(friend).changeAffinity(0.05);
          friend.drives.get('affiliation').relieve(0.4);
          this.relieve(0.7);
        },
      }),
    ]);
  }
}
