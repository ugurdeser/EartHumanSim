const STORAGE_KEY = 'takilmaca.display';

/** Görüntü kalitesi: çizimin ekran çözünürlüğüne oranı. Düşükte daha az piksel hesaplanır, tarayıcı büyütür. */
export const Quality = Object.freeze({
  HIGH: { id: 'high', label: 'Yüksek (%100)', scale: 1 },
  MEDIUM: { id: 'medium', label: 'Orta (%75)', scale: 0.75 },
  LOW: { id: 'low', label: 'Düşük (%50)', scale: 0.5 },
});

/**
 * Ayrıntı düzeyi (LOD): uzaklaştıkça ince ayrıntının (sırtlar, tepeler, kıyı girintileri, orman
 * öbekleri) ne zaman ortalamasına söneceği ve zeminin kaç örnekle boyanacağı.
 * `bias`: pikselin boyu bununla çarpılır (büyükse ayrıntı erken söner, görüntü sakin, çizim hızlı);
 * `samples`: zemin pikseli başına örnek (kenarlar yumuşak); `pixel`: zeminin bir örneğinin ekran pikseli.
 */
export const Lod = Object.freeze({
  LOW: { id: 'low', label: 'Düşük', bias: 2, samples: 1, pixel: 2 },
  MEDIUM: { id: 'medium', label: 'Orta', bias: 1.4, samples: 1, pixel: 1.5 },
  HIGH: { id: 'high', label: 'Yüksek', bias: 1, samples: 4, pixel: 1 },
  ULTRA: { id: 'ultra', label: 'Çok yüksek', bias: 0.6, samples: 4, pixel: 1 },
});

const DEFAULTS = Object.freeze({ quality: Quality.HIGH.id, lod: Lod.HIGH.id, relief: true, clouds: true, showFps: false, overlay: 'none' });

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

  get lod() {
    return Object.values(Lod).find((l) => l.id === this.#values.lod) ?? Lod.HIGH;
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
