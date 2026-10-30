import { AGING, COMMUNITY, DAY, PERSON, WORLD } from '../config.js';
import { clamp01 } from '../core/MathUtils.js';
import { DecisionMaker } from '../ai/DecisionMaker.js';
import { DriveSet } from '../drives/DriveSet.js';
import { Inventory } from '../items/Inventory.js';
import { Knowledge } from '../tech/Knowledge.js';
import { Technologies } from '../tech/Technologies.js';
import { ActivityTrail } from './ActivityTrail.js';
import { Agent } from './Agent.js';
import { Apprenticeship } from './Apprenticeship.js';
import { BodyClimate } from './BodyClimate.js';
import { ExplorationMap } from './ExplorationMap.js';
import { LifeCourse } from './LifeCourse.js';
import { LifeHistory } from './LifeHistory.js';
import { Needs } from './Needs.js';
import { RelationshipBook } from './RelationshipBook.js';
import { Sex } from './Sex.js';
import { Skills } from './Skills.js';

const HOME_SHELTER_RADIUS = 8;
const FULL = 0.95;
const RUN_MEMORY = 10; // sn: koşmayı bıraktıktan sonra da bir süre "koşuyor" sayılır (hayvanlar ürker)

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
    this.skills = new Skills();
    this.knowledge = new Knowledge();
    this.inventory = new Inventory(PERSON.CARRY_CAPACITY * (0.7 + traits.strength * 0.6));
    this.drives = DriveSet.fromPersonality(personality);
    this.relations = new RelationshipBook(this, rng);
    this.exploration = new ExplorationMap(WORLD.SIZE, WORLD.EXPLORATION_CELL);
    this.brain = new DecisionMaker(this);
    this.history = new LifeHistory();
    this.climate = new BodyClimate(this);
    this.apprenticeship = new Apprenticeship(this);
    this.lifeCourse = new LifeCourse(this);

    this.alive = true;
    this.causeOfDeath = null;
    this.deathReport = null;
    this.trail = new ActivityTrail();
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
    this.lastRanAt = -Infinity;
    this.lastCaredAt = -Infinity; // bir büyüğün en son ilgilendiği an
    this.clothesWear = 0; // henüz işlenmemiş giyilme süresi (sn)
    this.share = new Inventory(); // köy merkezinde kendisini bekleyen pay
    this.foster = null; // annesi yoksa oylamayla seçilen süt annesi
    this.offenses = 0; // hesabı sorulan suçlar
    this.crimes = []; // hesabı sorulan suçların adları ("hırsızlık", "kavga" ...)
    this.thefts = 0; // görülen hırsızlıklar

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

  get isInfant() {
    return this.ageYears < AGING.INFANT_AGE;
  }

  /** Doğum yapan evli kadın ilk yıl iş yapmaz, su ve yiyecek dışında dışarı çıkmaz; kocası destek olur. */
  get isConfined() {
    return this.isFemale && Boolean(this.partner?.alive) && this.children.some((c) => c.alive && c.ageYears < AGING.CONFINEMENT_YEARS);
  }

  /** İş yapmaz, ihtiyaçlarında başkalarından destek görür. */
  get needsCare() {
    return this.isDependent || this.isConfined;
  }

  /** Bebeği kucağında taşıyan: annesi, o yoksa süt annesi. */
  get caretaker() {
    if (this.mother?.alive) return this.mother;
    return this.foster?.alive ? this.foster : null;
  }

  /** Bakanı olan bebek hep onun yanındadır. */
  get isCarried() {
    return this.isInfant && Boolean(this.caretaker);
  }

  /** Kendi başına yiyecek ve su arayamayacak kadar küçük: bakımı büyüklerdedir. */
  get isDependent() {
    return this.ageYears < AGING.SELF_CARE_AGE;
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

  /** Bakmakla yükümlü olduğu çocuklar: kendi çocukları ve aynı evdeki küçükler. */
  get wards() {
    const housemates = [...this.home.owners].filter((p) => p !== this && p.alive && p.needsCare);
    const daycare = this.group?.nanny === this ? this.group.daycareChildren : [];
    return [...new Set([...this.dependentChildren, ...housemates, ...daycare])];
  }

  /** Bebeğine ya da topluluğun çocuklarına bakıyor: lider emrine uyması beklenmez. */
  get isCaregiver() {
    if (this.group?.nanny === this || (this.isFemale && this.children.some((c) => c.alive && c.isInfant))) return true;
    return [...(this.group?.members ?? [])].some((m) => m.foster === this && m.isInfant);
  }

  /** Anne, baba, çocuk veya kardeş mi? */
  isCloseRelativeOf(other) {
    return other === this.mother || other === this.father || this.children.includes(other) || this.siblings.includes(other);
  }

  /** Hamileliğin kaçıncı ayı (1..9); hamile değilse 0. */
  pregnancyMonth(now) {
    if (!this.pregnancy) return 0;
    return Math.min(9, Math.floor((now - this.pregnancy.start) / (30 * DAY)) + 1);
  }

  relationTo(other) {
    return this.relations.get(other);
  }

  // ---------- Hareket ----------

  /** Küçük çocuk gündüz köy merkezinde bakıcısının yanında, değilse evinin çevresinde gezer. */
  roamArea(world) {
    if (this.isInfant || this.isConfined) return { center: this.home.position, radius: AGING.INFANT_ROAM };
    if (this.ageYears >= AGING.DAYCARE_AGE && this.group?.nanny && !world.clock.isNight) return { center: this.group.center, radius: COMMUNITY.DAYCARE_RADIUS };
    const [min, max] = AGING.TODDLER_ROAM;
    const radius = min + ((this.ageYears - AGING.INFANT_AGE) / (AGING.SELF_CARE_AGE - AGING.INFANT_AGE)) * (max - min);
    const guardian = this.mother?.alive ? this.mother : this.father;
    const nearby = guardian?.alive && guardian.position.distanceTo(this.home.position) <= radius;
    return { center: nearby ? guardian.position : this.home.position, radius };
  }

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
    if (speed >= this.runSpeed) this.lastRanAt = world.now;
    return super.moveTowards(target, speed * world.roads.speedFactor(this.position), dt, world);
  }

  isRunning(now) {
    return now - this.lastRanAt < RUN_MEMORY;
  }

  // ---------- Durum ----------

  get currentDrive() {
    return this.brain.currentDrive;
  }

  get activity() {
    if (!this.isCarried) return this.brain.activity;
    return this.caretaker === this.mother ? 'Annesinin kucağında' : `${this.caretaker.name} kucağında`;
  }

  get averageSkill() {
    return this.skills.average;
  }

  feltTemperature(world) {
    return this.climate.feltTemperature(world);
  }

  isAtHome() {
    return this.position.distanceTo(this.home.position) <= HOME_SHELTER_RADIUS;
  }

  /** Üstü kapalı bir yerde mi: yağıştan ve rüzgârdan korunur. */
  get isSheltered() {
    return this.isAtHome() && this.home.hasShelter;
  }


  // ---------- Döngü ----------

  update(world, dt) {
    if (!this.alive) return;
    this.lifeCourse.age(world, dt);
    if (!this.alive) return;

    this.trail.note(world.now, this.activity, this.currentDrive?.name);
    this.climate.updateWetness(world, dt);
    this.climate.wearClothes(world, dt);
    const harm = this.needs.update(dt, { feltTemperature: this.feltTemperature(world), endurance: this.traits.endurance });
    if (this.needs.health <= 0) return world.killPerson(this, harm ?? 'hastalık');

    this.status = clamp01(this.status - dt / PERSON.STATUS_DECAY_TIME);
    this.lifeCourse.updatePregnancy(world);
    this.#forgetOldGrievances(world.now);
    if (this.isCarried) return this.#stayWithCaretaker(world, dt);
    this.exploration.mark(this.position);
    this.brain.update(world, dt);
  }

  /** Bebek bakanıyla gezer, o tokken emerek beslenir; değilse verileni yer. */
  #stayWithCaretaker(world, dt) {
    const { caretaker } = this;
    this.position.set(caretaker.position.x, caretaker.position.y);
    this.needs.rest(dt, 1);
    this.needs.drink();
    if (caretaker.needs.food >= AGING.NURSE_MIN_FOOD) {
      this.needs.food = 1;
      caretaker.needs.food = Math.max(0, caretaker.needs.food - dt * AGING.NURSE_COST);
    } else {
      this.eatFrom(this.inventory, world);
    }
  }


  #forgetOldGrievances(now) {
    this.grievances = this.grievances.filter((g) => g.thief.alive && now - g.time < PERSON.GRIEVANCE_MEMORY);
  }

  // ---------- Beslenme ----------

  get canCook() {
    return this.knowledge.knows(Technologies.COOKING);
  }

  /** Bir depodan doyana kadar yer; pişirmeyi biliyor ve ateş başındaysa et ve balık pişirilir. */
  eatFrom(inventory, world) {
    const cooked = this.canCook && world.isNearLitFire(this.position);
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

  improveSkill(skill, hours, world) {
    this.apprenticeship.improveSkill(skill, hours, world);
  }

  improveRandomSkill(hours, world) {
    this.apprenticeship.improveRandomSkill(hours, world);
  }


  /** İşin süresini beceri ve özelliklere göre kısaltan çarpan (1 = ortalama). */
  workSpeed(skill, trait = 'strength') {
    return (0.6 + this.skills.get(skill) * 0.6 + this.traits[trait] * 0.4) * (this.group?.workBonus(skill) ?? 1);
  }

  // ---------- Sosyal ----------

  moveHome(home) {
    this.home?.removeOwner(this);
    this.home = home;
    home.addOwner(this);
  }

  /** Öfkeye yatkınlık (0..1): adalet duygusu zayıfsa ve açsa artar. */
  get temper() {
    const scruples = this.drives.get('justice').weight / 1.4;
    return clamp01(1 - scruples + (1 - this.needs.food) * 0.3);
  }

  get isSick() {
    return this.needs.health < COMMUNITY.SICK_HEALTH;
  }

  get isKnownThief() {
    return this.thefts >= 2;
  }

  dropGrievance(grievance) {
    this.grievances = this.grievances.filter((g) => g !== grievance);
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
