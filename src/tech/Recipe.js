/** Bir aletin hangi malzemelerle, ne kadar sürede yapıldığı. */
export class Recipe {
  constructor({ technology, output, inputs, time, needsFire = false, yields = 1 }) {
    this.technology = technology;
    this.output = output;
    this.inputs = inputs; // [[ItemType, adet], ...]
    this.time = time;
    this.needsFire = needsFire; // yuvada yanan ocak olmadan yapılamaz
    this.yields = yields; // bir işte kaç adet çıkar
  }

  /** Verilen depolarda toplamda eksik kalan ilk malzeme: {type, amount} ya da null. */
  firstMissing(...inventories) {
    for (const [type, amount] of this.inputs) {
      const have = inventories.reduce((sum, inv) => sum + inv.count(type), 0);
      if (have < amount) return { type, amount: amount - have };
    }
    return null;
  }

  canCraftFrom(inventory) {
    return this.inputs.every(([type, amount]) => inventory.has(type, amount));
  }

  consumeFrom(inventory) {
    for (const [type, amount] of this.inputs) inventory.remove(type, amount);
  }
}
