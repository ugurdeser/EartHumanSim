import { LinkKind, NodeKind, ProductionGraph } from '../tech/ProductionGraph.js';
import { el, startWindowDrag } from './dom.js';
import { FlowDiagram } from './FlowDiagram.js';

const MODES = Object.freeze({
  materials: {
    label: '🪵 Hammaddeler',
    title: 'Hammaddeler: neye dönüşüyor?',
    sections: (graph) => [
      ['Malzemeler', graph.ofKind(NodeKind.MATERIAL)],
      ['Yiyecekler', graph.ofKind(NodeKind.FOOD)],
      ['Doğa', graph.ofKind(NodeKind.NATURE)],
    ],
  },
  technology: {
    label: '💡 Teknoloji',
    title: 'Teknoloji: ne gerekiyor, neyi açıyor?',
    sections: (graph) => graph.technologyGroups(),
  },
});

const LEGEND = [
  [LinkKind.INPUT, 'Harcanan malzeme'],
  [LinkKind.TOOL, 'Gereken alet'],
  [LinkKind.KNOWLEDGE, 'Gereken bilgi'],
  [LinkKind.NATURE, 'Doğadan'],
];

/** Sol üstteki iki buton ve üretim zinciri penceresi: listeden seçilenin diyagramını gösterir. */
export class ProductionWindow {
  constructor(container) {
    this.graph = new ProductionGraph();
    this.mode = null;
    this.diagram = new FlowDiagram(this.graph, (id) => this.#pick(id));

    this.buttons = new Map(
      Object.entries(MODES).map(([id, mode]) => [id, el('button', { text: mode.label, onClick: () => this.#toggle(id) })]),
    );
    this.title = el('h3');
    this.list = el('nav', { class: 'production-list' });
    this.root = el(
      'section',
      { class: 'char-window production hidden' },
      el(
        'header',
        { onMouseDown: (e) => startWindowDrag(e, this.root) },
        this.title,
        el('button', { class: 'icon', title: 'Kapat (Esc)', onClick: () => this.#close() }, '✕'),
      ),
      el(
        'div',
        { class: 'production-body' },
        this.list,
        el(
          'div',
          { class: 'production-main' },
          this.diagram.root,
          el('div', { class: 'flow-legend' }, LEGEND.map(([kind, text]) => el('span', {}, el('i', { class: `flow-swatch ${kind}` }), text))),
        ),
      ),
    );
    container.append(el('div', { class: 'top-buttons' }, ...this.buttons.values()), this.root);
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') this.#close();
    });
  }

  #toggle(id) {
    if (this.mode === id) this.#close();
    else this.#open(id);
  }

  #close() {
    this.mode = null;
    this.root.classList.add('hidden');
    this.#markButtons();
  }

  #open(id) {
    const mode = MODES[id];
    this.mode = id;
    this.title.textContent = mode.title;
    this.root.classList.remove('hidden');
    this.#markButtons();

    const sections = mode.sections(this.graph);
    this.list.replaceChildren(
      ...sections.map(([name, nodes]) =>
        el(
          'details',
          { open: '' },
          el('summary', {}, `${name} (${nodes.length})`),
          nodes.map((node) => el('button', { 'data-pick': node.id, text: `${node.icon} ${node.name}`, onClick: () => this.#pick(node.id) })),
        ),
      ),
    );
    this.#pick(sections[0][1][0].id);
  }

  #markButtons() {
    for (const [id, button] of this.buttons) button.classList.toggle('active', id === this.mode);
  }

  #pick(id) {
    this.diagram.show(id);
    for (const button of this.list.querySelectorAll('button')) button.classList.toggle('active', button.dataset.pick === id);
  }
}
