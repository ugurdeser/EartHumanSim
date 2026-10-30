import { HOUR } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Project } from './Project.js';

const SESSION = 1.5 * HOUR;
const WORK_PER_SESSION = 0.35;
const REACH = 1500;

/** Ortak inşaat: topluluk üyeleri birbirinin barınağına yardım eder. */
export class HelpBuildProject extends Project {
  constructor() {
    super('İnşaata yardım etmek');
  }

  #site(person) {
    const homes = person.group?.adults.map((m) => m.home) ?? [];
    return homes.find((h) => h !== person.home && h.construction && h.position.distanceTo(person.position) <= REACH) ?? null;
  }

  priority(person) {
    return person.isAdult && this.#site(person) ? 0.75 : 0;
  }

  createAction(person, _world, onWorkDone) {
    const home = this.#site(person);
    if (!home) return null;
    return new SequenceAction(`${home.label} inşaatına yardıma gidiyor`, [
      new MoveToAction('İnşaata gidiyor', home.position, { arriveDistance: 4 }),
      new PerformAction(`${home.label} inşaatına yardım ediyor`, SESSION, {
        onComplete: (p, w) => {
          const leveledUp = home.build(WORK_PER_SESSION * p.workSpeed('building'));
          p.improveSkill('building', SESSION / HOUR, w);
          onWorkDone();
          if (leveledUp) w.log.add(`🛖 ${home.label}, topluluğun yardımıyla ${home.shelter.name} oldu`, LogType.BUILD, [...home.owners, p]);
        },
      }),
    ]);
  }
}
