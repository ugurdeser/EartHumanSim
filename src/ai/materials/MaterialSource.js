/**
 * Bir malzemenin doğadan nasıl elde edildiği (strateji). Alt sınıflar
 * `canGather` ve `createAction` uygular; eylem malzemeyi kişinin envanterine koyar.
 */
export class MaterialSource {
  constructor(type) {
    if (new.target === MaterialSource) throw new Error('MaterialSource soyut bir sınıftır');
    this.type = type;
  }

  canGather(_person, _world) {
    return false;
  }

  createAction(_person, _world) {
    return null;
  }
}
