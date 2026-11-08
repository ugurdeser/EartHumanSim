import { STAR } from '../../config.js';
import { PLANET_OPTIONS, PRESETS } from '../../world/PlanetSettings.js';
import { el } from '../dom.js';

const MAX_SEED = 1e9;
const MAX_POPULATION = 40;

/**
 * Başlangıç ekranının ayar paneli: şablonlar, arazi, iklim ve başlangıç. Her değişiklikte
 * `onChange()` çağrılır; panel yalnızca `planet` nesnesine yazar.
 */
export class PlanetForm {
  constructor(planet, onChange) {
    this.planet = planet;
    this.onChange = onChange;
    this.controls = []; // ayarlar dışarıdan (şablonla) değişince her denetim kendini tazeler

    this.presets = PRESETS.map((preset) => el('button', { text: preset.label, onClick: () => this.#applyPreset(preset) }));
    this.root = el(
      'div',
      { class: 'planet-form' },
      el('h3', { text: 'Hazır gezegenler' }),
      el('div', { class: 'preset-list' }, this.presets),
      el('h3', { text: 'Gezegen' }),
      this.#choice('size', 'Boyut'),
      this.#sizeHint(),
      el('h3', { text: 'Arazi' }),
      this.#seed(),
      this.#slider('seaShare', 'Deniz oranı', { min: 0.1, max: 0.85, step: 0.05, format: (v) => `%${Math.round(v * 100)}` }),
      this.#choice('continents', 'Kıtalar'),
      this.#choice('relief', 'Dağlık'),
      this.#choice('iceCaps', 'Kutup buzulları'),
      el('h3', { text: 'İklim' }),
      this.#choice('warmth', 'Genel sıcaklık'),
      this.#slider('obliquity', 'Eksen eğikliği', { min: 0, max: 45, step: 0.5, format: (v) => `${v}°` }),
      el('p', { class: 'hint', text: 'Eğiklik mevsimleri belirler: 0° mevsimsiz, Dünya 23,4°, büyüdükçe yazlar ve kışlar sertleşir.' }),
      this.#choice('wetness', 'Nem ve yağış'),
      this.#choice('storms', 'Fırtınalar'),
      el('h3', { text: 'Başlangıç' }),
      this.#population(),
    );
  }

  #changed() {
    for (const sync of this.controls) sync();
    this.onChange();
  }

  #applyPreset(preset) {
    this.planet.applyPreset(preset);
    this.presets.forEach((button, i) => button.classList.toggle('active', PRESETS[i] === preset));
    this.#changed();
  }

  /** Elle değişiklik yapılınca hiçbir şablon seçili görünmez. */
  #manual() {
    this.presets.forEach((button) => button.classList.remove('active'));
    this.#changed();
  }

  #row(label, ...controls) {
    return el('label', { class: 'form-row' }, el('span', { class: 'form-label', text: label }), ...controls);
  }

  #seed() {
    const input = el('input', { type: 'number', min: '0', max: String(MAX_SEED), step: '1' });
    input.addEventListener('change', () => {
      this.planet.seed = Math.max(0, Math.floor(Number(input.value) || 0));
      this.#manual();
    });
    const dice = el('button', { class: 'dice', title: 'Rastgele tohum', onClick: () => {
      this.planet.seed = Math.floor(Math.random() * MAX_SEED);
      this.#manual();
    } }, '🎲');
    this.controls.push(() => (input.value = this.planet.seed));
    return this.#row('Tohum', el('div', { class: 'seed-row' }, input, dice));
  }

  #slider(key, label, { min, max, step, format }) {
    const value = el('span', { class: 'form-value' });
    const input = el('input', { type: 'range', min: String(min), max: String(max), step: String(step) });
    input.addEventListener('input', () => {
      this.planet[key] = Number(input.value);
      value.textContent = format(this.planet[key]);
      this.#manual();
    });
    this.controls.push(() => {
      input.value = this.planet[key];
      value.textContent = format(this.planet[key]);
    });
    return this.#row(label, input, value);
  }

  /** Seçenekler yan yana düğmeler. */
  #choice(key, label) {
    const options = Object.values(PLANET_OPTIONS[key]);
    const buttons = options.map((option) =>
      el('button', { text: option.label, title: option.hint ?? '', onClick: (e) => {
        e.preventDefault();
        this.planet[key] = option.id;
        this.#manual();
      } }),
    );
    this.controls.push(() => buttons.forEach((button, i) => button.classList.toggle('active', options[i].id === this.planet.option(key).id)));
    return this.#row(label, el('div', { class: 'segmented' }, buttons));
  }

  /** Seçilen boyun ölçüleri: çap, Güneş'in uzaklığı ve büyüklüğü (Dünya oranlarıyla). */
  #sizeHint() {
    const hint = el('p', { class: 'hint' });
    const km = (meters) => Math.round(meters / 1000).toLocaleString('tr-TR');
    this.controls.push(() => {
      const { circumference } = this.planet;
      const diameter = circumference / Math.PI;
      const real = this.planet.option('size').id === 'earth';
      hint.textContent =
        `Ekvator çevresi ${km(circumference)} km, çapı ${km(diameter)} km. Güneş ${km(diameter * STAR.DISTANCE)} km uzakta, ` +
        `${km(diameter * STAR.DIAMETER)} km çapında. Atmosfer her boyda Dünya fiziğiyle hesaplanır` +
        (real
          ? ': gerçek boyda rüzgâr, bulutlar ve fırtınalar yere göre Dünya’daki hızla akar.'
          : `; bu boyda haritanın 1 metresi Dünya’da ${Math.round(40_075_000 / circumference)} metredir, bulutlar ve fırtınalar yere göre o oranda yavaş akar.`);
    });
    return hint;
  }

  #population() {
    const input = el('input', { type: 'number', min: '0', max: String(MAX_POPULATION), step: '1' });
    input.addEventListener('change', () => {
      this.planet.population = Math.min(MAX_POPULATION, Math.max(0, Math.floor(Number(input.value) || 0)));
      this.#changed();
    });
    this.controls.push(() => (input.value = this.planet.population));
    return el(
      'div',
      {},
      this.#row('İlk nüfus', input),
      el('p', { class: 'hint', text: '0: gezegen boş başlar, karakterleri oyunda Nüfus sekmesinden eklersiniz.' }),
    );
  }

  /** Dışarıdan değişen değerleri (ör. ilk açılış) gösterir. */
  sync() {
    for (const sync of this.controls) sync();
  }
}
