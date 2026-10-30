/**
 * Yiyecek edinme stratejisi (soyut). `plan()` envantere yiyecek koyacak bir eylem
 * ve tahmini maliyeti (sn / beklenen besin) döndürür; uygulanamıyorsa null.
 */
export class FoodProvider {
  constructor(id) {
    if (new.target === FoodProvider) throw new Error('FoodProvider soyut bir sınıftır');
    this.id = id;
  }

  plan(_person, _world) {
    return null;
  }

  static travelTime(person, from, to) {
    return from.distanceTo(to) / person.walkSpeed;
  }
}
