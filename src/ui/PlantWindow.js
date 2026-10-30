import { el, formatAge, startWindowDrag } from './dom.js';
import { BarView } from './character/BarView.js';

/** Tıklanan bitkinin penceresi: yaşı, büyümesi, verimi ve genleri. */
export class PlantWindow {
  constructor(container, world, selection) {
    this.world = world;
    this.selection = selection;
    this.plant = null;
    this.genes = [];

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
      el('div', { class: 'window-body' }, this.info, el('h4', { text: 'Genler' }), this.genesSlot),
    );
    container.append(this.root);
    selection.subscribe(() => this.#open(selection.plant));
  }

  #open(plant) {
    this.plant = plant;
    this.root.classList.toggle('hidden', !plant);
    if (!plant) return;
    this.genes = plant.genome.entries().map((gene) => ({ id: gene.id, bar: new BarView(gene.name, 'trait') }));
    this.genesSlot.replaceChildren(...this.genes.map((g) => g.bar.row));
    this.update();
  }

  update() {
    const plant = this.plant;
    if (!plant) return;
    this.title.textContent = plant.displayName;
    this.status.textContent = !plant.alive
      ? 'Artık yok: kurudu ya da kesildi'
      : plant.isMature
        ? 'Yetişkin'
        : `Büyüyor %${Math.round(plant.growth * 100)}`;

    const rows = [
      ['Yaş', formatAge(plant.ageYears)],
      ['Beklenen ömür', formatAge(plant.lifespan)],
      ['Boy', `${(plant.radius * 2).toFixed(1)} m çap`],
    ];
    if (plant.capacity > 0) rows.push(['Verim', `${plant.food.icon} ${plant.food.name} ${plant.available(this.world.now)}/${plant.capacity}`]);
    if (plant.forage > 0) rows.push(['Otlak değeri', `%${Math.round(plant.forage * 100)}`]);
    this.info.replaceChildren(...rows.flatMap(([key, value]) => [el('dt', { text: key }), el('dd', { text: value })]));

    for (const { id, bar } of this.genes) {
      const value = plant.genome.get(id);
      bar.set(value, `%${Math.round(value * 100)}`);
    }
  }
}
