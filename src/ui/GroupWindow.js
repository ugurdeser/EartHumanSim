import { DAY } from '../config.js';
import { Items } from '../items/Items.js';
import { ALL_TECHNOLOGIES } from '../tech/Technologies.js';
import { InfoView } from './character/InfoView.js';
import { CommunityPanel } from './CommunityPanel.js';
import { el, percent, startWindowDrag } from './dom.js';

const MATERIALS = [Items.BRANCH, Items.WOOD, Items.STONE, Items.FLINT, Items.CLAY, Items.HIDE, Items.WOOL];

/** Seçilen topluluğun penceresi: lideri, emri, üyeleri, ortak erzakı ve bildiği teknolojiler. */
export class GroupWindow {
  constructor(container, world, selection) {
    this.world = world;
    this.selection = selection;
    this.group = null;

    this.title = el('h3');
    this.status = el('div', { class: 'activity' });
    this.info = el('dl', { class: 'info' });
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
      el('div', { class: 'window-body', onMouseDown: (e) => this.#onLinkClick(e) }, this.info),
    );
    container.append(this.root);
    selection.subscribe(() => this.#open(selection.group));
  }

  #open(group) {
    this.group = group;
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
    const known = ALL_TECHNOLOGIES.filter((t) => group.knows(t)).map((t) => t.name);
    const materials = MATERIALS.filter((t) => stock.count(t) > 0).map((t) => `${t.icon} ${t.name} ${stock.count(t)}`);
    const members = [...group.members].flatMap((m, i) => [i > 0 ? ', ' : null, m === leader ? '👑 ' : null, InfoView.link(m, ` (${m.age})`)]);
    const rows = [
      ['Lider', leader ? [InfoView.link(leader, ` (${leader.age})`), ` · liderlik ${percent(leader.skills.get('leadership'))}`] : '—'],
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
  }
}
