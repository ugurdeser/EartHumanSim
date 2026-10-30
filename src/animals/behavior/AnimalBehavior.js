/**
 * Bir hayvan davranışı (soyut). `urgency` 0 ise uygulanamaz; beyin en aciline geçer.
 * `tick` true döndürürse davranış bitmiştir. Her hayvanın kendi örnekleri vardır (durum tutar).
 */
export class AnimalBehavior {
  constructor(label) {
    if (new.target === AnimalBehavior) throw new Error('AnimalBehavior soyut bir sınıftır');
    this.label = label;
  }

  urgency(_animal, _world) {
    return 0;
  }

  start(_animal, _world) {}

  tick(_animal, _world, _dt) {
    return true;
  }
}
