import { el } from './dom.js';

export class PopulationList {
  constructor(world, selection) {
    this.world = world;
    this.selection = selection;
    this.title = el('h3');
    // Satırlar sık yenilendiği için tıklama, liste üzerinden (event delegation) yakalanır.
    this.list = el('ul', { class: 'population', onMouseDown: (e) => this.#onPick(e) });
    this.root = el('section', { class: 'panel' }, this.title, this.list);
  }

  #onPick(e) {
    const row = e.target.closest('li[data-id]');
    if (!row) return;
    const person = this.world.people.find((p) => p.id === Number(row.dataset.id));
    if (person) this.selection.select(person, { follow: true });
  }

  update() {
    const people = this.world.people;
    const males = people.filter((p) => !p.isFemale).length;
    this.title.textContent = `Nüfus: ${people.length} (♂ ${males} · ♀ ${people.length - males})`;
    this.list.replaceChildren(...people.map((person) => this.#row(person)));
  }

  #row(person) {
    return el(
      'li',
      { 'data-id': person.id, class: person === this.selection.person ? 'selected' : '' },
      el('span', { class: 'dot', style: { background: person.sex.color } }),
      el('span', { class: 'name', text: person.fullName }),
      el('span', { class: 'age', text: `${person.age} yaş` }),
      el('span', { class: 'drive', text: person.currentDrive?.name ?? 'Boşta' }),
    );
  }
}
