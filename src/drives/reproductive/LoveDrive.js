import { Turkish } from '../../core/Turkish.js';
import { HOUR, MINUTE } from '../../config.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const MISSING_DISTANCE = 60;

export class LoveDrive extends Drive {
  static ID = 'love';
  static NAME = 'Aşk';
  static CATEGORY = DriveCategory.REPRODUCTIVE;
  static DESCRIPTION = 'Çift bağını sürdürmeyi amaçlamak.';

  isApplicable(person) {
    return Boolean(person.partner?.alive);
  }

  computeRaw(person, _world, dt) {
    const apart = person.position.distanceTo(person.partner.position) > MISSING_DISTANCE;
    if (apart) this.accumulate(dt, 6);
    else this.relieve(dt / (2 * HOUR));
    return this.pressure * 0.9;
  }

  createAction(person) {
    const partner = person.partner;
    return new SequenceAction(`${Turkish.accusative(partner.name)} özledi`, [
      ActionFactory.goToPerson(`${Turkish.genitive(partner.name)} yanına gidiyor`, partner, 4),
      new PerformAction(`${partner.name} ile vakit geçiriyor`, 30 * MINUTE, {
        onComplete: (p) => {
          if (!partner.alive) return;
          p.relationTo(partner).changeAffinity(0.1);
          partner.relationTo(p).changeAffinity(0.1);
          p.relationTo(partner).changeAttraction(0.03);
          partner.drives.get('love').relieve(0.5);
          this.relieve(1);
        },
      }),
    ]);
  }
}
