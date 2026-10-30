import { el } from '../dom.js';
import { AbilitiesView } from './AbilitiesView.js';
import { DrivesView } from './DrivesView.js';
import { HistoryView } from './HistoryView.js';
import { InfoView } from './InfoView.js';
import { InventoryView } from './InventoryView.js';
import { NeedsView } from './NeedsView.js';

const TABS = [
  { id: 'history', label: 'Hayat Hikâyesi' },
  { id: 'drives', label: 'Güdüler' },
  { id: 'abilities', label: 'Yetenekler' },
  { id: 'inventory', label: 'Envanter' },
  { id: 'info', label: 'Bilgiler' },
];

/**
 * Seçili karakterin kendi penceresi: harita üzerinde yüzen, sürüklenebilir.
 * Karakteri ilgilendiren her şey burada; genel bilgiler sağ panelde kalır.
 */
export class CharacterWindow {
  constructor(container, world, selection) {
    this.world = world;
    this.selection = selection;
    this.person = null;
    this.activeTab = TABS[0].id;
    this.views = {};

    this.title = el('h3');
    this.followButton = el('button', { class: 'icon', title: 'Kamerayla takip et (F)', onClick: () => this.#toggleFollow() }, '🎥');
    this.header = el(
      'header',
      { onMouseDown: (e) => this.#startDrag(e) },
      this.title,
      this.followButton,
      el('button', { class: 'icon', title: 'Kapat (Esc)', onClick: () => selection.clear() }, '✕'),
    );
    this.activity = el('div', { class: 'activity' });
    this.needsSlot = el('div');
    this.tabButtons = TABS.map((tab) => el('button', { 'data-tab': tab.id, onClick: () => this.#showTab(tab.id) }, tab.label));
    this.body = el('div', { class: 'window-body', onMouseDown: (e) => this.#onLinkClick(e) });

    this.root = el(
      'section',
      { class: 'char-window hidden' },
      this.header,
      this.activity,
      this.needsSlot,
      el('nav', { class: 'tabs' }, this.tabButtons),
      this.body,
    );
    container.append(this.root);
    selection.subscribe((person) => this.#open(person));
  }

  #open(person) {
    this.person = person;
    this.root.classList.toggle('hidden', !person);
    if (!person) return;

    const needs = new NeedsView(person);
    this.views = {
      needs,
      history: new HistoryView(person, this.world),
      drives: new DrivesView(person),
      abilities: new AbilitiesView(person),
      inventory: new InventoryView(person),
      info: new InfoView(person),
    };
    this.needsSlot.replaceChildren(needs.root);
    this.#showTab(this.activeTab);
  }

  #showTab(tabId) {
    this.activeTab = tabId;
    this.tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    this.body.replaceChildren(this.views[tabId].root);
    this.update();
  }

  #toggleFollow() {
    if (this.person?.alive) this.selection.follow = !this.selection.follow;
  }

  /** Akraba adlarına tıklayınca o kişinin penceresine geçilir (ölmüş olsa bile). */
  #onLinkClick(e) {
    const link = e.target.closest('[data-id]');
    if (!link) return;
    const person = this.world.findPersonById(Number(link.dataset.id));
    if (person) this.selection.select(person, { follow: person.alive && this.selection.follow });
  }

  #startDrag(e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const startX = e.clientX - this.root.offsetLeft;
    const startY = e.clientY - this.root.offsetTop;
    const parent = this.root.parentElement;
    const onMove = (ev) => {
      const maxX = parent.clientWidth - this.root.offsetWidth;
      const maxY = parent.clientHeight - 40;
      this.root.style.left = `${Math.min(maxX, Math.max(0, ev.clientX - startX))}px`;
      this.root.style.top = `${Math.min(maxY, Math.max(0, ev.clientY - startY))}px`;
      this.root.style.right = 'auto';
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  update() {
    const p = this.person;
    if (!p) return;

    const stage = p.isChild ? 'çocuk' : p.ageYears >= 60 ? 'yaşlı' : 'yetişkin';
    this.title.textContent = `${p.sex.symbol} ${p.fullName} · ${p.age} yaş (${stage})${p.alive ? '' : ' ✝'}`;
    this.title.style.color = p.sex.color;
    this.followButton.classList.toggle('active', this.selection.follow);
    this.activity.textContent = p.alive
      ? `${p.currentDrive ? `[${p.currentDrive.name}] ` : ''}${p.activity}`
      : `${p.age} yaşında öldü: ${p.causeOfDeath}`;

    this.views.needs.update();
    this.views[this.activeTab].update();
  }
}
