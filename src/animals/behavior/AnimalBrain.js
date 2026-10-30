const DEFAULT_THINK_INTERVAL = 4;

/** Davranışlar arasından en acil olanı seçip yürütür. Yeni davranış = listeye yeni sınıf. */
export class AnimalBrain {
  /** `thinkInterval`: davranışlar kaç saniyede bir yeniden tartılır (sakin türlerde daha seyrek). */
  constructor(behaviors, thinkInterval = DEFAULT_THINK_INTERVAL) {
    this.behaviors = behaviors;
    this.thinkInterval = thinkInterval;
    this.current = null;
    this.timer = 0;
  }

  get activity() {
    return this.current?.label ?? 'Boşta';
  }

  update(animal, world, dt) {
    this.timer -= dt;
    if (!this.current || this.timer <= 0) {
      this.timer = this.thinkInterval;
      this.#choose(animal, world);
    }
    if (this.current?.tick(animal, world, dt)) this.current = null;
  }

  #choose(animal, world) {
    let best = null;
    let bestUrgency = 0;
    for (const behavior of this.behaviors) {
      const urgency = behavior.urgency(animal, world);
      if (urgency > bestUrgency) {
        best = behavior;
        bestUrgency = urgency;
      }
    }
    if (best && best !== this.current) best.start(animal, world);
    this.current = best;
  }
}
