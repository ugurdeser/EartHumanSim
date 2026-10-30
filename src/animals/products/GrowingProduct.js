import { DAY } from '../../config.js';
import { AnimalProduct } from './AnimalProduct.js';

/**
 * Zamanla biriken, canlı hayvandan tekrar tekrar alınabilen ürün (yün, süt ...).
 * - perDay(animal): günlük birikim
 * - max(animal): en fazla stok
 * - isProducing(animal, world): şu an üretiyor mu (ör. süt yalnızca emzirirken)
 * - dropsWhenIdle: üretim durunca stok sıfırlanır (süt kesilir)
 * - keepOnSlaughter: kesimde stok da alınır (yapağı postla birlikte)
 */
export class GrowingProduct extends AnimalProduct {
  constructor(item, { perDay, max, isProducing = () => true, dropsWhenIdle = false, keepOnSlaughter = false }) {
    super(item);
    this.perDay = perDay;
    this.max = max;
    this.isProducing = isProducing;
    this.dropsWhenIdle = dropsWhenIdle;
    this.keepOnSlaughter = keepOnSlaughter;
    this.stock = 0;
  }

  /** Stokun doluluğu (0..1). */
  fullness(animal) {
    const max = this.max(animal);
    return max > 0 ? Math.min(1, this.stock / max) : 0;
  }

  prefill(animal, fraction) {
    this.stock = this.max(animal) * fraction;
  }

  update(animal, world, dt) {
    if (!this.isProducing(animal, world)) {
      if (this.dropsWhenIdle) this.stock = 0;
      return;
    }
    this.stock = Math.min(this.max(animal), this.stock + (this.perDay(animal) * dt) / DAY);
  }

  available() {
    return Math.floor(this.stock);
  }

  harvest(_animal, _world, limit = Infinity) {
    const amount = Math.min(limit, Math.floor(this.stock));
    this.stock -= amount;
    return amount;
  }

  slaughterYield() {
    return this.keepOnSlaughter ? Math.floor(this.stock) : 0;
  }
}
