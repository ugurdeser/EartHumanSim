import { DOMESTICATION, HOUR } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Domestication } from '../../animals/life/Domestication.js';
import { Technologies } from '../../tech/Technologies.js';
import { ActionFactory } from '../ActionFactory.js';
import { Project } from '../projects/Project.js';
import { AnimalHandling } from './AnimalHandling.js';

/**
 * Yabani hayvan yakalayıp ağıla katmak. Fikri bilmek yetmez: acemi çoğu kez elinden
 * kaçırır ve sürüyü ürkütür; beceri her denemeyle yavaşça gelişir. Ağıl üreyebilsin diye
 * önce eksik cinsiyet aranır. Tür yatkınlığı SPECIES.domestication'dan gelir.
 */
export class CaptureAnimalProject extends Project {
  constructor() {
    super('Hayvan yakalamak');
  }

  static #findTarget(person, world) {
    const canTry = (a) => Domestication.canAttempt(a, person);
    const sex = person.home.pen.missingSex;
    const radius = DOMESTICATION.SEARCH_RADIUS;
    return world.nearestAnimal(person.position, radius, (a) => a.sex === sex && canTry(a)) ?? world.nearestAnimal(person.position, radius, canTry);
  }

  #canAttempt(person) {
    const pen = person.home.pen;
    return person.isAdult && person.knowledge.knows(Technologies.ANIMAL_CAPTURE) && Boolean(pen) && pen.hasRoom && pen.animals.length < DOMESTICATION.BREEDING_STOCK;
  }

  priority(person, world) {
    return this.#canAttempt(person) && CaptureAnimalProject.#findTarget(person, world) ? 0.55 : 0;
  }

  createAction(person, world, onWorkDone) {
    if (!this.#canAttempt(person)) return null;
    const animal = CaptureAnimalProject.#findTarget(person, world)?.animal;
    if (!animal) return null;
    const name = animal.displayName.toLocaleLowerCase('tr');
    return new SequenceAction(`${animal.displayName} yakalamaya gidiyor`, [
      new MoveToAction(`${animal.displayName} peşinde`, () => (animal.alive ? animal.position : null), { arriveDistance: AnimalHandling.REACH }),
      new PerformAction(`${animal.displayName} yakalamaya çalışıyor`, DOMESTICATION.CAPTURE_TIME / person.workSpeed('trapping', 'agility'), {
        onTick: (_p, w) => AnimalHandling.hold(animal, w),
        onComplete: (p, w) => {
          const pen = p.home.pen;
          if (!AnimalHandling.isWithinReach(p, animal) || !pen?.hasRoom || animal.domestication) return;
          p.improveSkill('trapping', DOMESTICATION.CAPTURE_TIME / HOUR, w);
          onWorkDone();
          if (w.rng.chance(Domestication.captureChance(animal, p))) {
            animal.capture(w, pen);
            w.log.add(`🪢 ${p.name} bir ${name} yakaladı`, LogType.BUILD, [p]);
            return;
          }
          animal.herd?.alarm(w.now);
          animal.alert(w);
          w.log.personal([p], `💨 ${name} elinden kaçtı`, LogType.INFO);
        },
      }),
      ActionFactory.goHome(person, 'Ağılına dönüyor'),
    ]);
  }
}
