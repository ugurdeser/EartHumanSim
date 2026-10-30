import { DAY } from '../config.js';
import { el, formatAge, startWindowDrag } from './dom.js';
import { BarView } from './character/BarView.js';

const NEEDS = [
  ['food', 'Tokluk'],
  ['water', 'Su'],
  ['health', 'Sağlık'],
];

/** Tıklanan hayvanın penceresi: ne yaptığı, ihtiyaçları, sürüsü, ürünleri ve genleri. */
export class AnimalWindow {
  constructor(container, world, selection) {
    this.world = world;
    this.selection = selection;
    this.animal = null;
    this.genes = [];
    this.needs = NEEDS.map(([id, label]) => ({ id, bar: new BarView(label, 'need') }));

    this.title = el('h3');
    this.status = el('div', { class: 'activity' });
    this.info = el('dl', { class: 'info' });
    this.genesSlot = el('div');
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
      el('div', { class: 'needs' }, this.needs.map((n) => n.bar.row)),
      el('div', { class: 'window-body' }, this.info, el('h4', { text: 'Genler' }), this.genesSlot),
    );
    container.append(this.root);
    selection.subscribe(() => this.#open(selection.animal));
  }

  #open(animal) {
    this.animal = animal;
    this.root.classList.toggle('hidden', !animal);
    if (!animal) return;
    this.genes = animal.genome.entries().map((gene) => ({ id: gene.id, bar: new BarView(gene.name, 'trait') }));
    this.genesSlot.replaceChildren(...this.genes.map((g) => g.bar.row));
    this.update();
  }

  /** Canlı hayvandan alınabilen ürünler: yün 3, süt 1 ... */
  static #stockText(animal) {
    const stocks = animal.products.list.filter((p) => p.stock !== undefined);
    return stocks.length ? stocks.map((p) => `${p.item.icon} ${p.item.name} ${p.available()}`).join(', ') : '—';
  }

  static #yieldText(animal) {
    const yields = animal.slaughterYields();
    return yields.length ? yields.map(({ type, amount }) => `${type.icon} ${type.name} ${amount.toFixed(1)}`).join(', ') : '—';
  }

  #stateText(animal) {
    const { now } = this.world;
    if (animal.reproduction.isPregnant) return `Gebe (${Math.ceil((animal.reproduction.pregnancy.due - now) / DAY)} gün kaldı)`;
    if (animal.reproduction.isLactating(now)) return 'Emziriyor';
    return animal.isYoung ? 'Yavru' : 'Yetişkin';
  }

  static #traitsText({ species }) {
    const traits = [species.dangerous ? 'Tehlikeli' : null, species.huntable ? 'Avlanabilir' : null, species.domesticable ? 'Evcilleştirilebilir' : 'Evcilleşmez'];
    return traits.filter(Boolean).join(' · ');
  }

  update() {
    const animal = this.animal;
    if (!animal) return;
    this.title.textContent = animal.displayName;
    this.status.textContent = animal.alive ? animal.activity : `Öldü (${animal.causeOfDeath})`;

    const rows = [
      ['Tür', animal.species.name],
      ['Cinsiyet', animal.isFemale ? 'Dişi' : 'Erkek'],
      ['Yaş', formatAge(animal.ageYears)],
      ['Durum', this.#stateText(animal)],
      ['Sürü', animal.herd ? `${animal.herd.size} hayvan` : 'Yalnız'],
      ['Annesi', animal.mother ? (animal.mother.alive ? 'Yaşıyor' : 'Öldü') : 'Bilinmiyor'],
      ['Özellikler', AnimalWindow.#traitsText(animal)],
      ['Ürünleri', AnimalWindow.#stockText(animal)],
      ['Avlanınca', AnimalWindow.#yieldText(animal)],
    ];
    this.info.replaceChildren(...rows.flatMap(([key, value]) => [el('dt', { text: key }), el('dd', { text: value })]));

    for (const { id, bar } of this.needs) {
      const value = animal.needs[id];
      bar.set(value, `%${Math.round(value * 100)}`);
    }
    for (const { id, bar } of this.genes) {
      const value = animal.genome.get(id);
      bar.set(value, `%${Math.round(value * 100)}`);
    }
  }
}
