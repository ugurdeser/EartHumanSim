import { el, percent } from '../dom.js';

/** Kişinin üstündekiler ve yuvasının deposu/ocağı. */
export class InventoryView {
  constructor(person) {
    this.person = person;
    this.carried = el('ul', { class: 'items' });
    this.carriedTitle = el('h4');
    this.stored = el('ul', { class: 'items' });
    this.fire = el('p', { class: 'hint' });
    this.root = el('div', {}, this.carriedTitle, this.carried, el('h4', { text: 'Yuvanın deposu' }), this.fire, this.stored);
  }

  static #items(inventory) {
    const entries = inventory.entries();
    if (entries.length === 0) return [el('li', { class: 'hint', text: 'Boş' })];
    return entries.map(({ type, count, condition }) =>
      el(
        'li',
        {},
        el('span', { text: `${type.icon} ${type.name}` }),
        el('span', { class: 'value', text: condition === undefined ? `×${count}` : `sağlamlık ${percent(condition)}` }),
      ),
    );
  }

  update() {
    const p = this.person;
    const inv = p.inventory;
    this.carriedTitle.textContent = `Üstündekiler (${inv.weight.toFixed(1)} / ${inv.capacity.toFixed(0)} kg)`;
    this.carried.replaceChildren(...InventoryView.#items(inv));
    const fire = p.home.fire;
    this.fire.textContent = fire.isLit ? `🔥 Ocak yanıyor (yakıt %${Math.round(fire.level * 100)})` : 'Ocak sönük';
    this.stored.replaceChildren(...InventoryView.#items(p.home.storage));
  }
}
