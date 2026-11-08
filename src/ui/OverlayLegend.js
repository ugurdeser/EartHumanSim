import { el } from './dom.js';

/** Hava katmanı açıkken haritanın köşesinde renklerin anlamı. */
export class OverlayLegend {
  constructor(container, maps) {
    this.maps = maps;
    this.title = el('div', { class: 'overlay-title' });
    this.scale = el('div', { class: 'overlay-scale' });
    this.root = el('div', { class: 'overlay-legend hidden' }, this.title, this.scale);
    this.shown = null;
    container.append(this.root);
  }

  update() {
    const overlay = this.maps.overlay;
    this.root.classList.toggle('hidden', overlay.id === 'none');
    if (overlay === this.shown) return;
    this.shown = overlay;
    this.title.textContent = `${overlay.label} (${overlay.unit ?? ''})`;
    this.scale.replaceChildren(...this.maps.legend().map(({ value, color }) => el('span', { style: { background: color }, text: String(value) })));
  }
}
