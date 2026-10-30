import { el } from './dom.js';

/**
 * Bölümlere ayrılmış olay listesi (hayat ve topluluk hikâyesi). Her bölüm açılıp kapanır;
 * kapatılan bölüm yeni olay gelince kapalı kalır. Boş bölümler gösterilmez.
 */
export class ChapterList {
  constructor(emptyText) {
    this.emptyText = emptyText;
    this.closed = new Set();
    this.root = el('div', { class: 'history' });
  }

  /** sections: [{ id, name, logType, items: [{ time, message }] }], en yeni olay başta. */
  render(sections) {
    const filled = sections.filter((section) => section.items.length > 0);
    if (filled.length === 0) {
      this.root.replaceChildren(el('p', { class: 'hint', text: this.emptyText }));
      return;
    }
    this.root.replaceChildren(...filled.map((section) => this.#chapter(section)));
  }

  #chapter({ id, name, logType, items }) {
    const rows = items.map(({ time, message, type }) => el('li', { class: `log-${type ?? logType}` }, el('time', { text: time }), el('div', { text: message })));
    const chapter = el('details', {}, el('summary', {}, `${name} (${items.length})`), el('ul', {}, rows));
    chapter.open = !this.closed.has(id);
    chapter.addEventListener('toggle', () => (chapter.open ? this.closed.delete(id) : this.closed.add(id)));
    return chapter;
  }
}
