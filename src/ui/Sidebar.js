import { CommunityPanel } from './CommunityPanel.js';
import { el } from './dom.js';
import { EventLogView } from './EventLogView.js';
import { FamilyPanel } from './FamilyPanel.js';
import { PopulationList } from './PopulationList.js';
import { TimeControls } from './TimeControls.js';

/** Sağ panel: üstte zaman, altında sekmeler halinde nüfus / aileler / olaylar. */
export class Sidebar {
  constructor(container, game) {
    this.world = game.world;
    this.timeControls = new TimeControls(game);
    this.tabs = [
      { id: 'population', view: new PopulationList(game.world, game.selection, (details) => game.addPerson(details)), label: () => `Nüfus (${this.world.people.length})` },
      { id: 'families', view: new FamilyPanel(game.world, game.selection, game.camera), label: () => `Aileler (${this.world.social.families.families.length})` },
      { id: 'communities', view: new CommunityPanel(game.world, game.selection), label: () => `Topluluklar (${this.world.social.groups.groups.length})` },
      { id: 'events', view: new EventLogView(game.log), label: () => 'Olaylar' },
    ];
    for (const tab of this.tabs) tab.button = el('button', { onClick: () => this.#showTab(tab) });
    this.body = el('div', { class: 'tab-body' });
    const panel = el('section', { class: 'panel sidebar-tabs' }, el('nav', { class: 'list-tabs' }, this.tabs.map((t) => t.button)), this.body);
    container.append(this.timeControls.root, panel);
    this.#showTab(this.tabs[0]);
  }

  #showTab(tab) {
    this.activeTab = tab;
    this.tabs.forEach((t) => t.button.classList.toggle('active', t === tab));
    this.body.replaceChildren(tab.view.root);
    this.update();
  }

  update() {
    this.timeControls.update();
    for (const tab of this.tabs) tab.button.textContent = tab.label();
    this.activeTab.view.update?.();
  }
}
