import { LogType } from '../core/EventLog.js';
import { Technologies } from '../tech/Technologies.js';
import { Pen } from '../world/Pen.js';

/** Kişiye elden evcil hayvan vermek: hayvan yuvasının ağılına katılır; ağıl yoksa kurulur ve kişi ağıl yapmayı öğrenir. */
export class Husbandry {
  /** Ağılda yer yoksa null döner. */
  static gift(world, person, Species, { sex } = {}) {
    const { home } = person;
    const pen = home.pen ?? Husbandry.#raisePen(world, person);
    if (!pen.hasRoom) return null;
    const animal = Species.createTamed(pen, world.rng, sex);
    world.addAnimal(animal);
    world.log.personal([...home.owners], `🐑 Yuvanın ağılına evcil bir ${animal.displayName.toLocaleLowerCase('tr')} geldi`, LogType.LIFE);
    return animal;
  }

  static #raisePen(world, person) {
    if (!person.knowledge.knows(Technologies.ANIMAL_PEN)) {
      person.knowledge.learn(Technologies.ANIMAL_PEN);
      world.log.personal([person], `💡 ${Technologies.ANIMAL_PEN.skill} öğrendi`, LogType.INFO);
    }
    return world.addPen(new Pen(person.home));
  }
}
