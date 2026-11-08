import { WORLD } from '../config.js';
import { lerp } from './MathUtils.js';

const REAL_PLANET_KM = 12742; // Dünya'nın çapı
const SEAM = 12000; // m (küçük gezegende): gürültünün başa bağlandığı şerit, boyla büyür

/**
 * Gezegenin boyu: enlem-boylam düzlemine açılmış harita (doğu-batı sarar, kuzey-güney kutuplarda
 * biter). Boy, dünya kurulmadan önce `Planet.resize` ile seçilir; her yer buradan okur.
 * `scale`: en küçük (temel) gezegene göre kaç kat büyük olduğu.
 */
class PlanetGeometry {
  #width = WORLD.WIDTH;
  #height = WORLD.HEIGHT;

  /** `circumference`: ekvator çevresi (m). */
  resize(circumference) {
    this.#width = circumference;
    this.#height = circumference / 2;
    halfWidth = circumference / 2;
    width = circumference;
    height = circumference / 2;
    seam = SEAM * this.scale;
  }

  get width() {
    return this.#width;
  }

  get height() {
    return this.#height;
  }

  get scale() {
    return this.#width / WORLD.WIDTH;
  }

  get diameter() {
    return this.#width / Math.PI;
  }

  /** Bulut katmanı: Dünya'daki 2-12 km yüksekliğin gezegen çapına oranıyla (m). */
  get cloudAltitude() {
    return [(2 / REAL_PLANET_KM) * this.diameter, (12 / REAL_PLANET_KM) * this.diameter];
  }
}

// sık çağrılan fonksiyonlar için düz değişkenler
let width = WORLD.WIDTH;
let height = WORLD.HEIGHT;
let halfWidth = width / 2;
let seam = SEAM;

export const Planet = new PlanetGeometry();

/** Doğu-batı doğrultusu sarar: x, [0, genişlik) aralığına döner. */
export const wrapX = (x) => (x >= 0 && x < width ? x : ((x % width) + width) % width);

/** İki boylam arasındaki en kısa fark (dünyanın öbür yanından dolaşmak daha kısaysa onu verir). */
export const wrapDelta = (dx) => (dx > halfWidth || dx < -halfWidth ? dx - width * Math.round(dx / width) : dx);

/** Enlem (radyan): kuzey kutbu +π/2, ekvator 0. */
export const latitudeOf = (y) => (0.5 - y / height) * Math.PI;

/** Sarmayan bir gürültüyü dünyanın dikişinde başa bağlar. */
export const seamless = (x, sample) => {
  const value = sample(x);
  return x < width - seam ? value : lerp(value, sample(x - width), (x - (width - seam)) / seam);
};
