/** Bir hayvanın tüm ürünleri: tek noktadan güncelleme, sorgu ve kesim verimi. */
export class AnimalProducts {
  constructor(products) {
    this.list = products;
  }

  /** Eşya türünü veren ürün (yoksa null). */
  for(item) {
    return this.list.find((p) => p.item === item) ?? null;
  }

  update(animal, world, dt) {
    for (const product of this.list) product.update(animal, world, dt);
  }

  get insulation() {
    return this.list.reduce((sum, p) => sum + p.insulation, 0);
  }

  /** [{ type, amount }] — kesimde çıkan her şey. */
  slaughterYields(animal) {
    return this.list.map((p) => ({ type: p.item, amount: p.slaughterYield(animal) })).filter((y) => y.amount > 0);
  }
}
