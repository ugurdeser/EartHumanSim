import { ALL_TECHNOLOGIES } from '../../tech/Technologies.js';
import { el, percent } from '../dom.js';
import { BarView } from './BarView.js';

/** Kalıtsal özellikler (zekâ dahil), beceriler ve bilinen teknolojiler. */
export class AbilitiesView {
  constructor(person) {
    this.person = person;
    this.traitBars = person.traits.entries().map((t) => {
      const bar = new BarView(t.name, 'trait');
      bar.row.title = `${t.effect}${AbilitiesView.#inheritanceNote(person, t.id)}`;
      return { id: t.id, bar };
    });
    this.skillBars = person.skills.entries().map((s) => ({ id: s.id, bar: new BarView(s.name, 'skill') }));
    this.knowledge = el('ul', { class: 'tech-list' });
    this.root = el(
      'div',
      { class: 'abilities' },
      el('h4', { text: 'Kalıtsal özellikler' }),
      this.traitBars.map((t) => t.bar.row),
      el('p', { class: 'hint', text: AbilitiesView.#parentsLine(person) }),
      el('h4', { text: 'Beceriler' }),
      this.skillBars.map((s) => s.bar.row),
      el('h4', { text: 'Bildiği teknikler' }),
      this.knowledge,
    );
  }

  static #parentsLine(person) {
    if (!person.mother) return 'Bu topraklara dışarıdan geldi; özellikleri kendine özgü.';
    return 'Özellikler anne ve babanın ortalamasından gelir; ikisinde de güçlü olan yan çocuğa daha kesin geçer.';
  }

  static #inheritanceNote(person, id) {
    const { mother, father } = person;
    if (!mother || !father) return '';
    return `\nAnne: ${percent(mother.traits[id])} · Baba: ${percent(father.traits[id])}`;
  }

  update() {
    const p = this.person;
    for (const { id, bar } of this.traitBars) bar.set(p.traits[id], percent(p.traits[id]));
    for (const { id, bar } of this.skillBars) bar.set(p.skills.get(id), percent(p.skills.get(id)));
    this.knowledge.replaceChildren(
      ...ALL_TECHNOLOGIES.map((tech) =>
        el('li', { class: p.knowledge.knows(tech) ? 'known' : 'unknown' }, `${p.knowledge.knows(tech) ? '✔' : '·'} ${tech.name}`),
      ),
    );
  }
}
