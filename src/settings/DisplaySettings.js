const STORAGE_KEY = 'takilmaca.display';

/** Görüntü kalitesi: çizimin ekran çözünürlüğüne oranı. Düşükte daha az piksel hesaplanır, tarayıcı büyütür. */
export const Quality = Object.freeze({
  HIGH: { id: 'high', label: 'Yüksek (%100)', scale: 1 },
  MEDIUM: { id: 'medium', label: 'Orta (%75)', scale: 0.75 },
  LOW: { id: 'low', label: 'Düşük (%50)', scale: 0.5 },
});

const DEFAULTS = Object.freeze({ quality: Quality.HIGH.id, relief: true, clouds: true, showFps: false, overlay: 'none' });

/**
 * Oyuncunun görüntü tercihleri: tarayıcıda saklanır, değişince dinleyenlere haber verilir.
 * Çizim katmanları yalnızca buradan okur; ayar penceresi yalnızca buraya yazar.
 */
export class DisplaySettings {
  #values;
  #listeners = new Set();

  constructor(storage = DisplaySettings.#localStorage()) {
    this.storage = storage;
    this.#values = { ...DEFAULTS, ...this.#load() };
  }

  static #localStorage() {
    try {
      return window.localStorage;
    } catch {
      return null; // gizli pencere vb.: ayarlar yalnızca bu oturumda geçerli
    }
  }

  get quality() {
    return Object.values(Quality).find((q) => q.id === this.#values.quality) ?? Quality.HIGH;
  }

  /** Çizimin ekran çözünürlüğüne oranı (1 = tam). */
  get resolution() {
    return this.quality.scale;
  }

  get relief() {
    return this.#values.relief;
  }

  get clouds() {
    return this.#values.clouds;
  }

  get showFps() {
    return this.#values.showFps;
  }

  /** Haritanın üstüne açılan hava katmanı (WeatherMaps.Overlay kimliği). */
  get overlay() {
    return this.#values.overlay;
  }

  /** Piksel piksel boyanan katmanlarda bir örneğin kapladığı ekran pikseli: kalite düştükçe büyür. */
  sampleSize(base) {
    return base / this.resolution;
  }

  set(key, value) {
    if (!(key in DEFAULTS) || this.#values[key] === value) return;
    this.#values[key] = value;
    this.#save();
    for (const listener of this.#listeners) listener(key, value);
  }

  onChange(listener) {
    this.#listeners.add(listener);
  }

  #load() {
    try {
      const saved = JSON.parse(this.storage?.getItem(STORAGE_KEY) ?? '{}');
      return Object.fromEntries(Object.entries(saved).filter(([key, value]) => typeof value === typeof DEFAULTS[key]));
    } catch {
      return {};
    }
  }

  #save() {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.#values));
    } catch {
      // depolama doluysa ya da kapalıysa ayar yalnızca bu oturumda kalır
    }
  }
}
