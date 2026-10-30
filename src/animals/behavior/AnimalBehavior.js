/**
 * Bir hayvan davranışı (soyut). `urgency` 0 ise uygulanamaz; beyin en aciline geçer.
 * `tick` true döndürürse davranış bitmiştir. Her hayvanın kendi örnekleri vardır (durum tutar).
 *
 * Uyku (olay tabanlı zaman): hayvan yalnızca şu iki soru izin verdiği kadar uyur:
 * - `restTime`: yürüyen davranış kaç saniye adım adım izlenmeden sürebilir? Uyanınca
 *   davranışın `tick`'i uyunan süreyle bir kez çağrılır, bu yüzden süreyle doğrusal olmalı.
 * - `quietFor`: yürümeyen davranış en erken kaç saniye sonra devreye girebilir?
 * İkisi de varsayılan 0'dır (emin değilse uyutma).
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

  restTime(_animal, _world) {
    return 0;
  }

  quietFor(_animal, _world) {
    return 0;
  }

  /** Bir ihtiyacın `level` eşiğinin altına inmesine kalan süre (sn). */
  static timeUntilBelow(animal, need, level) {
    const value = animal.needs[need];
    if (value < level) return 0;
    const duration = need === 'food' ? animal.needs.profile.foodDuration : animal.needs.profile.waterDuration;
    return (value - level) * duration;
  }
}
