import { Skills } from '../../agents/Skills.js';
import { el, percent } from '../dom.js';
import { BarView } from './BarView.js';

/** Kalıtsal özellikler (zekâ dahil) ve beceriler. */
export class AbilitiesView {
  constructor(person) {
    this.person = person;
    this.traitBars = person.traits.entries().map((t) => {
      const bar = new BarView(t.name, 'trait');
      bar.row.title = `${t.effect}${AbilitiesView.#inheritanceNote(person, t.id)}`;
      return { id: t.id, bar };
    });
    this.skillBars = person.skills.entries().map((s) => ({ id: s.id, bar: new BarView(s.name, 'skill') }));
    this.root = el(
      'div',
      { class: 'abilities' },
      el('h4', { text: 'Kalıtsal özellikler' }),
      this.traitBars.map((t) => t.bar.row),
      el('p', { class: 'hint', text: AbilitiesView.#parentsLine(person) }),
      el('h4', { text: 'Beceriler' }),
      this.skillBars.map((s) => s.bar.row),
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
    for (const { id, bar } of this.skillBars) {
      const level = p.skills.get(id);
      bar.set(level, `${Math.round(p.skills.hoursOf(id)).toLocaleString('tr')} sa`);
      bar.row.title = `${Skills.rankOf(level)} · ${percent(level)} (ustalık 10.000 saat)`;
    }
  }
}
