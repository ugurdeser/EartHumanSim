const STORAGE_KEY = 'takilmaca.planet';

const option = (id, label, values) => Object.freeze({ id, label, ...values });

/** Kıtaların boyu: büyük ölçekli gürültü tek dev kıta, küçük ölçekli takımadalar verir. */
export const Continents = Object.freeze({
  ONE: option('one', 'Tek dev kıta', { scale: 42000 }),
  SEVERAL: option('several', 'Birkaç kıta', { scale: 20000 }),
  ISLANDS: option('islands', 'Takımadalar', { scale: 7500 }),
});

/** Dağlar: kuşakların ne kadar yer kapladığı ve en yüksek dorukların boyu (Dünya ölçeğinde). */
export const Relief = Object.freeze({
  FLAT: option('flat', 'Düz', { belt: [0.62, 0.76], peak: 2500 }),
  NORMAL: option('normal', 'Normal', { belt: [0.48, 0.62], peak: 5000 }),
  RUGGED: option('rugged', 'Çok dağlık', { belt: [0.36, 0.5], peak: 7500 }),
});

/** Kutuptan bu kadar uzağa kadar aşılamaz buzul (m). */
export const IceCaps = Object.freeze({
  NARROW: option('narrow', 'Dar', { margin: 8000 }),
  NORMAL: option('normal', 'Normal', { margin: 15400 }),
  WIDE: option('wide', 'Geniş', { margin: 24000 }),
});

/** Güneşin gücü: gezegenin genel sıcaklığı. */
export const Warmth = Object.freeze({
  ICE_AGE: option('ice-age', 'Buzul çağı', { solar: 0.93 }),
  EARTH: option('earth', 'Dünya gibi', { solar: 1 }),
  HOT: option('hot', 'Sıcak', { solar: 1.08 }),
});

/** Denizin havayı nemlendirme hızı (buharlaşma süresinin çarpanı: küçüldükçe yağış artar). */
export const Wetness = Object.freeze({
  DRY: option('dry', 'Kurak', { evaporation: 2.2 }),
  NORMAL: option('normal', 'Normal', { evaporation: 1 }),
  WET: option('wet', 'Yağışlı', { evaporation: 0.55 }),
});

/** Basınç sistemlerinin (alçak basınç, kasırga) doğma sıklığı çarpanı. */
export const Storminess = Object.freeze({
  CALM: option('calm', 'Sakin', { rate: 0.4 }),
  NORMAL: option('normal', 'Normal', { rate: 1 }),
  STORMY: option('stormy', 'Fırtınalı', { rate: 2.2 }),
});

/** Seçenek grupları: ayar adı → seçenekler. */
export const PLANET_OPTIONS = Object.freeze({ continents: Continents, relief: Relief, iceCaps: IceCaps, warmth: Warmth, wetness: Wetness, storms: Storminess });

const DEFAULTS = Object.freeze({
  seaShare: 0.4,
  continents: 'several',
  relief: 'normal',
  iceCaps: 'normal',
  warmth: 'earth',
  obliquity: 23.44,
  wetness: 'normal',
  storms: 'normal',
  population: 0,
});

/** Hazır gezegenler: ayarları tek tıkla doldurur (sonra elle değiştirilebilir). */
export const PRESETS = Object.freeze([
  { id: 'default', label: 'Bol karalı', values: {} },
  { id: 'earth', label: 'Dünya benzeri', values: { seaShare: 0.7 } },
  { id: 'ocean', label: 'Okyanus gezegeni', values: { seaShare: 0.85, continents: 'islands', iceCaps: 'narrow', wetness: 'wet', storms: 'stormy' } },
  { id: 'archipelago', label: 'Takımadalar', values: { seaShare: 0.6, continents: 'islands', relief: 'rugged' } },
  { id: 'pangaea', label: 'Tek dev kıta', values: { seaShare: 0.45, continents: 'one' } },
  { id: 'arid', label: 'Kurak gezegen', values: { seaShare: 0.25, iceCaps: 'narrow', warmth: 'hot', wetness: 'dry', storms: 'calm' } },
  { id: 'ice-age', label: 'Buzul çağı', values: { seaShare: 0.55, iceCaps: 'wide', warmth: 'ice-age', wetness: 'dry' } },
]);

/**
 * Bir gezegenin kuruluş ayarları: arazi (tohum, deniz, kıtalar, dağlar, buzullar), iklim
 * (güneş, eksen eğikliği, nem, fırtınalar) ve başlangıç (yer, nüfus). Aynı ayarlar aynı gezegeni verir.
 */
export class PlanetSettings {
  constructor(values = {}) {
    Object.assign(this, DEFAULTS, { seed: Math.floor(Math.random() * 1e9), start: null }, values);
  }

  /** Seçenek nesnesi (ör. `option('relief')` → Relief.NORMAL). */
  option(name) {
    const choices = Object.values(PLANET_OPTIONS[name]);
    return choices.find((o) => o.id === this[name]) ?? choices.find((o) => o.id === DEFAULTS[name]);
  }

  get continentScale() {
    return this.option('continents').scale;
  }

  get mountainBelt() {
    return this.option('relief').belt;
  }

  get peakAltitude() {
    return this.option('relief').peak;
  }

  get iceMargin() {
    return this.option('iceCaps').margin;
  }

  get solar() {
    return this.option('warmth').solar;
  }

  get evaporation() {
    return this.option('wetness').evaporation;
  }

  get stormRate() {
    return this.option('storms').rate;
  }

  /** Araziyi belirleyen ayarlar: değişince önizleme yeniden üretilir, seçilen yer geçersizleşir. */
  get landKey() {
    return [this.seed, this.seaShare, this.continents, this.relief, this.iceCaps].join('|');
  }

  applyPreset(preset) {
    Object.assign(this, DEFAULTS, { population: this.population }, preset.values);
    this.start = null;
  }

  // ---------- Saklama ----------

  static load() {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
      return new PlanetSettings(saved ?? {});
    } catch {
      return new PlanetSettings();
    }
  }

  save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...this }));
    } catch {
      // depolama kapalıysa ayarlar yalnızca bu oturumda
    }
  }
}
