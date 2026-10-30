import { Sex } from '../agents/Sex.js';
import { Animal } from './Animal.js';
import { Herd } from './Herd.js';
import { AnimalBrain } from './behavior/AnimalBrain.js';
import { FollowMotherBehavior } from './behavior/FollowMotherBehavior.js';
import { Genome } from '../genetics/Genome.js';
import { AnimalNeeds } from './life/AnimalNeeds.js';
import { Lifecycle } from './life/Lifecycle.js';
import { Reproduction } from './life/Reproduction.js';
import { AnimalProducts } from './products/AnimalProducts.js';

const YOUNG_REACH = 0.3;
const YOUNG_REACH_MAX = 30;
const METABOLISM_INTERVAL = 5 * 60; // yaş, ihtiyaç, üreme ve ürünler bu sıklıkta toplu güncellenir (sn)
let created = 0; // toplu güncellemeler hayvanlara yayılsın diye sıra

/**
 * Sürü hayvanlarının soyut temel sınıfı: cinsiyet, kalıtım, yaş, ihtiyaçlar, üreme,
 * ürünler ve davranışlar. Yeni bir tür (keçi, inek ...) yalnızca SPECIES profilini tanımlar:
 *
 *   { id, name, color, dangerous, huntable, domesticable, names: { male, female, young },
 *     genes, life, needs, reproduction, movement: { walk, run }, maxHerd, shelterSeasons, thinkInterval?, coarseInterval?,
 *     createProducts(), createBehaviors() }
 */
export class HerdAnimal extends Animal {
  constructor(x, y, { sex, genome, ageYears, mother = null }) {
    super(x, y);
    if (new.target === HerdAnimal) throw new Error('HerdAnimal soyut bir sınıftır');
    const species = this.species;
    this.sex = sex;
    this.genome = genome;
    this.mother = mother;
    this.herd = null;
    this.causeOfDeath = null;
    this.heldUntil = -Infinity; // biri sağarken/kırkarken yerinde durur
    this.metabolismTimer = (created++ * 37) % METABOLISM_INTERVAL;
    this.metabolismElapsed = 0;
    this.coarseElapsed = (created * 53) % 60; // ileri sarmada biriken süre (hayvanlara yayılır)
    this.lifecycle = new Lifecycle(ageYears, species.life);
    this.needs = new AnimalNeeds(species.needs);
    this.reproduction = new Reproduction(this, species.reproduction);
    this.products = new AnimalProducts(species.createProducts());
    this.brain = new AnimalBrain([new FollowMotherBehavior(), ...species.createBehaviors()], species.thinkInterval);
  }

  /** Doğada rastgele genlerle büyümüş bir birey (yapağısı vb. yarı yarıya birikmiş). */
  static createWild(x, y, rng) {
    const species = this.SPECIES;
    const animal = new this(x, y, {
      sex: rng.chance(0.5) ? Sex.FEMALE : Sex.MALE,
      genome: Genome.random(species.genes, rng),
      ageYears: rng.range(...species.life.wildAge),
    });
    for (const product of animal.products.list) product.prefill(animal, rng.range(0.3, 1));
    return animal;
  }

  /** Bu türe uygun boş bir sürü. */
  static createHerd(center) {
    const species = this.SPECIES;
    return new Herd(center, { maxSize: species.maxHerd, shelterSeasons: species.shelterSeasons });
  }

  // ---------- Kimlik ----------

  get isFemale() {
    return this.sex === Sex.FEMALE;
  }

  get isAdult() {
    return this.lifecycle.isAdult;
  }

  get isYoung() {
    return !this.isAdult;
  }

  get ageYears() {
    return this.lifecycle.ageYears;
  }

  /** "Koç" / "Koyun" / "Kuzu" */
  get displayName() {
    const names = this.species.names;
    if (this.isYoung) return names.young;
    return this.isFemale ? names.female : names.male;
  }

  get activity() {
    return this.brain.activity;
  }

  // ---------- Hareket ----------

  get walkSpeed() {
    return this.species.movement.walk;
  }

  get runSpeed() {
    return this.species.movement.run;
  }

  /** Davranış alanı: yavru annesinin dibinden fazla uzağa gitmez. */
  reach(radius) {
    return this.isYoung ? Math.min(radius * YOUNG_REACH, YOUNG_REACH_MAX) : radius;
  }

  /** Davranışların etrafında dolaştığı nokta: yavru için anne, değilse sürünün merkezi. */
  get anchor() {
    if (this.isYoung && this.mother?.alive) return this.mother.position;
    return this.herd?.center ?? this.position;
  }

  // ---------- Çevre ----------

  /** Hava + bulunduğu yamacın koruması + kendi yünü. */
  feltTemperature(world) {
    const shelter = world.hillsideAt(this.position);
    return world.weather.exposedTemperature + (shelter?.warmth ?? 0) + this.products.insulation;
  }

  // ---------- Döngü ----------

  /**
   * Hareket ve kararlar her adımda; süreyle doğrusal ilerleyen bedensel işler
   * (yaşlanma, açlık, üreme, ürünler) ise birkaç dakikada bir, biriken süreyle toplu yürür.
   */
  update(world, dt) {
    const coarse = world.coarseTime ? this.species.coarseInterval : 0;
    if (coarse) {
      // ileri sararken önemsiz türler seyrek ama biriken süreyle güncellenir
      this.coarseElapsed += dt;
      if (this.coarseElapsed < coarse) return;
      dt = this.coarseElapsed;
      this.coarseElapsed = 0;
    }
    if (this.herd?.leader === this) this.herd.update(world, dt);
    this.metabolismElapsed += dt;
    this.metabolismTimer -= dt;
    if (this.metabolismTimer <= 0) {
      this.metabolismTimer += METABOLISM_INTERVAL;
      const elapsed = this.metabolismElapsed;
      this.metabolismElapsed = 0;
      this.#metabolize(world, elapsed);
      if (!this.alive) return;
    }
    if (world.now >= this.heldUntil) this.brain.update(this, world, dt);
  }

  #metabolize(world, dt) {
    if (this.lifecycle.update(dt, world.rng)) return this.die('yaşlılık');
    const harm = this.needs.update(dt, { feltTemperature: this.feltTemperature(world), hardiness: this.genome.get('hardiness') });
    if (this.needs.health <= 0) return this.die(harm ?? 'hastalık');
    this.reproduction.update(world, dt);
    this.products.update(this, world, dt);
  }

  /** Bir insan tutuyor (sağma, kırkma): bu ana kadar davranış yürütmez. */
  holdUntil(time) {
    this.heldUntil = Math.max(this.heldUntil, time);
  }

  /** Reproduction doğum zamanı gelince çağırır: yavru anne-babanın genlerini alır. */
  giveBirth(world, father) {
    const Species = this.constructor;
    const young = new Species(this.position.x, this.position.y, {
      sex: world.rng.chance(0.5) ? Sex.FEMALE : Sex.MALE,
      genome: Genome.inherit(this.genome, father?.genome, world.rng),
      ageYears: 0,
      mother: this,
    });
    this.herd?.add(young);
    world.addAnimal(young);
    return young;
  }

  // ---------- Av / ölüm ----------

  slaughterYields() {
    return this.products.slaughterYields(this);
  }

  onHunted(world) {
    this.herd?.alarm(world.now);
  }

  die(cause = 'öldürüldü') {
    if (!this.alive) return;
    super.die();
    this.causeOfDeath = cause;
    this.herd?.remove(this);
  }
}
