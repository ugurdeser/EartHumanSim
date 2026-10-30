import { AGING, DAY, FIRE, PERSON, WORLD } from '../config.js';
import { clamp01 } from '../core/MathUtils.js';
import { DecisionMaker } from '../ai/DecisionMaker.js';
import { DriveSet } from '../drives/DriveSet.js';
import { Inventory } from '../items/Inventory.js';
import { Knowledge } from '../tech/Knowledge.js';
import { Agent } from './Agent.js';
import { ExplorationMap } from './ExplorationMap.js';
import { LifeHistory } from './LifeHistory.js';
import { Needs } from './Needs.js';
import { RelationshipBook } from './RelationshipBook.js';
import { Sex } from './Sex.js';
import { SKILL_DEFINITIONS, Skills } from './Skills.js';

const HOME_SHELTER_RADIUS = 8;
const FULL = 0.95;

/** Haritada bir nokta olarak görünen insan. */
export class Person extends Agent {
  constructor({ name, surname, sex, position, ageYears, personality, traits, home, rng, needs, mother = null, father = null }) {
    super(position.x, position.y);
    this.name = name;
    this.surname = surname;
    this.sex = sex;
    this.ageYears = ageYears;
    this.personality = personality;
    this.traits = traits;
    this.rng = rng;
    this.mother = mother;
    this.father = father;

    this.needs = needs ?? new Needs();
    this.skills = new Skills(mother ? null : rng);
    this.knowledge = new Knowledge();
    this.inventory = new Inventory(PERSON.CARRY_CAPACITY * (0.7 + traits.strength * 0.6));
    this.drives = DriveSet.fromPersonality(personality);
    this.relations = new RelationshipBook(this, rng);
    this.exploration = new ExplorationMap(WORLD.SIZE, WORLD.EXPLORATION_CELL);
    this.brain = new DecisionMaker(this);
    this.history = new LifeHistory();

    this.alive = true;
    this.causeOfDeath = null;
    this.deathTime = null;
    this.partner = null;
    this.children = [];
    this.pregnancy = null;
    this.postpartumYears = 0; // doğumdan sonra kalan bekleme
    this.family = null; // içinde yaşadığı hane (Family)
    this.group = null;
    this.grievances = [];
    this.learnedDirtyWater = false; // kirli sudan hastalanınca öğrenir, bir daha içmez
    this.status = 0.1;

    this.home = null;
    this.moveHome(home);
  }

  // ---------- Kimlik ----------

  get fullName() {
    return `${this.name} ${this.surname}`;
  }

  /** Tam yıl olarak yaş. */
  get age() {
    return Math.floor(this.ageYears);
  }

  get isChild() {
    return this.ageYears < AGING.ADULT_AGE;
  }

  get isAdult() {
    return !this.isChild;
  }

  get isFemale() {
    return this.sex === Sex.FEMALE;
  }

  static yearsToSeconds(years) {
    return (years / AGING.YEARS_PER_DAY) * DAY;
  }

  /** Verilen simülasyon anında kaç yaşındaydı? (hikâyede olay anındaki yaş için) */
  ageAt(simTime, now) {
    const end = this.alive ? now : this.deathTime;
    return Math.max(0, Math.floor(this.ageYears - ((end - simTime) / DAY) * AGING.YEARS_PER_DAY));
  }

  // ---------- Aile ----------

  get canConceive() {
    return (
      this.isFemale &&
      this.alive &&
      this.isAdult &&
      this.ageYears <= AGING.FEMALE_FERTILE_UNTIL &&
      !this.pregnancy &&
      this.postpartumYears <= 0 &&
      this.children.length < PERSON.MAX_CHILDREN
    );
  }

  get siblings() {
    const parents = [this.mother, this.father].filter(Boolean);
    return [...new Set(parents.flatMap((p) => p.children))].filter((c) => c !== this);
  }

  get dependentChildren() {
    return this.children.filter((c) => c.alive && c.isChild);
  }

  /** Anne, baba, çocuk veya kardeş mi? */
  isCloseRelativeOf(other) {
    return other === this.mother || other === this.father || this.children.includes(other) || this.siblings.includes(other);
  }

  relationTo(other) {
    return this.relations.get(other);
  }

  // ---------- Hareket ----------

  get walkSpeed() {
    const base = this.isChild ? PERSON.CHILD_WALK_SPEED : PERSON.WALK_SPEED;
    return base * (0.85 + this.traits.agility * 0.3);
  }

  get runSpeed() {
    const base = this.isChild ? PERSON.CHILD_RUN_SPEED : PERSON.RUN_SPEED;
    return base * (0.85 + this.traits.agility * 0.3);
  }

