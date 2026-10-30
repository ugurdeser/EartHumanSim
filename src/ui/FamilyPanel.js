import { el } from './dom.js';

const HOME_ZOOM = 1.5; // yuvaya gidilirken en az bu yakınlık

/** Tüm aileler: yuva/barınak bilgisi ve üyeleri. Üyeye tıklayınca kişi, başlığa tıklayınca yuva açılır. */
export class FamilyPanel {
  constructor(world, selection, camera) {
    this.world = world;
    this.selection = selection;
    this.camera = camera;
    this.list = el('div', { class: 'families', onMouseDown: (e) => this.#onPick(e) });
    this.root = el('div', { class: 'tab-view' }, this.list);
  }

  #onPick(e) {
    const head = e.target.closest('[data-family]');
    if (head) return this.#openHome(Number(head.dataset.family));
    const chip = e.target.closest('[data-id]');
    if (!chip) return;
    const person = this.world.people.find((p) => p.id === Number(chip.dataset.id));
    if (person) this.selection.select(person, { follow: true });
  }

  #openHome(familyId) {
    const family = this.world.social.families.families.find((f) => f.id === familyId);
    if (!family) return;
    this.selection.selectHome(family.home);
    this.camera.focusOn(family.home.position, HOME_ZOOM);
  }

  update() {
    const families = this.world.social.families.families;
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
      { class: `family${home === this.selection.home ? ' selected' : ''}` },
      el('div', { class: 'family-head', 'data-family': family.id, title: 'Yuvayı göster' }, el('strong', { text: family.name }), el('span', { text: `${shelter} · ${home.storage.foodCount} yiyecek` })),
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
