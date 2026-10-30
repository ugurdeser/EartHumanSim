import { DOMESTICATION, HOUR } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Technologies } from '../../tech/Technologies.js';
import { Project } from '../projects/Project.js';
import { AnimalHandling } from './AnimalHandling.js';

/** Tutsak hayvanı insana alıştırmak: yedirmek, dokunmak; aylar süren sabır işi. */
export class TendAnimalsProject extends Project {
  constructor() {
    super('Hayvan alıştırmak');
  }

  static #nextAnimal(person, world) {
    if (!person.isAdult || !person.knowledge.knows(Technologies.ANIMAL_TAMING)) return null;
    return person.home.pen?.animals.find((a) => a.alive && a.domestication.needsCare(world.now)) ?? null;
  }

  priority(person, world) {
    return TendAnimalsProject.#nextAnimal(person, world) ? 0.65 : 0;
  }

  createAction(person, world, onWorkDone) {
    const animal = TendAnimalsProject.#nextAnimal(person, world);
    if (!animal) return null;
    const name = animal.displayName.toLocaleLowerCase('tr');
    return new SequenceAction(`${animal.displayName} yanına gidiyor`, [
      new MoveToAction(`${animal.displayName} yanına gidiyor`, () => (animal.alive ? animal.position : null), { arriveDistance: AnimalHandling.REACH }),
      new PerformAction(`${animal.displayName} alıştırıyor`, DOMESTICATION.TEND_TIME, {
        onTick: (_p, w) => AnimalHandling.hold(animal, w),
        onComplete: (p, w) => {
          if (!animal.alive || !animal.domestication) return;
          p.improveSkill('taming', DOMESTICATION.TEND_TIME / HOUR, w);
          onWorkDone();
          if (!animal.domestication.tend(animal, p, w.now)) return;
          p.changeStatus(0.08);
          w.log.add(`🐑 ${p.name} bir ${name} evcilleştirdi`, LogType.BUILD, [p]);
        },
      }),
    ]);
  }
}
