import { AnimalBehavior } from './AnimalBehavior.js';

/** Başka işi yokken sürünün (yavruysa annesinin) çevresinde gezinip dinlenmek. */
export class IdleBehavior extends AnimalBehavior {
  constructor({ radius }) {
    super('Dolaşıyor');
    this.radius = radius;
    this.target = null;
    this.pause = 0;
  }

  urgency() {
    return 0.05;
  }

  /** Yürüme hedefi (molada değilken). */
  get movingTo() {
    return this.pause > 0 ? null : this.target;
  }

  /**
   * Molada: mola boyunca. Süzülen tür (ör. balık) ise gezinmesi yalnızca görüntüdür:
   * hedefine doğru türün en uzun uykusu kadar süzülür, uyanınca oradadır.
   */
  restTime(animal) {
    if (animal.species.glides) return this.target ? Infinity : 0;
    return this.pause > 0 ? this.pause : 0;
  }

  quietFor() {
    return Infinity; // en düşük öncelik: hiçbir şeyi bölmez
  }

  tick(animal, world, dt) {
    if (this.pause > 0) {
      this.pause -= dt;
      return false;
    }
    this.target ??= animal.roamPoint(world, this.radius);
    if (animal.species.glides) {
      animal.position.set(this.target.x, this.target.y); // süzülme uykuda geçti
      this.target = animal.roamPoint(world, this.radius);
      return false;
    }
    if (animal.moveTowards(this.target, animal.walkSpeed, dt, world)) {
      this.target = null;
      this.pause = world.rng.range(60, 400);
    }
    return false;
  }
}
