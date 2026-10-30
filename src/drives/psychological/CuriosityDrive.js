import { CallbackAction } from '../../actions/CallbackAction.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const CHILD_ROAM_CELLS = 2;
const ADULT_ROAM_CELLS = 12;

export class CuriosityDrive extends Drive {
  static ID = 'curiosity';
  static NAME = 'Merak';
  static CATEGORY = DriveCategory.PSYCHOLOGICAL;
  static DESCRIPTION = 'Neler olup bittiği hakkında bilgi edinmeye çalışmak.';

  computeRaw(person, _world, dt) {
    this.accumulate(dt, 6);
    const novelty = 1 - person.exploration.exploredFraction * 0.8;
    return this.pressure * novelty * (person.isChild ? 0.3 : 1);
  }

  createAction(person, world) {
    const maxRing = person.isChild ? CHILD_ROAM_CELLS : ADULT_ROAM_CELLS;
    const target = person.exploration.findUnexplored(person.position, world.rng, maxRing);
    if (!target) return null;
    return new SequenceAction('Keşfe çıktı', [
      new MoveToAction('Bilinmeyen yerleri keşfediyor', target, { arriveDistance: 10 }),
      new CallbackAction('Etrafa bakıyor', (p, w) => {
        this.relieve(0.5);
        w.invention.tryInvent(p, 0.2); // yeni yerler yeni fikirler doğurur
      }),
    ]);
  }
}
