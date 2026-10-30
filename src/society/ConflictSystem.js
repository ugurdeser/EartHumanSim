import { CONFLICT } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { Turkish } from '../core/Turkish.js';
import { GroupChapter } from './GroupHistory.js';
import { Infidelity } from './conflict/Infidelity.js';
import { Justice } from './conflict/Justice.js';
import { Raids } from './conflict/Raids.js';
import { TheftCases } from './conflict/TheftCases.js';
import { Kinship } from './Kinship.js';

/**
 * İnsanlar arası çatışmanın kuralları: tartışma, kavga, kan davası, liderin yargısı,
 * aldatma, boşanma ve baskın. Sürtüşme ilk yıl düşüktür, köy oturdukça artar.
 */
export class ConflictSystem {
  constructor(world) {
    this.world = world;
    this.nextScan = 0;
    this.justice = new Justice(this);
    this.theft = new TheftCases(this);
    this.infidelity = new Infidelity(this);
    this.raids = new Raids(this);
  }

  get log() {
    return this.world.log;
  }

  get rng() {
    return this.world.rng;
  }

  /** Çatışma şiddeti (0..1): yeni kurulan köy birbirine muhtaçtır. */
  get intensity() {
    return Math.min(1, CONFLICT.FIRST_YEAR + CONFLICT.PER_YEAR * (this.world.calendar.year - 1));
  }

  // ---------- Gerilim ----------

  update() {
    const { now } = this.world;
    if (now < this.nextScan) return;
    this.nextScan = now + CONFLICT.SCAN_INTERVAL;
    const adults = this.world.people.filter((p) => p.isAdult);
    for (let i = 0; i < adults.length; i++) {
      for (let j = i + 1; j < adults.length; j++) this.#encounter(adults[i], adults[j]);
    }
  }

