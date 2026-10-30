import { el } from './dom.js';

const TABS = [
  { id: 'living', label: 'Yaşayanlar' },
  { id: 'deceased', label: 'Ölenler' },
];

/** Nüfus listesi: yaşayanlar ve ölenler (ölüye tıklayınca hayat hikâyesi açılır). */
export class PopulationList {
  constructor(world, selection) {
    this.world = world;
    this.selection = selection;
    this.activeTab = TABS[0].id;
    this.renderedKey = null;
    this.summary = el('p', { class: 'hint' });
    this.tabButtons = TABS.map((tab) => el('button', { 'data-tab': tab.id, onClick: () => this.#showTab(tab.id) }));
    // Satırlar sık yenilendiği için tıklama, liste üzerinden (event delegation) yakalanır.
    this.list = el('ul', { class: 'population', onMouseDown: (e) => this.#onPick(e) });
    this.root = el('div', { class: 'tab-view' }, el('nav', { class: 'sub-tabs' }, this.tabButtons), this.list, this.summary);
    this.#showTab(this.activeTab);
  }

  #showTab(tabId) {
    this.activeTab = tabId;
    this.renderedKey = null;
    this.tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    this.list.scrollTop = 0;
    this.update();
  }

  #onPick(e) {
    const row = e.target.closest('li[data-id]');
    if (!row) return;
    const person = this.world.findPersonById(Number(row.dataset.id));
    if (person) this.selection.select(person, { follow: person.alive });
  }

  update() {
    const people = this.world.people;
    const deceased = this.world.deceased;
    const males = people.filter((p) => !p.isFemale).length;
    this.summary.textContent = `♂ ${males} erkek · ♀ ${people.length - males} kadın`;
    this.tabButtons[0].textContent = `Yaşayanlar (${people.length})`;
    this.tabButtons[1].textContent = `Ölenler (${deceased.length})`;

    if (this.activeTab === 'living') {
      this.list.replaceChildren(...people.map((person) => this.#livingRow(person)));
      return;
    }
    // Ölüler değişmez; liste yalnızca yeni ölüm ya da seçim değişince yeniden çizilir.
    const key = `${deceased.length}:${this.selection.person?.id}`;
    if (key === this.renderedKey) return;
    this.renderedKey = key;
    if (deceased.length === 0) {
      this.list.replaceChildren(el('li', { class: 'hint', text: 'Henüz ölen yok.' }));
      return;
    }
    this.list.replaceChildren(...[...deceased].reverse().map((person) => this.#deceasedRow(person)));
  }

  #livingRow(person) {
    return el(
      'li',
      { 'data-id': person.id, class: person === this.selection.person ? 'selected' : '' },
      el('span', { class: 'dot', style: { background: person.sex.color } }),
      el('span', { class: 'name', text: person.fullName }),
      el('span', { class: 'age', text: `${person.age} yaş` }),
      el('span', { class: 'drive', text: person.currentDrive?.name ?? 'Boşta' }),
    );
  }

  #deceasedRow(person) {
    return el(
      'li',
      { 'data-id': person.id, class: `dead${person === this.selection.person ? ' selected' : ''}`, title: 'Hayat hikâyesini aç' },
      el('span', { class: 'dot', style: { background: person.sex.color } }),
      el('span', { class: 'name', text: `${person.fullName} ✝` }),
      el('span', { class: 'age', text: `${person.age} yaş` }),
      el('span', { class: 'drive', text: person.causeOfDeath }),
    );
  }
}
