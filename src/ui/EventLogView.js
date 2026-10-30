import { el } from './dom.js';

const MAX_VISIBLE = 80;

export class EventLogView {
  constructor(log) {
    this.list = el('ul', { class: 'event-log' });
    this.root = el('div', { class: 'tab-view' }, this.list);
    log.entries.slice(0, MAX_VISIBLE).reverse().forEach((entry) => this.#prepend(entry));
    log.subscribe((entry) => this.#prepend(entry));
  }

  #prepend(entry) {
    this.list.prepend(el('li', { class: `log-${entry.type}` }, el('time', { text: entry.time }), ` ${entry.message}`));
    while (this.list.children.length > MAX_VISIBLE) this.list.lastChild.remove();
  }
}
