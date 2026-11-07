import { Sex } from '../../agents/Sex.js';
import { Husbandry } from '../../animals/Husbandry.js';
import { Sheep } from '../../animals/Sheep.js';
import { el, formatAge, percent } from '../dom.js';

const { names } = Sheep.SPECIES;

/** Kişinin yuvasındaki ağıl: hayvanları listeler, elden evcil hayvan verilmesini sağlar. */
export class PetsView {
  constructor(person, world, selection) {
    this.person = person;
    this.world = world;
    this.selection = selection;
    this.list = el('ul', { class: 'population' });
    this.summary = el('p', { class: 'hint' });
    this.male = this.#giftButton(names.male, Sex.MALE);
    this.female = this.#giftButton(names.female, Sex.FEMALE);
    this.actions = el('div', { class: 'pet-actions' }, this.male, this.female);
    this.root = el('div', {}, this.list, this.summary, this.actions);
  }

  #giftButton(name, sex) {
    return el('button', { text: `+ Evcil ${name.toLocaleLowerCase('tr')}`, title: 'Yuvanın ağılına ekler', onClick: () => this.#gift(sex) });
  }

  #gift(sex) {
    Husbandry.gift(this.world, this.person, Sheep, { sex });
    this.update();
  }

  #row(animal) {
    return el(
      'li',
      { title: 'Hayvanın bilgilerini aç', onMouseDown: () => this.selection.selectAnimal(animal) },
      el('span', { class: 'dot', style: { background: animal.species.color } }),
      el('span', { class: 'name', text: animal.displayName }),
      el('span', { class: 'age', text: formatAge(animal.ageYears) }),
      el('span', { class: 'drive', text: `${animal.isTamed ? 'Evcil' : 'Tutsak'} · sağlık ${percent(animal.needs.health)}` }),
    );
  }

  update() {
    const { alive, home } = this.person;
    const pen = home.pen;
    const animals = pen?.animals ?? [];
    this.list.replaceChildren(...animals.map((animal) => this.#row(animal)));
    this.summary.textContent = pen ? `Ağılda ${animals.length} / ${pen.herd.maxSize} hayvan` : 'Henüz ağılı ve hayvanı yok.';
    this.actions.hidden = !alive;
    const full = Boolean(pen) && !pen.hasRoom;
    this.male.disabled = full;
    this.female.disabled = full;
  }
}
