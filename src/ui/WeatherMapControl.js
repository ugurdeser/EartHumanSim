import { Overlay } from '../render/WeatherMaps.js';
import { el } from './dom.js';

const CHOICES = [Overlay.TEMPERATURE, Overlay.WIND, Overlay.RAIN, Overlay.PRESSURE, Overlay.HUMIDITY, Overlay.CLOUDS, Overlay.ELEVATION];
const ICONS = { temperature: '🌡️', wind: '💨', rain: '🌧️', pressure: '🧭', humidity: '💧', clouds: '☁️', elevation: '⛰️' };

/**
 * Haritanın sol üstünde "Hava haritası" düğmesi: tıklayınca katman seçenekleri açılır,
 * seçilen katman haritanın üstüne boyanır; aynısına yeniden basınca kapanır.
 */
export class WeatherMapControl {
  constructor(toolbar, settings) {
    this.settings = settings;
    this.button = el('button', { onClick: () => this.#togglePanel() });
    this.choices = new Map(
      CHOICES.map((overlay) => [overlay.id, el('button', { text: `${ICONS[overlay.id]} ${overlay.label}`, onClick: () => this.#choose(overlay) })]),
    );
    this.panel = el('div', { class: 'weather-map-panel hidden' }, ...this.choices.values());
    toolbar.append(el('div', { class: 'weather-map-control' }, this.button, this.panel));
    settings.onChange((key) => key === 'overlay' && this.#sync());
    this.#sync();
  }

  #togglePanel() {
    this.panel.classList.toggle('hidden');
  }

  #choose(overlay) {
    const off = this.settings.overlay === overlay.id;
    this.settings.set('overlay', off ? Overlay.NONE.id : overlay.id);
    this.panel.classList.add('hidden');
  }

  #sync() {
    const active = CHOICES.find((o) => o.id === this.settings.overlay);
    this.button.textContent = active ? `${ICONS[active.id]} ${active.label} haritası` : '🌡️ Hava haritası';
    this.button.classList.toggle('active', Boolean(active));
    for (const [id, choice] of this.choices) choice.classList.toggle('active', id === this.settings.overlay);
  }
}
