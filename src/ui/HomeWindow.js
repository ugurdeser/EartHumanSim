import { el, startWindowDrag } from './dom.js';
import { HomeView } from './character/HomeView.js';

/** Seçilen yuvanın penceresi: barınak, ocak, depo ve yaşayanlar. */
export class HomeWindow {
  constructor(container, world, selection) {
    this.world = world;
    this.selection = selection;
    this.home = null;
    this.view = null;

    this.title = el('h3');
    this.status = el('div', { class: 'activity' });
    this.body = el('div', { class: 'window-body', onMouseDown: (e) => this.#onLinkClick(e) });
    this.root = el(
      'section',
      { class: 'char-window hidden' },
      el(
        'header',
        { onMouseDown: (e) => startWindowDrag(e, this.root) },
        this.title,
        el('button', { class: 'icon', title: 'Kapat (Esc)', onClick: () => selection.clear() }, '✕'),
      ),
      this.status,
      this.body,
    );
    container.append(this.root);
    selection.subscribe(() => this.#open(selection.home));
  }

  #open(home) {
    this.home = home;
    this.root.classList.toggle('hidden', !home);
    if (!home) return;
    this.view = new HomeView(() => home);
    this.body.replaceChildren(this.view.root);
    this.update();
  }

  /** Yaşayanların adına tıklayınca o kişinin penceresine geçilir. */
  #onLinkClick(e) {
    const link = e.target.closest('[data-id]');
    if (!link) return;
    const person = this.world.findPersonById(Number(link.dataset.id));
    if (person) this.selection.select(person);
  }

  update() {
    const home = this.home;
    if (!home) return;
    const { x, y } = home.position;
    this.title.textContent = `🏠 ${home.label}`;
    this.status.textContent = this.world.homes.includes(home) ? `Konum: ${Math.round(x)}, ${Math.round(y)}` : 'Bu yuva artık boş';
    this.view.update();
  }
}
