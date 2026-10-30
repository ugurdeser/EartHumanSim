import { Skills } from '../../agents/Skills.js';
import { ALL_TECHNOLOGIES, TechnologyKind } from '../../tech/Technologies.js';
import { el } from '../dom.js';

const SECTIONS = [
  ['Teknoloji', TechnologyKind.TECHNOLOGY],
  ['Teknikler', TechnologyKind.TECHNIQUE],
];

/** Kişinin öğrendikleri: yapabildiği alet ve yapılar (teknoloji), bildiği yöntemler (teknik). */
export class CapabilitiesView {
  constructor(person) {
    this.person = person;
    this.root = el('div', { class: 'capabilities' });
  }

  /** Fikrin uygulama becerisi: "· uygulama: Çırak %12" */
  #practiceNote(technology) {
    if (!technology.practice) return '';
    const level = this.person.skills.get(technology.practice);
    return ` · uygulama: ${Skills.rankOf(level)} %${Math.round(level * 100)}`;
  }

  update() {
    const { knowledge } = this.person;
    this.root.replaceChildren(
      ...SECTIONS.flatMap(([title, kind]) => {
        const known = ALL_TECHNOLOGIES.filter((t) => t.kind === kind && knowledge.knows(t));
        return [
          el('h4', { text: `${title} (${known.length})` }),
          known.length
            ? el('ul', { class: 'tech-list' }, known.map((t) => el('li', { class: 'known' }, `✔ ${t.name}${this.#practiceNote(t)}`)))
            : el('p', { class: 'hint', text: 'Henüz öğrenmedi.' }),
        ];
      }),
    );
  }
}
