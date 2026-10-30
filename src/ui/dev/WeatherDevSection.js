import { HOUR } from '../../config.js';
import { WeatherType } from '../../weather/WeatherType.js';
import { el, percent } from '../dom.js';

const WEATHERS = Object.values(WeatherType);
const MAX_MOISTURE = 0.6;

const formatHours = (seconds) => {
  if (!Number.isFinite(seconds)) return 'sabit';
  const hours = seconds / HOUR;
  return hours < 1 ? `${Math.round(hours * 60)} dk` : `${hours.toFixed(1)} sa`;
};

/** Geliştirici panelinde havayı izleme ve değiştirme bölümü. */
export class WeatherDevSection {
  constructor(weather) {
    this.weather = weather;
    this.title = '🌦️ Hava durumu';

    this.info = el('dl', { class: 'info' });
    this.buttons = new Map(WEATHERS.map((type) => [type, el('button', { title: type.name, onClick: () => this.#apply(type) }, `${type.icon} ${type.name}`)]));
    this.hours = el('input', { type: 'number', min: '0.5', step: '0.5', placeholder: 'kendiliğinden' });
    this.lock = el('input', { type: 'checkbox', onChange: () => weather.setLocked(this.lock.checked) });
    this.next = el(
      'select',
      { onChange: () => weather.setNext(WEATHERS.find((t) => t.id === this.next.value)) },
      WEATHERS.map((type) => el('option', { value: type.id }, `${type.icon} ${type.name}`)),
    );
    this.snow = this.#slider(1, (value) => weather.setSnowCover(value));
    this.moisture = this.#slider(MAX_MOISTURE, (value) => weather.setMoisture(value));

    this.root = el(
      'div',
      { class: 'dev-weather' },
      this.info,
      el('h4', { text: 'Havayı değiştir' }),
      el('div', { class: 'dev-buttons' }, [...this.buttons.values()]),
      el('label', { class: 'dev-row' }, 'Süre (saat)', this.hours),
      el('label', { class: 'dev-row' }, 'Havayı sabitle', this.lock),
      el('label', { class: 'dev-row' }, 'Sıradaki hava', this.next),
      el('h4', { text: 'Zemin' }),
      el('label', { class: 'dev-row' }, 'Kar örtüsü', this.snow),
      el('label', { class: 'dev-row' }, 'Toprak nemi', this.moisture),
    );
  }

  #slider(max, onInput) {
    const input = el('input', { type: 'range', min: '0', max: String(max), step: String(max / 100) });
    input.addEventListener('input', () => onInput(Number(input.value)));
    return input;
  }

  #apply(type) {
    const hours = Number(this.hours.value);
    this.weather.force(type, hours > 0 ? hours : null);
    this.update();
  }

  /** Kullanıcı elle değiştirirken kontrolün değerini ezme. */
  static #sync(input, value) {
    if (document.activeElement !== input) input.value = value;
  }

  update() {
    const w = this.weather;
    const rows = [
      ['Şu an', `${w.current.icon} ${w.current.name} · güç ${percent(w.intensity)}`],
      ['Kalan süre', formatHours(w.remaining)],
      ['Sıradaki', `${w.next.icon} ${w.next.name}`],
      ['Sıcaklık', `${w.temperature.toFixed(1)}°C (açıkta ${w.exposedTemperature.toFixed(1)}°C)`],
      ['Yağış', percent(w.precipitation)],
      ['Kar örtüsü', percent(w.snowCover)],
      ['Toprak nemi', w.moisture.toFixed(2)],
      ['Büyüme / hareket', `×${w.growthFactor.toFixed(2)} / ×${w.moveFactor.toFixed(2)}`],
      ['Sığınma isteği', percent(w.shelterUrge)],
    ];
    this.info.replaceChildren(...rows.flatMap(([key, value]) => [el('dt', { text: key }), el('dd', { text: value })]));
    for (const [type, button] of this.buttons) button.classList.toggle('active', type === w.current);
    this.lock.checked = w.locked;
    WeatherDevSection.#sync(this.next, w.next.id);
    WeatherDevSection.#sync(this.snow, w.snowCover);
    WeatherDevSection.#sync(this.moisture, w.moisture);
  }
}
