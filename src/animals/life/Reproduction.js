import { DAY } from '../../config.js';

const MIN_FOOD_TO_CONCEIVE = 0.4;

/**
 * Üreme: çiftleşme mevsimi, gebelik, doğum ve emzirme.
 * Profil: { matingSeasons, conceptionChance, gestationDays, lactationDays, litterSize: [min, max], mateRadius }.
 * Doğumun kendisini hayvan yapar (`animal.giveBirth`); burası yalnızca ne zaman olacağını bilir.
 */
export class Reproduction {
  constructor(animal, profile) {
    this.animal = animal;
    this.profile = profile;
    this.pregnancy = null; // { father, due }
    this.lactationUntil = -Infinity;
    this.dailyTimer = 0;
  }

  get isPregnant() {
    return this.pregnancy !== null;
  }

  isLactating(now) {
    return now < this.lactationUntil;
  }

  update(world, dt) {
    if (this.pregnancy && world.now >= this.pregnancy.due) return this.#deliver(world);
    this.dailyTimer -= dt;
    if (this.dailyTimer > 0) return;
    this.dailyTimer = DAY;
    this.#tryConceive(world);
  }

  #canConceive(world) {
    const a = this.animal;
    return (
      a.isFemale &&
      a.isAdult &&
      !this.pregnancy &&
      a.needs.food >= MIN_FOOD_TO_CONCEIVE &&
      !a.herd?.isFull &&
      this.profile.matingSeasons.includes(world.calendar.seasonAt(a.position))
    );
  }

  #tryConceive(world) {
    if (!this.#canConceive(world)) return;
    const mate = this.#findMate();
    if (!mate) return;
    const fertility = (this.animal.genome.get('fertility') + mate.genome.get('fertility')) / 2;
    if (!world.rng.chance(this.profile.conceptionChance * (0.5 + fertility))) return;
    this.pregnancy = { father: mate, due: world.now + this.profile.gestationDays * DAY };
  }

  /** Sürüdeki en yakın yetişkin erkek (yoksa null). */
  #findMate() {
    const a = this.animal;
    let best = null;
    let bestDistance = this.profile.mateRadius;
    for (const other of a.herd?.members ?? []) {
      if (!other.alive || other.isFemale || !other.isAdult) continue;
      const distance = other.position.distanceTo(a.position);
      if (distance < bestDistance) {
        best = other;
        bestDistance = distance;
      }
    }
    return best;
  }

  #deliver(world) {
    const { father } = this.pregnancy;
    this.pregnancy = null;
    const count = world.rng.int(...this.profile.litterSize);
    for (let i = 0; i < count; i++) this.animal.giveBirth(world, father);
    this.lactationUntil = world.now + this.profile.lactationDays * DAY;
  }
}
