import { GrowingProduct } from './GrowingProduct.js';

/** Yapağı: yıl boyu uzar, kırkılınca alınır; uzunluğu oranında hayvanı soğuktan korur. */
export class WoolCoat extends GrowingProduct {
  constructor(item, { perDay, max, maxInsulation }) {
    super(item, { perDay, max, keepOnSlaughter: true });
    this.maxInsulation = maxInsulation;
    this.coverage = 0;
  }

  prefill(animal, fraction) {
    super.prefill(animal, fraction);
    this.coverage = this.fullness(animal);
  }

  update(animal, world, dt) {
    super.update(animal, world, dt);
    this.coverage = this.fullness(animal);
  }

  get insulation() {
    return this.maxInsulation * this.coverage;
  }
}
