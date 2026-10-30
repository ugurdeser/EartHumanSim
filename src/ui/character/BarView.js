import { el, percent } from '../dom.js';

/** Etiket + ilerleme çubuğu + değer satırı. */
export class BarView {
  constructor(label, kind) {
    this.fill = el('div', { class: 'fill' });
    this.value = el('span', { class: 'value' });
    this.row = el('div', { class: `bar-row ${kind}` }, el('span', { class: 'label', text: label }), el('div', { class: 'bar' }, this.fill), this.value);
  }

  set(ratio, text) {
    this.fill.style.width = percent(Math.max(0, Math.min(1, ratio)));
    this.value.textContent = text;
  }
}
