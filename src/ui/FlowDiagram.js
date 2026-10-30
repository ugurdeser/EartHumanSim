import { LinkKind } from '../tech/ProductionGraph.js';
import { el } from './dom.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const NODE_W = 176;
const NODE_H = 46;
const GAP_Y = 12;
const STEP = NODE_W + 76;
const PAD = 16;

const svg = (tag, attrs = {}, ...children) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  node.append(...children);
  return node;
};

/** Ortada seçilen şey, solda ona götüren zincir, sağda ondan çıkanlar. Düğüme tıklayınca ona geçilir. */
export class FlowDiagram {
  constructor(graph, onPick) {
    this.graph = graph;
    this.root = el('div', {
      class: 'flow',
      onClick: (e) => {
        const node = e.target.closest('[data-node]');
        if (node) onPick(node.dataset.node);
      },
    });
  }

  show(id) {
    this.root.replaceChildren(this.#draw(this.graph.nodes.get(id)));
    this.root.scrollTo(0, 0);
  }

  /** Bir yönün ağacı; aynı dalda tekrar eden düğüm izlenmez. */
  #grow(node, linksOf, path = new Set()) {
    const seen = new Set(path).add(node.id);
    const children = linksOf(node.id)
      .filter((link) => !seen.has(link.node.id))
      .map((link) => ({ ...this.#grow(link.node, linksOf, seen), link }));
    const stacked = children.reduce((sum, c) => sum + c.height + GAP_Y, -GAP_Y);
    return {
      node,
      children,
      stacked,
      height: Math.max(NODE_H, stacked),
      depth: 1 + Math.max(0, ...children.map((c) => c.depth)),
    };
  }

  /** Dalın çocuklarını `dir` yönündeki sütuna dizer; soldakiler akışa göre kaynaktır. */
  #place(box, branch, dir, out) {
    let top = box.y + NODE_H / 2 - branch.stacked / 2;
    for (const child of branch.children) {
      const childBox = { node: child.node, x: box.x + dir * STEP, y: top + child.height / 2 - NODE_H / 2 };
      out.boxes.push(childBox);
      out.edges.push({ from: dir < 0 ? childBox : box, to: dir < 0 ? box : childBox, link: child.link });
      this.#place(childBox, child, dir, out);
      top += child.height + GAP_Y;
    }
  }

  #draw(node) {
    const before = this.#grow(node, (id) => this.graph.needs(id));
    const after = this.#grow(node, (id) => this.graph.uses(id));
    const height = Math.max(before.height, after.height) + PAD * 2;
    const width = (before.depth + after.depth - 1) * STEP - (STEP - NODE_W) + PAD * 2;

    const root = { node, x: PAD + (before.depth - 1) * STEP, y: height / 2 - NODE_H / 2, isRoot: true };
    const out = { boxes: [root], edges: [] };
    this.#place(root, before, -1, out);
    this.#place(root, after, 1, out);

    return svg(
      'svg',
      { width, height, viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': `${node.name} üretim zinciri` },
      FlowDiagram.#markers(),
      ...out.edges.map((edge) => FlowDiagram.#edge(edge)),
      ...out.boxes.map((box) => FlowDiagram.#box(box)),
    );
  }

  static #markers() {
    return svg(
      'defs',
      {},
      ...Object.values(LinkKind).map((kind) =>
        svg(
          'marker',
          { id: `flow-arrow-${kind}`, viewBox: '0 0 8 8', refX: 7, refY: 4, markerWidth: 7, markerHeight: 7, orient: 'auto' },
          svg('path', { d: 'M0 0 L8 4 L0 8 Z', class: `flow-arrow ${kind}` }),
        ),
      ),
    );
  }

  static #edge({ from, to, link }) {
    const x1 = from.x + NODE_W;
    const y1 = from.y + NODE_H / 2;
    const x2 = to.x;
    const y2 = to.y + NODE_H / 2;
    const mid = (x1 + x2) / 2;
    const label = svg('text', { x: mid, y: (y1 + y2) / 2 - 3, class: 'flow-label' });
    label.textContent = link.label;
    return svg(
      'g',
      {},
      svg('path', { d: `M${x1} ${y1} C${mid} ${y1} ${mid} ${y2} ${x2} ${y2}`, class: `flow-edge ${link.kind}`, 'marker-end': `url(#flow-arrow-${link.kind})` }),
      label,
    );
  }

  static #box({ node, x, y, isRoot }) {
    const name = svg('text', { x: x + 10, y: y + (node.detail ? 19 : 28), class: 'flow-name' });
    name.textContent = `${node.icon} ${node.name}`;
    const detail = svg('text', { x: x + 10, y: y + 35, class: 'flow-detail' });
    detail.textContent = node.detail;
    return svg(
      'g',
      { 'data-node': node.id, class: `flow-node ${node.kind}${isRoot ? ' root' : ''}` },
      svg('rect', { x, y, width: NODE_W, height: NODE_H, rx: 7 }),
      name,
      detail,
    );
  }
}
