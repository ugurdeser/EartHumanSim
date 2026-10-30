import { el, startWindowDrag } from '../dom.js';

/**
 * F1 ile açılan geliştirici paneli. Bölümler bağımsızdır: her biri `title`, `root` ve
 * `update()` sunar; yeni bir araç eklemek için yalnızca bölüm listesine eklenir.
 */
export class DevPanel {
  constructor(container, sections) {
    this.sections = sections;
    this.root = el(
      'section',
      { class: 'char-window dev-panel hidden' },
      el(
        'header',
        { onMouseDown: (e) => startWindowDrag(e, this.root) },
        el('h3', { text: '🛠️ Geliştirici paneli' }),
        el('button', { class: 'icon', title: 'Kapat (F1)', onClick: () => this.toggle(false) }, '✕'),
      ),
      el(
        'div',
        { class: 'window-body' },
        sections.map((section) => el('details', { class: 'dev-section', open: '' }, el('summary', { text: section.title }), section.root)),
      ),
    );
    container.append(this.root);
  }

  get isOpen() {
    return !this.root.classList.contains('hidden');
  }

  toggle(open = !this.isOpen) {
    this.root.classList.toggle('hidden', !open);
    if (open) this.update();
  }

  update() {
    if (!this.isOpen) return;
    for (const section of this.sections) section.update();
  }
}
