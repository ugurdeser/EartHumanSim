import { el, startWindowDrag } from '../dom.js';
import { AbilitiesView } from './AbilitiesView.js';
import { CapabilitiesView } from './CapabilitiesView.js';
import { DrivesView } from './DrivesView.js';
import { HistoryView } from './HistoryView.js';
import { HomeView } from './HomeView.js';
import { InfoView } from './InfoView.js';
import { InventoryView } from './InventoryView.js';
import { NeedsView } from './NeedsView.js';
import { RelationsView } from './RelationsView.js';

const TABS = [
  { id: 'history', label: 'Hayat Hikâyesi' },
  { id: 'drives', label: 'Güdüler' },
  { id: 'abilities', label: 'Yetenekler' },
  { id: 'capabilities', label: 'Kabiliyetler' },
  { id: 'relations', label: 'İlişkiler' },
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
    this.homeButton = el('button', { class: 'icon', title: 'Yuva bilgileri', onClick: () => this.#toggleHome() }, '🏠');
    this.header = el(
      'header',
      { onMouseDown: (e) => startWindowDrag(e, this.root) },
      this.title,
      this.followButton,
      this.homeButton,
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
      capabilities: new CapabilitiesView(person),
      inventory: new InventoryView(person),
      info: new InfoView(person, this.world),
      relations: new RelationsView(person, this.world),
      home: new HomeView(() => person.home),
    };
    this.needsSlot.replaceChildren(needs.root);
    this.#showTab(this.activeTab);
  }

  #showTab(tabId) {
    this.activeTab = tabId;
    this.tabButtons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    this.homeButton.classList.toggle('active', tabId === 'home');
    this.body.replaceChildren(this.views[tabId].root);
    this.update();
  }

  /** Ev butonu yuva görünümünü açar; tekrar basınca önceki sekmeye dönülür. */
  #toggleHome() {
    if (this.activeTab === 'home') {
      this.#showTab(this.tabBeforeHome ?? TABS[0].id);
      return;
    }
    this.tabBeforeHome = this.activeTab;
    this.#showTab('home');
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
