import { Turkish } from '../../core/Turkish.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

export class JusticeDrive extends Drive {
  static ID = 'justice';
  static NAME = 'Adalet';
  static CATEGORY = DriveCategory.SOCIAL;
  static DESCRIPTION = 'Anti-sosyal davranışlarda bulunanları davranışlarından dolayı sorumlu tutmayı amaçlamak.';

  isApplicable(person) {
    return person.isAdult && person.grievances.length > 0;
  }

  computeRaw(person) {
    return 0.6 + Math.min(person.grievances.length, 3) * 0.15;
  }

  createAction(person) {
    const grievance = person.grievances[0];
    const { thief } = grievance;
    return new SequenceAction(`${Turkish.ablative(thief.name)} hesap soracak`, [
      ActionFactory.goToPerson(`${Turkish.accusative(thief.name)} buluyor`, thief, 3),
      new CallbackAction(`${Turkish.ablative(thief.name)} hesap soruyor`, (p, w) => {
        if (!thief.alive) return false;
        w.social.punish(p, grievance);
        return true;
      }),
    ]);
  }
}
