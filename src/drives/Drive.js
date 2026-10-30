import { HOUR } from '../config.js';
import { clamp, clamp01 } from '../core/MathUtils.js';

/**
 * Güdü soyut sınıfı.
 *
 * Her kişinin her güdüden kendi örneği vardır:
 *  - `weight`   : kişilik katsayısı (bu kişide güdü ne kadar baskın)
 *  - `pressure` : zamanla biriken iç baskı (0..1)
 *  - `raw`      : durumdan hesaplanan ham şiddet (0..MAX_RAW)
 *  - `urgency`  : raw × weight → karar verici bunu kullanır
 *
 * Alt sınıflar statik ID / NAME / CATEGORY / DESCRIPTION tanımlar,
 * `computeRaw()` ve `createAction()` metodlarını uygular.
 */
export class Drive {
  static MAX_RAW = 1.5;
  static WEIGHT_RANGE = [0.5, 1.4];
  static FOR_DEPENDENTS = false; // küçük çocuklarda da çalışır mı (gerisi onları evden uzaklaştırır)

  constructor(weight = 1) {
    if (new.target === Drive) throw new Error('Drive soyut bir sınıftır');
    this.weight = weight;
    this.pressure = 0;
    this.raw = 0;
    this.urgency = 0;
  }

  get id() {
    return this.constructor.ID;
  }

  get name() {
    return this.constructor.NAME;
  }

  get category() {
    return this.constructor.CATEGORY;
  }

  get description() {
    return this.constructor.DESCRIPTION;
  }

  evaluate(person, world, dt) {
    if (!this.isApplicable(person) || (person.needsCare && !this.constructor.FOR_DEPENDENTS)) {
      this.raw = 0;
      this.urgency = 0;
      return 0;
    }
    this.raw = clamp(this.computeRaw(person, world, dt), 0, this.constructor.MAX_RAW);
    this.urgency = this.raw * this.weight;
    return this.urgency;
  }

  /** Bu güdü bu kişi için şu an anlamlı mı? (ör. çocuklarda üreme güdüleri yok) */
  isApplicable(_person) {
    return true;
  }

  /** @returns {number} ham şiddet */
  computeRaw(_person, _world, _dt) {
    throw new Error(`${this.constructor.name}.computeRaw() uygulanmalı`);
  }

  /** @returns {import('../actions/Action.js').Action|null} */
  createAction(_person, _world) {
    return null;
  }

  /** Baskıyı `hoursToFull` saatte 0'dan 1'e çıkacak hızda artırır. */
  accumulate(dt, hoursToFull) {
    this.pressure = clamp01(this.pressure + dt / (hoursToFull * HOUR));
  }

  relieve(amount) {
    this.pressure = clamp01(this.pressure - amount);
  }
}
