import { HOUR } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { MaterialSources } from '../materials/MaterialSources.js';
import { ActionFactory } from '../ActionFactory.js';
import { Project } from './Project.js';

const SESSION = 1.5 * HOUR;
const WORK_PER_SESSION = 0.35;

/**
 * Barınağı bir üst basamağa taşımak: dal kulübe → ahşap kulübe → taş ev.
 * Her basamak malzeme, bilgi, beceri ve birkaç iş oturumu ister.
 */
export class ShelterProject extends Project {
  constructor() {
    super('Barınak geliştirmek');
  }

  #canAttempt(person, next) {
    if (!next || !person.isAdult) return false;
    if (next.technology && !person.knowledge.knows(next.technology)) return false;
    return person.skills.get('building') >= next.minSkill;
  }

  priority(person, world) {
    const home = person.home;
    if (home.construction) return 0.8;
    const next = home.nextShelter;
    if (!this.#canAttempt(person, next)) return 0;
    const missing = next.materials.find(([type, n]) => person.inventory.count(type) + home.storage.count(type) < n);
    if (missing && !MaterialSources.canGather(person, world, missing[0])) return 0;
    return 0.7 - home.shelterLevel * 0.1;
  }

  createAction(person, world, onWorkDone) {
    const home = person.home;
    if (home.construction) return this.#buildSession(person, onWorkDone);

    const next = home.nextShelter;
    // Üzerindeki malzemeyi depoya bırak, eksik varsa topla
    for (const [type, amount] of next.materials) {
      const stored = home.storage.count(type);
      if (stored >= amount) continue;
      if (person.inventory.count(type) > 0) {
        return ActionFactory.depositAtHome(person, `${type.name} taşıyor`, (t) => t === type);
      }
      return ActionFactory.obtainMaterial(person, world, type, Math.min(amount - stored, person.inventory.roomFor(type)));
    }
    return new SequenceAction(`${next.name} inşaatına başlıyor`, [
      ActionFactory.goHome(person, 'Yuvasına gidiyor'),
      new CallbackAction('Temeli atıyor', (_p, w) => {
        if (!home.startConstruction()) return false;
        w.log.personal([...home.owners], `🏗 ${next.name} inşaatı başladı`, LogType.BUILD);
        return true;
      }),
    ]);
  }

  #buildSession(person, onWorkDone) {
    const home = person.home;
    return new SequenceAction('İnşaata gidiyor', [
      ActionFactory.goHome(person, 'Yuvasına gidiyor'),
      new PerformAction(`${home.nextShelter?.name ?? 'Barınak'} inşa ediyor`, SESSION, {
        onComplete: (p, w) => {
          const leveledUp = home.build(WORK_PER_SESSION * p.workSpeed('building'));
          p.improveSkill('building', SESSION / HOUR, w);
          onWorkDone();
          if (!leveledUp) return;
          p.changeStatus(0.08);
          w.log.add(`🛖 ${p.name} yuvasını ${home.shelter.name} hâline getirdi`, LogType.BUILD, [...home.owners, p]);
        },
      }),
    ]);
  }
}
