import { AnimalProduct } from './AnimalProduct.js';

/** Yalnızca kesimde/avda çıkan ürün (et, post ...). amount(animal) adedi verir. */
export class CarcassProduct extends AnimalProduct {
  constructor(item, { amount }) {
    super(item);
    this.amount = amount;
  }

  slaughterYield(animal) {
    return Math.max(0, Math.round(this.amount(animal)));
  }
}
