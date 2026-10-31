import { AGING, COMMUNITY } from '../../config.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const CHILD_ROAM_CELLS = 2;
const ADULT_ROAM_CELLS = 12;
const WORK_DRIVES = ['status', 'hoarding', 'creating'];

export class CuriosityDrive extends Drive {
  static ID = 'curiosity';
  static NAME = 'Merak';
  static CATEGORY = DriveCategory.PSYCHOLOGICAL;
  static DESCRIPTION = 'Neler olup bittiği hakkında bilgi edinmeye çalışmak.';
  static FOR_DEPENDENTS = true;

  isApplicable(person) {
    return !person.isConfined && !person.isInfant && person.ageYears >= AGING.DAYCARE_AGE;
  }

  computeRaw(person, _world, dt) {
    this.accumulate(dt, 6);
    if (person.isChild) return this.pressure * 0.6;
    return this.pressure * (1 - person.exploration.exploredFraction * 0.8);
  }

  /** Çocuk yakında çalışan en becerikli yetişkini seçer. */
  #findWorker(person, world) {
    const workers = world.peopleNear(person.position, COMMUNITY.WATCH_RANGE, person).filter((p) => p.isAdult && WORK_DRIVES.includes(p.currentDrive?.id));
    const skill = (p) => p.skills.get(p.skills.best);
    return workers.reduce((best, p) => (!best || skill(p) > skill(best) ? p : best), null);
  }

  /** Çocuk iş yapanı izleyip öğrenir; usta yanındaysa bu çıraklıktır. */
  #watch(worker) {
    return new SequenceAction(`${worker.name} işini izlemeye gidiyor`, [
      ActionFactory.goToPerson(`${worker.name} yanına gidiyor`, worker, 6),
      new PerformAction(`${worker.name} işini izleyip öğreniyor`, COMMUNITY.WATCH_TIME, {
        onComplete: (p, w) => {
          if (!worker.alive) return;
          p.improveSkill(worker.skills.best, 1, w);
          p.relationTo(worker).changeRespect(0.01);
          w.invention.tryTeach(worker, p);
          this.relieve(0.6);
        },
      }),
    ]);
  }

  createAction(person, world) {
    if (person.isChild) {
      const worker = this.#findWorker(person, world);
      if (worker) return this.#watch(worker);
      if (person.isDependent) return null;
    }
    const maxRing = person.isChild ? CHILD_ROAM_CELLS : ADULT_ROAM_CELLS;
    const target = person.exploration.findUnexplored(person.position, world.rng, maxRing, (x, y) => world.isPassable(x, y));
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
