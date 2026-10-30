import { RelationKind } from '../../agents/Relationship.js';
import { Kinship } from '../../society/Kinship.js';
import { el } from '../dom.js';
import { InfoView } from './InfoView.js';

const signed = (value) => `${value > 0 ? '+' : ''}${Math.round(value * 100)}`;

/** Kişinin tanıdıkları: türlerine göre gruplu; aşk, nefret, dostluk ve akrabalık. */
export class RelationsView {
  constructor(person, world) {
    this.person = person;
    this.world = world;
    this.root = el('div', { class: 'relations' });
  }

  #entries() {
    const relatives = Kinship.closeRelatives(this.person);
    const entries = [];
    for (const [id, relation] of this.person.relations.entries()) {
      const other = this.world.findPersonById(id);
      if (!other) continue;
      const tag = relatives.includes(other) ? Kinship.describe(other, this.person) : null;
      entries.push({ other, relation, tag });
    }
    return entries.sort((a, b) => b.relation.strength - a.relation.strength);
  }

  #row({ other, relation, tag }) {
    const values = `sevgi ${signed(relation.affinity)} · aşk ${Math.round(relation.attraction * 100)} · saygı ${signed(relation.respect)}`;
    return el(
      'li',
      {},
      el('div', { class: 'relation-head' }, InfoView.link(other, ` (${other.age})`), el('span', { class: 'relation-tag', text: tag ? `${tag} · ${relation.kind.name}` : relation.kind.name })),
      el('div', { class: 'relation-values', text: values }),
    );
  }

  update() {
    const entries = this.#entries();
    if (entries.length === 0) {
      this.root.replaceChildren(el('p', { class: 'hint', text: 'Henüz kimseyle tanışmadı.' }));
      return;
    }
    const groups = [...new Set(Object.values(RelationKind).map((kind) => kind.group))];
    const sections = groups.flatMap((name) => {
      const group = entries.filter((e) => e.relation.kind.group === name);
      if (group.length === 0) return [];
      return [el('h4', { text: `${name} (${group.length})` }), el('ul', { class: 'relation-list' }, group.map((e) => this.#row(e)))];
    });
    this.root.replaceChildren(...sections);
  }
}
