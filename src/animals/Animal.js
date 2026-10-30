import { Agent } from '../agents/Agent.js';

/** Hayvanların soyut temel sınıfı. Alt sınıflar SPECIES tanımlar ve update() uygular. */
export class Animal extends Agent {
  constructor(x, y) {
    super(x, y);
    if (new.target === Animal) throw new Error('Animal soyut bir sınıftır');
    this.alive = true;
  }

  get species() {
    return this.constructor.SPECIES;
  }

  get isDangerous() {
    return this.species.dangerous;
  }

  get isHuntable() {
    return this.species.huntable;
  }

  get isYoung() {
    return false;
  }

  /** Şu an yırtıcıdan korunuyor mu (ör. gece ağılda)? */
  isSheltered(_world) {
    return false;
  }

  /** Avlanınca/kesilince çıkanlar: [{ type, amount }]. */
  slaughterYields() {
    return [];
  }

  /** Bir insan avlamaya çalıştı (başarılı olsun olmasın). */
  onHunted(_world) {}

  die() {
    this.alive = false;
  }
}
