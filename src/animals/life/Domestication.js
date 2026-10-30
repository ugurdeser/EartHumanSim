import { DAY, DOMESTICATION } from '../../config.js';

/**
 * Bir hayvanın insanla ilişkisi: yakalanmış (tutsak) ya da evcil. Tutsak hayvan bakımla
 * yavaş yavaş alışır, alışana kadar kaçabilir; evcil annenin yavrusu evcil doğar.
 *
 * Türün yatkınlığı SPECIES.domestication profilindedir (null ise hiç evcilleşmez):
 * { captureChance, tameSessions, minSkill?, youngOnly? }.
 */
export class Domestication {
  constructor(pen, { tamed = false } = {}) {
    this.pen = pen;
    this.tamed = tamed;
    this.progress = tamed ? 1 : 0; // alışma (0..1)
    this.lastTended = -Infinity;
  }

  /** Bu kişi bu hayvanı yakalamayı deneyebilir mi? */
  static canAttempt(animal, person) {
    const profile = animal.species.domestication;
    if (!profile || animal.domestication) return false;
    if (profile.youngOnly && !animal.isYoung) return false;
    return person.skills.get('taming') >= (profile.minSkill ?? 0);
  }

  /** Beceri ve hayvanın uysallığıyla artar; yatkın olmayan türde binde birler düzeyindedir. */
  static captureChance(animal, person) {
    const skill = person.skills.get('trapping');
    return animal.species.domestication.captureChance * (0.3 + skill * 1.5 + animal.genome.get('tameness'));
  }

  get owner() {
    return this.pen.home;
  }

  needsCare(now) {
    return !this.tamed && now - this.lastTended >= DOMESTICATION.TEND_COOLDOWN;
  }

  /** Bakım oturumu: alışma, beceri ve uysallıkla hızlanır. Evcilleştiyse true döner. */
  tend(animal, person, now) {
    this.lastTended = now;
    const { tameSessions } = animal.species.domestication;
    const skill = person.skills.get('taming');
    this.progress = Math.min(1, this.progress + ((0.4 + skill * 1.2) * (0.5 + animal.genome.get('tameness'))) / tameSessions);
    if (this.progress < 1) return false;
    this.tamed = true;
    return true;
  }

  /** Alışmamış hayvan zaman zaman kaçar. */
  escapes(dt, rng) {
    return !this.tamed && rng.chance((DOMESTICATION.ESCAPE_PER_DAY * (1 - this.progress) * dt) / DAY);
  }
}
