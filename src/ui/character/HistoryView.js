import { el } from '../dom.js';

/** Kişinin hayat hikâyesi: en yeni olay en üstte, olay anındaki yaşıyla. */
export class HistoryView {
  constructor(person, world) {
    this.person = person;
    this.world = world;
    this.renderedCount = -1;
    this.root = el('ul', { class: 'history' });
  }

  update() {
    const history = this.person.history;
    if (history.length === this.renderedCount) return;
    this.renderedCount = history.length;

    if (history.length === 0) {
      this.root.replaceChildren(el('li', { class: 'hint', text: 'Henüz kayda değer bir olay yok.' }));
      return;
    }
    const now = this.world.now;
    const items = [...history.entries].reverse().map((entry) =>
      el(
        'li',
        { class: `log-${entry.type}` },
        el('time', { text: `${entry.time} · ${this.person.ageAt(entry.simTime, now)} yaş` }),
        el('div', { text: entry.message }),
      ),
    );
    this.root.replaceChildren(...items);
  }
}
