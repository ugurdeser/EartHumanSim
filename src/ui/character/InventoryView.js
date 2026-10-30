import { el, percent } from '../dom.js';

/** Kişinin giydikleri ve taşıdıkları (yuvanın deposu ev penceresinde). */
export class InventoryView {
  constructor(person) {
    this.person = person;
    this.worn = el('ul', { class: 'items' });
    this.wornTitle = el('h4');
    this.carried = el('ul', { class: 'items' });
    this.carriedTitle = el('h4');
    this.root = el('div', {}, this.wornTitle, this.worn, this.carriedTitle, this.carried);
  }

  /** Bir envanterin satırları (ev deposu da bunu kullanır). */
  static items(inventory) {
    return InventoryView.#rows(inventory.entries());
  }

  static #rows(entries, empty = 'Boş') {
    if (entries.length === 0) return [el('li', { class: 'hint', text: empty })];
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
    const inv = this.person.inventory;
    this.wornTitle.textContent = `Giydikleri (+${inv.bestInsulation.toFixed(0)}°C)`;
    this.worn.replaceChildren(...InventoryView.#rows(inv.wornEntries, 'Hiçbir şey giymiyor'));
    this.carriedTitle.textContent = `Taşıdıkları (${inv.weight.toFixed(1)} / ${inv.carryLimit.toFixed(0)} kg)`;
    this.carried.replaceChildren(...InventoryView.#rows(inv.carriedEntries));
  }
}