  /** Taş yol üzerinde daha hızlı yürünür. */
  moveTowards(target, speed, dt, world) {
    return super.moveTowards(target, speed * world.roads.speedFactor(this.position), dt, world);
  }

  // ---------- Durum ----------

  get currentDrive() {
    return this.brain.currentDrive;
  }

  get activity() {
    return this.brain.activity;
  }

  get averageSkill() {
    return this.skills.average;
  }

  isAtHome() {
    return this.position.distanceTo(this.home.position) <= HOME_SHELTER_RADIUS;
  }

  /** Hava + ateş + barınak yalıtımı. */
  feltTemperature(world) {
    let temperature = world.calendar.temperature;
    if (world.isNearLitFire(this.position)) temperature += FIRE.HEAT;
    if (this.isAtHome()) temperature += this.home.insulation;
    return temperature;
  }

  // ---------- Döngü ----------

  update(world, dt) {
    if (!this.alive) return;
    this.#age(world, dt);
    if (!this.alive) return;

    const harm = this.needs.update(dt, { feltTemperature: this.feltTemperature(world), endurance: this.traits.endurance });
    if (this.needs.health <= 0) return world.killPerson(this, harm ?? 'hastalık');

    this.status = clamp01(this.status - dt / PERSON.STATUS_DECAY_TIME);
    this.#updatePregnancy(world);
    this.#forgetOldGrievances(world.now);
    this.exploration.mark(this.position);
    this.brain.update(world, dt);
  }

  #age(world, dt) {
    const wasChild = this.isChild;
    const years = (dt / DAY) * AGING.YEARS_PER_DAY;
    this.ageYears += years;
    this.postpartumYears = Math.max(0, this.postpartumYears - years);
    if (wasChild && this.isAdult) world.comeOfAge(this);
    if (this.rng.chance(this.#oldAgeRisk() * years)) world.killPerson(this, 'yaşlılık');
  }

  /** Yıllık doğal ölüm olasılığı; OLD_AGE'den sonra üstel artar. */
  #oldAgeRisk() {
    if (this.ageYears < AGING.OLD_AGE) return 0;
    return AGING.OLD_AGE_BASE_RISK * Math.exp((this.ageYears - AGING.OLD_AGE) / AGING.OLD_AGE_RISK_GROWTH);
  }

  #updatePregnancy(world) {
    if (!this.pregnancy) return;
    if (world.now - this.pregnancy.start < Person.yearsToSeconds(AGING.PREGNANCY_YEARS)) return;
    const { father } = this.pregnancy;
    this.pregnancy = null;
    this.postpartumYears = AGING.POSTPARTUM_YEARS;
    world.birth(this, father);
  }

  #forgetOldGrievances(now) {
    this.grievances = this.grievances.filter((g) => g.thief.alive && now - g.time < PERSON.GRIEVANCE_MEMORY);
  }

  // ---------- Beslenme ----------

  /** Bir depodan doyana kadar yer; yanan ateş başındaysa et ve balık pişirilir. */
  eatFrom(inventory, world) {
    const cooked = world.isNearLitFire(this.position);
    let eaten = 0;
    while (this.needs.food < FULL) {
      const food = inventory.takeBestFood(cooked);
      if (!food) break;
      this.needs.eat(food.nutritionFor(cooked));
      eaten++;
    }
    return eaten;
  }

  // ---------- Gelişim ----------

  changeStatus(delta) {
    this.status = clamp01(this.status + delta);
  }

  improveSkill(skill, amount) {
    this.skills.improve(skill, amount, this.traits.intelligence);
  }

  improveRandomSkill(amount) {
    this.improveSkill(this.rng.pick(SKILL_DEFINITIONS).id, amount);
  }

  /** İşin süresini beceri ve özelliklere göre kısaltan çarpan (1 = ortalama). */
  workSpeed(skill, trait = 'strength') {
    return 0.6 + this.skills.get(skill) * 0.6 + this.traits[trait] * 0.4;
  }

  // ---------- Sosyal ----------

  moveHome(home) {
    this.home?.removeOwner(this);
    this.home = home;
    home.addOwner(this);
  }

  addGrievance(grievance) {
    if (this.grievances.some((g) => g.thief === grievance.thief && g.victimHome === grievance.victimHome)) return;
    this.grievances.push(grievance);
  }

  resolveGrievance(thief, victimHome) {
    this.grievances = this.grievances.filter((g) => !(g.thief === thief && g.victimHome === victimHome));
  }

  // ---------- Sağlık ----------

  takeDamage(amount, world, cause) {
    this.needs.damage(amount);
    if (this.needs.health <= 0) world.killPerson(this, cause);
  }

  die(cause, time) {
    this.alive = false;
    this.causeOfDeath = cause;
    this.deathTime = time;
    this.brain.stop();
  }
}
