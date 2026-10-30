import { el } from './dom.js';

/** Topluluklar: lideri, geçerli emri, ortak erzakı ve üyeleri. Üyeye tıklayınca kişi, karta tıklayınca topluluk açılır. */
export class CommunityPanel {
  constructor(world, selection) {
    this.world = world;
    this.selection = selection;
    this.list = el('div', { class: 'families', onMouseDown: (e) => this.#onPick(e) });
    this.root = el('div', { class: 'tab-view' }, this.list);
  }

  #onPick(e) {
    const chip = e.target.closest('[data-id]');
    if (chip) {
      const person = this.world.people.find((p) => p.id === Number(chip.dataset.id));
      if (person) this.selection.select(person, { follow: true });
      return;
    }
    const card = e.target.closest('[data-group]');
    const group = this.world.social.groups.groups.find((g) => g.id === Number(card?.dataset.group));
    if (group) this.selection.selectGroup(group);
  }

  update() {
    const groups = this.world.social.groups.groups;
    if (groups.length === 0) {
      this.list.replaceChildren(el('p', { class: 'hint', text: 'Henüz topluluk kurulmadı.' }));
      return;
    }
    this.list.replaceChildren(...groups.map((group) => this.#card(group)));
  }

  static orderText(group) {
    if (!group.leader) return 'Lider yok';
    if (!group.order) return 'Emir yok, herkes kendi işinde';
    return `📣 ${group.order.shout} (+%${Math.round((group.orderBonus - 1) * 100)} hız)`;
  }

  #card(group) {
    const { food, fuelSeconds } = group.stock;
    return el(
      'div',
      { class: `family${group === this.selection.group ? ' selected' : ''}`, 'data-group': group.id, title: 'Topluluk bilgisini göster' },
      el('div', { class: 'family-head community-head' }, el('strong', { text: group.name, style: { color: group.color } }), el('span', { text: `${group.size} kişi · ${food} yiyecek · ${Math.round(fuelSeconds / 3600)} saat yakacak` })),
      el('div', { class: 'community-order', text: CommunityPanel.orderText(group) }),
      el(
        'div',
        { class: 'members' },
        [...group.members].map((m) =>
          el(
            'span',
            { 'data-id': m.id, class: `member${m === this.selection.person ? ' selected' : ''}` },
            el('span', { class: 'dot', style: { background: m.sex.color } }),
            `${m === group.leader ? '👑 ' : ''}${m.name} ${m.age}`,
          ),
        ),
      ),
    );
  }
}
