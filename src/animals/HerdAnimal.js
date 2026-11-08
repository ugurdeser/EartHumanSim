import { Sex } from '../agents/Sex.js';
import { LogType } from '../core/EventLog.js';
import { Animal } from './Animal.js';
import { Herd } from './Herd.js';
import { AnimalBrain } from './behavior/AnimalBrain.js';
import { FollowMotherBehavior } from './behavior/FollowMotherBehavior.js';
import { Genome } from '../genetics/Genome.js';
import { AnimalNeeds } from './life/AnimalNeeds.js';
import { AnimalSleep } from './life/AnimalSleep.js';
import { Captivity } from './life/Captivity.js';
import { Domestication } from './life/Domestication.js';
import { Lifecycle } from './life/Lifecycle.js';
import { Reproduction } from './life/Reproduction.js';
import { AnimalProducts } from './products/AnimalProducts.js';

const YOUNG_REACH = 0.3;
const YOUNG_REACH_MAX = 30;
const METABOLISM_INTERVAL = 5 * 60; // uyanıkken yaş, ihtiyaç, üreme ve ürünler bu sıklıkta toplu güncellenir (sn)
let created = 0; // toplu güncellemeler hayvanlara yayılsın diye sıra

/**
 * Sürü hayvanlarının soyut temel sınıfı: cinsiyet, kalıtım, yaş, ihtiyaçlar, üreme,
 * ürünler ve davranışlar. Yeni bir tür (keçi, inek ...) yalnızca SPECIES profilini tanımlar:
 *
 *   { id, name, color, dangerous, huntable, domestication, names: { male, female, young },
 *     genes, life, needs, reproduction, movement: { walk, run }, maxHerd, thinkInterval?, maxSleep?, glides?,
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
    this.domestication = null; // yakalanmış ya da evcilse (Domestication)
    this.causeOfDeath = null;
    this.heldUntil = -Infinity; // biri sağarken/kırkarken yerinde durur
    this.metabolismStagger = (created++ * 37) % METABOLISM_INTERVAL;
    this.lastMetabolism = null; // bedensel işlerin en son işlendiği an
    this.sleeping = false; // olay tabanlı zaman: uyurken hiç güncellenmez (World.scheduler uyandırır)
    this.sleepStart = 0;
    this.glide = null; // uyurken süzüldüğü yol (yalnızca çizim için): { from, to, start, end }
    this.rest = new AnimalSleep(this);
    this.captivity = new Captivity(this);
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

  /** Ağıla elden verilen evcil yetişkin (cinsiyet verilmezse rastgele). */
  static createTamed(pen, rng, sex) {
    const { x, y } = pen.randomPointInside(rng);
    const animal = this.createWild(x, y, rng);
    animal.sex = sex ?? animal.sex;
    animal.lifecycle.ageYears = Math.max(this.SPECIES.life.adultAge, animal.ageYears);
    animal.domestication = new Domestication(pen, { tamed: true });
    pen.herd.add(animal);
    return animal;
  }

  /** Bu türe uygun boş bir sürü. */
  static createHerd(center) {
    const species = this.SPECIES;
    return new Herd(center, { maxSize: species.maxHerd });
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

  // ---------- Evcilleşme ----------

  get isTamed() {
    return this.domestication?.tamed ?? false;
  }

  /** Yakalanmış ya da evcil hayvan yırtıcı sayılmaz, insanların avı da değildir. */
  get isDangerous() {
    return super.isDangerous && !this.domestication;
  }

  get isHuntable() {
    return super.isHuntable && !this.domestication;
  }

  isSheltered(world) {
    return this.captivity.isSheltered(world);
  }

  canBeHandledBy(person) {
    return this.captivity.canBeHandledBy(person);
  }

  capture(world, pen) {
    this.captivity.capture(world, pen);
  }

  release(world) {
    this.captivity.release(world);
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

  /** Annesi yaşıyor ve aynı sürüdeyse (yakalanan yavru annesinden ayrılır). */
  get followsMother() {
    return Boolean(this.mother?.alive) && this.mother.herd === this.herd;
  }

  /** Gezilecek bir nokta: ağıldaki hayvan için çitin içi, değilse `radius` kadar çevresi. */
  roamPoint(world, radius) {
    const pen = this.domestication?.pen;
    return pen ? pen.randomPointInside(world.rng) : world.randomPointNear(this.anchor, this.reach(radius));
  }

  /** Davranışların etrafında dolaştığı nokta: yavru için anne, değilse sürünün merkezi. */
  get anchor() {
    if (this.isYoung && this.followsMother) return this.mother.position;
    return this.herd?.center ?? this.position;
  }

  // ---------- Çevre ----------

  /** Bulunduğu yerin havası (rüzgârla) + kendi yünü. */
  feltTemperature(world) {
    return world.weather.exposedTemperatureAt(this.position) + this.products.insulation;
  }

  // ---------- Döngü ----------

  /**
   * Uyanıkken her adımda çağrılır: hareket ve kararlar adım adım; süreyle doğrusal ilerleyen
   * bedensel işler birkaç dakikada bir toplu. Yapacak bir şey kalmayınca hayvan uyur.
   */
  update(world, dt) {
    this.herd?.update(world);
    this.#metabolizeIfDue(world, METABOLISM_INTERVAL);
    if (!this.alive || world.now < this.heldUntil) return;
    this.brain.update(this, world, dt);
    if (this.alive) this.rest.trySleep(world);
  }

  /** Etkin bölge dışındayken hayvan donar: geçen süre sonradan işlenmez. */
  freeze(world) {
    this.lastMetabolism = world.now;
  }

  /** Durumunu şimdiye getirir (uyurken bile): ürünü, ihtiyaçları okunmadan önce. */
  catchUp(world) {
    this.#metabolizeIfDue(world, 0);
  }

  #metabolizeIfDue(world, interval) {
    if (this.lastMetabolism === null) {
      this.lastMetabolism = world.now - this.metabolismStagger;
      return;
    }
    const elapsed = world.now - this.lastMetabolism;
    if (elapsed <= 0 || elapsed < interval) return;
    this.lastMetabolism = world.now;
    this.#metabolize(world, elapsed);
  }

  wake(world) {
    this.rest.wake(world);
  }

  alert(world) {
    this.rest.alert(world);
  }

  displayPosition(now) {
    return this.rest.displayPosition(now);
  }

  #metabolize(world, dt) {
    if (this.lifecycle.update(dt, world.rng)) return this.die('yaşlılık');
    const harm = this.needs.update(dt, { feltTemperature: this.feltTemperature(world), hardiness: this.genome.get('hardiness') });
    if (this.needs.health <= 0) return this.die(harm ?? 'hastalık');
    this.reproduction.update(world, dt);
    this.products.update(this, world, dt);
    if (this.domestication?.escapes(dt, world.rng)) this.#escape(world);
  }

  #escape(world) {
    const { owner } = this.domestication;
    this.release(world);
    world.log.personal([...owner.owners], `🐾 Tutsak ${this.displayName.toLocaleLowerCase('tr')} ağıldan kaçtı`, LogType.INFO);
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
    if (this.domestication) young.domestication = new Domestication(this.domestication.pen, { tamed: this.isTamed });
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
    this.alert(world);
  }

  die(cause = 'öldürüldü') {
    if (!this.alive) return;
    super.die();
    this.causeOfDeath = cause;
    this.herd?.remove(this);
  }
}
