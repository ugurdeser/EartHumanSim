import { el, percent } from '../dom.js';
import { BarView } from './BarView.js';

const NEED_LABELS = [
  ['food', 'Tokluk'],
  ['water', 'Su'],
  ['energy', 'Enerji'],
  ['warmth', 'Sıcaklık'],
  ['health', 'Sağlık'],
];

export class NeedsView {
  constructor(person) {
    this.person = person;
    this.bars = new Map(NEED_LABELS.map(([key, label]) => [key, new BarView(label, 'need')]));
    this.root = el('div', { class: 'needs' }, [...this.bars.values()].map((b) => b.row));
  }

  update() {
    for (const [key, bar] of this.bars) bar.set(this.person.needs[key], percent(this.person.needs[key]));
  }
}