  #encounter(a, b) {
    if (a.position.distanceTo(b.position) > CONFLICT.QUARREL_RANGE) return;
    const { tension, reason } = this.#tension(a, b);
    const chance = tension * CONFLICT.QUARREL_CHANCE * this.intensity * (0.5 + (a.temper + b.temper) / 2);
    if (tension > 0 && this.rng.chance(chance)) this.quarrel(a, b, reason);
  }

  /** İki kişi arasındaki en büyük gerilim ve sebebi. */
  #tension(a, b) {
    const dislike = Math.max(0, -(a.relations.peek(b)?.affinity ?? 0), -(b.relations.peek(a)?.affinity ?? 0));
    const causes = [[dislike, 'eski husumet yüzünden']];
    if (a.needs.food < CONFLICT.HUNGRY && b.needs.food < CONFLICT.HUNGRY) causes.push([CONFLICT.SCARCITY_TENSION, 'yiyecek yüzünden']);
    if (a.group?.isRival(b.group)) causes.push([CONFLICT.RIVAL_TENSION, 'topluluk düşmanlığı yüzünden']);
    if (ConflictSystem.#isTempting(a, b) || ConflictSystem.#isTempting(b, a)) causes.push([CONFLICT.JEALOUSY_TENSION, 'kıskançlık yüzünden']);
    const [tension, reason] = causes.reduce((best, cause) => (cause[0] > best[0] ? cause : best));
    return { tension, reason };
  }

  /** `other`, `person`in eşine göz koymuş mu? */
  static #isTempting(person, other) {
    const { partner } = person;
    return Boolean(partner) && partner !== other && (other.relations.peek(partner)?.attraction ?? 0) >= CONFLICT.JEALOUS_ATTRACTION;
  }

  /** Sohbet her zaman iyi bitmez: yeni husumetlerin tohumu budur. */
  soursChat(a, b) {
    const chance = CONFLICT.FRICTION * this.intensity * (a.temper + b.temper);
    if (!this.rng.chance(chance)) return false;
    this.quarrel(a, b, 'bir söz yüzünden');
    return true;
  }

  // ---------- Tartışma ve kavga ----------

  quarrel(a, b, reason) {
    const { now } = this.world;
    const relation = a.relationTo(b);
    if (now - relation.lastQuarrel < CONFLICT.QUARREL_COOLDOWN) return;
    relation.lastQuarrel = now;
    for (const [x, y] of [[a, b], [b, a]]) {
      x.relationTo(y).changeAffinity(-CONFLICT.QUARREL_AFFINITY);
      x.relationTo(y).changeRespect(-CONFLICT.QUARREL_RESPECT);
    }
    this.log.add(`😠 ${a.name} ve ${b.name} ${reason} tartıştı`, LogType.CONFLICT, [a, b]);

    const anger = Math.max(0, -a.relationTo(b).affinity, -b.relationTo(a).affinity) * (a.temper + b.temper);
    if (this.rng.chance(anger * CONFLICT.ESCALATION * this.intensity)) this.fight(a, b, reason);
  }

  /** `attacker` başlatır; yakındaki biri ayırabilir. Kaybedeni döndürür (ayrıldılarsa null). */
  fight(attacker, defender, reason) {
    const peacemaker = this.world.peopleNear(attacker.position, CONFLICT.PEACEMAKER_RANGE, attacker).find((p) => p !== defender && p.isAdult && this.rng.chance(CONFLICT.PEACEMAKER_CHANCE));
    if (peacemaker) {
      peacemaker.changeStatus(0.03);
      for (const person of [attacker, defender]) person.relationTo(peacemaker).changeRespect(0.05);
      this.log.add(`🕊 ${peacemaker.name}, ${attacker.name} ile ${Turkish.accusative(defender.name)} ayırdı`, LogType.CONFLICT, [peacemaker, attacker, defender]);
      this.#recordFight(attacker, defender, `🕊 ${peacemaker.name}, ${attacker.name} ile ${Turkish.accusative(defender.name)} ayırdı (${reason})`);
      return null;
    }

    const [winner, loser] = this.#power(attacker) >= this.#power(defender) ? [attacker, defender] : [defender, attacker];
    for (const [x, y] of [[attacker, defender], [defender, attacker]]) x.relationTo(y).changeAffinity(-CONFLICT.FIGHT_AFFINITY);
    loser.relationTo(winner).changeRespect(0.05);
    winner.changeStatus(0.03);
    loser.changeStatus(-0.03);
    this.log.add(`👊 ${attacker.name} ile ${defender.name} ${reason} kavga etti, ${winner.name} kazandı`, LogType.CONFLICT, [attacker, defender]);
    this.#recordFight(attacker, defender, `👊 ${attacker.name} ile ${defender.name} ${reason} kavga etti, ${winner.name} kazandı`);
    this.#report(attacker, `${reason} kavga`);
    this.#wound(winner, loser);
    return loser;
  }

  /** Kavga, tarafların topluluklarının hikâyesine geçer. */
  #recordFight(a, b, message) {
    for (const group of new Set([a.group, b.group])) group?.record(this.world, GroupChapter.CONFLICT, message);
  }

  #power(person) {
    const { strength, agility } = person.traits;
    return strength * 0.6 + agility * 0.2 + person.skills.get('hunting') * 0.2 + this.rng.range(0, CONFLICT.FIGHT_LUCK);
  }

  /** Yara genelde iyileşir; nadiren ölümcül olur ve kan davası başlar. */
  #wound(winner, loser) {
    if (this.rng.chance(CONFLICT.LETHAL_CHANCE * this.intensity)) {
      this.world.killPerson(loser, `${Turkish.genitive(winner.name)} darbesi`);
      winner.offenses += CONFLICT.MURDER_OFFENSES;
      this.#startFeud(winner, loser);
      return;
    }
    const [min, max] = CONFLICT.WOUND;
    loser.takeDamage(Math.min(this.rng.range(min, max), loser.needs.health - CONFLICT.MIN_HEALTH), this.world, 'kavga');
  }

  #startFeud(killer, victim) {
    const avengers = Kinship.closeRelatives(victim).filter((r) => r.alive && r.isAdult && r !== killer);
    for (const avenger of avengers) {
      avenger.relationTo(killer).changeAffinity(-CONFLICT.FEUD_AFFINITY);
      avenger.addGrievance({ thief: killer, victimHome: null, portions: 0, time: this.world.now, crime: `${victim.name} adlı kişiyi öldürmek`, kind: 'cinayet' });
    }
    if (avengers.length) this.log.add(`🩸 ${victim.name} öldürüldü, yakınları ${Turkish.dative(killer.name)} kan davası güdüyor`, LogType.DANGER, [killer, ...avengers]);
    this.markRivals(killer.group, victim.group);
  }

  /** Olayı görenler suçludan şikâyetçi olur. */
  #report(offender, crime) {
    const { now } = this.world;
    for (const witness of this.world.peopleNear(offender.position, CONFLICT.WITNESS_RANGE, offender)) {
      if (witness.isAdult) witness.addGrievance({ thief: offender, victimHome: null, portions: 0, time: now, crime, kind: 'kavga' });
    }
  }

  markRivals(a, b, reason) {
    if (!a || !b || a === b || a.isRival(b)) return;
    a.markRival(b);
    a.record(this.world, GroupChapter.CONFLICT, `💢 ${b.name} ile düşman olundu: ${reason}`);
    b.record(this.world, GroupChapter.CONFLICT, `💢 ${a.name} ile düşman olundu: ${reason}`);
  }

  // ---------- Alt konular ----------

  complain(person, leader, grievance) {
    this.justice.complain(person, leader, grievance);
  }

  judge(judge, grievance) {
    this.justice.judge(judge, grievance);
  }

  temptation(person, home) {
    return this.theft.temptation(person, home);
  }

  reportTheft(thief, home, portions) {
    this.theft.reportTheft(thief, home, portions);
  }

  affair(cheater, lover) {
    return this.infidelity.affair(cheater, lover);
  }

  raid(raider, home) {
    this.raids.raid(raider, home);
  }
}
