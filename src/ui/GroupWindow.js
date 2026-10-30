import { DAY } from '../config.js';
import { Items } from '../items/Items.js';
import { GROUP_CHAPTERS } from '../society/GroupHistory.js';
import { ALL_TECHNOLOGIES } from '../tech/Technologies.js';
import { ChapterList } from './ChapterList.js';
import { FlagPainter } from '../render/FlagPainter.js';
import { Flag } from '../society/Flag.js';
import { InfoView } from './character/InfoView.js';
import { CommunityPanel } from './CommunityPanel.js';
import { el, percent, startWindowDrag } from './dom.js';

const FLAG_DOT = 10;
const MATERIALS = [Items.BRANCH, Items.WOOD, Items.STONE, Items.FLINT, Items.CLAY, Items.HIDE, Items.WOOL];

/** Seçilen topluluğun penceresi: bilgileri (lider, emir, üyeler, erzak) ve bölümlü hikâyesi. */
export class GroupWindow {
  constructor(container, world, selection) {
    this.world = world;
    this.selection = selection;
    this.group = null;

    this.title = el('h3');
    this.badge = el('span', { class: 'flag-slot' });
    this.status = el('div', { class: 'activity' });
    this.info = el('dl', { class: 'info' });
    this.story = new ChapterList('Henüz yazılacak bir olay yok.');
    this.flagCanvas = el('canvas', { class: 'flag', width: String(Flag.width * FLAG_DOT), height: String(Flag.height * FLAG_DOT) });
    this.laws = el('dl', { class: 'info' });
    this.drawnFlag = null;
    this.lastEntry = undefined;
    this.tabs = [
      { id: 'info', button: el('button', { text: 'Bilgiler', onClick: () => this.#showTab(this.tabs[0]) }), view: this.info },
      { id: 'laws', button: el('button', { text: 'Bayrak ve Yasalar', onClick: () => this.#showTab(this.tabs[1]) }), view: el('div', {}, this.flagCanvas, el('p', { class: 'hint', 'data-flag': '' }), this.laws) },
      { id: 'story', button: el('button', { text: 'Topluluk Hikâyesi', onClick: () => this.#showTab(this.tabs[2]) }), view: this.story.root },
    ];
    this.body = el('div', { class: 'window-body', onMouseDown: (e) => this.#onLinkClick(e) });
    this.root = el(
      'section',
      { class: 'char-window hidden' },
      el(
        'header',
        { onMouseDown: (e) => startWindowDrag(e, this.root) },
        this.badge,
        this.title,
        el('button', { class: 'icon', title: 'Kapat (Esc)', onClick: () => selection.clear() }, '✕'),
      ),
      this.status,
      el('nav', { class: 'tabs' }, this.tabs.map((tab) => tab.button)),
      this.body,
    );
    this.#showTab(this.tabs[0]);
    container.append(this.root);
    selection.subscribe(() => this.#open(selection.group));
  }

  #showTab(tab) {
    for (const { button } of this.tabs) button.classList.toggle('active', button === tab.button);
    this.body.replaceChildren(tab.view);
  }

  #updateLaws(group) {
    const { flag } = group;
    const stamp = flag ? flag.description : '';
    if (stamp !== this.drawnFlag) {
      this.drawnFlag = stamp;
      const ctx = this.flagCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.flagCanvas.width, this.flagCanvas.height);
      if (flag) FlagPainter.draw(ctx, flag, 0, 0, FLAG_DOT);
      this.badge.replaceChildren(...[CommunityPanel.flagBadge(group)].filter(Boolean));
      this.flagCanvas.nextSibling.textContent = flag ? `Bayrak: ${flag.description}` : 'Topluluk henüz bayrağını çizmedi';
    }
    this.laws.replaceChildren(...group.constitution.entries().flatMap(({ law, option }) => [el('dt', { text: law.name }), el('dd', { text: option.name })]));
  }

  #updateStory(group) {
    const { history } = group;
    if (history.latest === this.lastEntry) return;
    this.lastEntry = history.latest;
    this.story.render(GROUP_CHAPTERS.map(({ id, name, logType }) => ({ id, name, logType, items: [...history.entriesOf(GROUP_CHAPTERS.find((c) => c.id === id))].reverse() })));
  }

  #open(group) {
    this.group = group;
    this.lastEntry = undefined;
    this.drawnFlag = null;
    this.root.classList.toggle('hidden', !group);
    this.update();
  }

  #onLinkClick(e) {
    const link = e.target.closest('[data-id]');
    if (!link) return;
    const person = this.world.findPersonById(Number(link.dataset.id));
    if (person) this.selection.select(person);
  }

  #days(time) {
    return `${Math.max(0, Math.ceil((time - this.world.now) / DAY))} gün sonra`;
  }

  static #list(values) {
    return values.length ? values.join(', ') : '—';
  }

  update() {
    const group = this.group;
    if (!group) return;
    const { leader, stock } = group;
    const adults = group.adults;
    const founders = group.founders.map((f) => (f.alive ? f.name : `${f.name} ✝`)).join(' ve ');
    const known = ALL_TECHNOLOGIES.filter((t) => group.knows(t)).map((t) => t.name);
    const materials = MATERIALS.filter((t) => stock.count(t) > 0).map((t) => `${t.icon} ${t.name} ${stock.count(t)}`);
    const members = [...group.members].flatMap((m, i) => [i > 0 ? ', ' : null, m === leader ? '👑 ' : null, InfoView.link(m, ` (${m.age})`)]);
    const rows = [
      ['Lider', leader ? [InfoView.link(leader, ` (${leader.age})`), ` · liderlik ${percent(leader.skills.get('leadership'))}`] : '—'],
      ['Kurucular', founders || '—'],
      ['Çocuk bakıcısı', group.nanny ? InfoView.link(group.nanny, ` (${group.nanny.age})`) : '—'],
      ['Sonraki seçim', leader ? this.#days(group.nextElection) : 'Lider bekleniyor'],
      ['Sonraki karar', leader ? this.#days(group.nextOrder) : '—'],
      ['Üyeler', members],
      ['Nüfus', `${adults.length} yetişkin · ${group.size - adults.length} çocuk · ${stock.homes} yuva`],
      ['Yiyecek', `${stock.food} adet`],
      ['Yakacak', `${(stock.fuelSeconds / DAY).toFixed(1)} gün yetecek kadar`],
      ['Malzeme', GroupWindow.#list(materials)],
      ['Bölüşülecek', GroupWindow.#list(group.pot.entries().map((e) => `${e.type.icon} ${e.type.name} ${e.count}`))],
      ['Köy merkezi', `${Math.round(group.center.x)}, ${Math.round(group.center.y)}`],
      ['Teknolojiler', GroupWindow.#list(known)],
      ['Düşmanlar', GroupWindow.#list([...group.rivals].map((g) => g.name))],
      ['Sürgünler', GroupWindow.#list([...group.banned].map((p) => p.name))],
    ];
    const active = this.world.social.groups.groups.includes(group);
    this.title.textContent = group.name;
    this.title.style.color = group.color;
    this.status.textContent = active ? CommunityPanel.orderText(group) : 'Bu topluluk dağıldı';
    this.info.replaceChildren(...rows.flatMap(([key, value]) => [el('dt', { text: key }), el('dd', {}, value)]));
    this.#updateLaws(group);
    this.#updateStory(group);
  }
}
