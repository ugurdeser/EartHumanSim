/**
 * Kişinin gidip de ulaşamadığı yerler (ör. denizin öbür yakasındaki gölet). Bir süre
 * bunları hedef seçmez; böylece aynı yere tekrar tekrar gidip kıyıda takılı kalmaz.
 */
export class UnreachablePlaces {
  #until = new Map(); // yer → bu zamana kadar denenmez

  remember(place, until) {
    this.#until.set(place, until);
  }

  has(place, now) {
    const until = this.#until.get(place);
    if (until === undefined) return false;
    if (until > now) return true;
    this.#until.delete(place);
    return false;
  }
}
