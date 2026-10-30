import { el } from './dom.js';

/** Tüm aileler: yuva/barınak bilgisi ve üyeleri (tıklayınca kişi seçilir). */
export class FamilyPanel {
  constructor(world, selection) {
    this.world = world;
    this.selection = selection;
    this.title = el('h3');
    this.list = el('div', { class: 'families', onMouseDown: (e) => this.#onPick(e) });
    this.root = el('section', { class: 'panel' }, this.title, this.list);
  }

  #onPick(e) {
    const chip = e.target.closest('[data-id]');
    if (!chip) return;
    const person = this.world.people.find((p) => p.id === Number(chip.dataset.id));
    if (person) this.selection.select(person, { follow: true });
  }

  update() {
    const families = this.world.social.families.families;
    this.title.textContent = `Aileler: ${families.length}`;
    if (families.length === 0) {
      this.list.replaceChildren(el('p', { class: 'hint', text: 'Henüz evlenen yok.' }));
      return;
    }
    this.list.replaceChildren(...families.map((family) => this.#card(family)));
  }

  #card(family) {
    const home = family.home;
    const shelter = `${home.shelter.name}${home.fire.isLit ? ' 🔥' : ''}`;
    return el(
      'div',
      { class: 'family' },
      el('div', { class: 'family-head' }, el('strong', { text: family.name }), el('span', { text: `${shelter} · ${home.storage.foodCount} yiyecek` })),
      el(
        'div',
        { class: 'members' },
        family.livingMembers.map((m) =>
          el(
            'span',
            { 'data-id': m.id, class: `member${m === this.selection.person ? ' selected' : ''}` },
            el('span', { class: 'dot', style: { background: m.sex.color } }),
            `${m.name} ${m.age}`,
          ),
        ),
      ),
    );
  }
}
