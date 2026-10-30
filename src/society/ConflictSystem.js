import { CONFLICT } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { Turkish } from '../core/Turkish.js';
import { Kinship } from './Kinship.js';

/**
 * İnsanlar arası çatışmanın kuralları: tartışma, kavga, kan davası, liderin yargısı,
 * aldatma, boşanma ve baskın. Sürtüşme ilk yıl düşüktür, köy oturdukça artar.
 */
export class ConflictSystem {
  constructor(world) {
    this.world = world;
    this.nextScan = 0;
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
      return null;
    }

    const [winner, loser] = this.#power(attacker) >= this.#power(defender) ? [attacker, defender] : [defender, attacker];
    for (const [x, y] of [[attacker, defender], [defender, attacker]]) x.relationTo(y).changeAffinity(-CONFLICT.FIGHT_AFFINITY);
    loser.relationTo(winner).changeRespect(0.05);
    winner.changeStatus(0.03);
    loser.changeStatus(-0.03);
    this.log.add(`👊 ${attacker.name} ile ${defender.name} ${reason} kavga etti, ${winner.name} kazandı`, LogType.CONFLICT, [attacker, defender]);
    this.#report(attacker);
    this.#wound(winner, loser);
    return loser;
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
      avenger.addGrievance({ thief: killer, victimHome: null, portions: 0, time: this.world.now });
    }
    if (avengers.length) this.log.add(`🩸 ${victim.name} öldürüldü, yakınları ${Turkish.dative(killer.name)} kan davası güdüyor`, LogType.DANGER, [killer, ...avengers]);
    this.#markRivals(killer.group, victim.group);
  }

  /** Olayı görenler suçludan şikâyetçi olur. */
  #report(offender) {
    const { now } = this.world;
    for (const witness of this.world.peopleNear(offender.position, CONFLICT.WITNESS_RANGE, offender)) {
      if (witness.isAdult) witness.addGrievance({ thief: offender, victimHome: null, portions: 0, time: now });
    }
  }

  #markRivals(a, b) {
    if (a && b && a !== b) a.markRival(b);
  }

  // ---------- Yargı ----------

  /** Şikâyetçi derdini lidere anlatır; artık hesabı lider sorar. */
  complain(person, leader, grievance) {
    leader.addGrievance(grievance);
    person.dropGrievance(grievance);
    this.log.personal([person, leader], `🗣 ${person.name}, ${Turkish.dative(leader.name)} ${Turkish.accusative(grievance.thief.name)} şikâyet etti`, LogType.CONFLICT);
  }

  judge(judge, grievance) {
    const { thief: offender, victimHome, portions } = grievance;
    offender.offenses++;
    offender.changeStatus(-0.12);
    judge.changeStatus(0.04);
    judge.relationTo(offender).changeAffinity(-0.2);
    offender.relationTo(judge).changeAffinity(-0.2);
    offender.relationTo(judge).changeRespect(0.1);
    if (victimHome) offender.inventory.transferTo(victimHome.storage, (t) => t.isFood, portions);
    // Aynı suç için diğer tanıkların şikâyeti de kapanır
    for (const person of this.world.people) person.resolveGrievance(offender, victimHome);
    const isLeader = offender.group?.leader === judge;
    const verdict = isLeader ? this.#sentence(judge, offender) : 'hesap sordu';
    this.log.add(`⚖ ${judge.name}, ${Turkish.ablative(offender.name)} ${verdict}`, LogType.CONFLICT, [judge, offender]);
  }

  /** Liderin cezası suç sayısına göre ağırlaşır; topluluk bunun adil olup olmadığını tartar. */
  #sentence(leader, offender) {
    const group = offender.group;
    const members = group.adults.filter((m) => m !== leader && m !== offender);
    const judged = (delta) => members.forEach((m) => m.relationTo(leader).changeRespect(delta));
    if (leader.isCloseRelativeOf(offender) || leader.relationTo(offender).affinity > CONFLICT.FAVOUR_AFFINITY) {
      judged(-CONFLICT.UNFAIR_RESPECT);
      return 'hesap sordu ama kayırıp serbest bıraktı';
    }
    if (offender.offenses >= CONFLICT.EXILE_OFFENSES) {
      for (const member of members) member.relationTo(leader).changeRespect(member.relationTo(offender).affinity > 0.4 ? -CONFLICT.UNFAIR_RESPECT : CONFLICT.FAIR_RESPECT);
      group.ban(offender);
      this.world.social.groups.leave(offender);
      return `hesap sordu ve onu ${group.name} topluluğundan sürdü`;
    }
    judged(CONFLICT.FAIR_RESPECT);
    if (offender.offenses < CONFLICT.FINE_OFFENSES) return 'hesap sordu ve uyardı';
    offender.home.storage.transferTo(leader.home.storage, (t) => t.isFood, CONFLICT.FINE_PORTIONS);
    return 'hesap sordu ve yiyecek cezası verdi';
  }

  // ---------- Hırsızlık ----------

  /** Görülmeyen hırsızlıkta failin kim olduğu bilinmez. */
  reportTheft(thief, home, portions) {
    const owners = [...home.owners];
    const witnesses = this.world.peopleNear(thief.position, CONFLICT.WITNESS_RANGE, thief).filter((p) => p.isAdult);
    if (witnesses.length === 0) {
      this.log.personal(owners, `🕵 Deposundan ${portions} parça eşya kayboldu, kimin aldığı görülmedi`, LogType.CONFLICT);
      return;
    }
    thief.thefts++;
    thief.changeStatus(-0.05);
    this.log.add(`🕵 ${thief.name} başkasının deposundan ${portions} parça çalarken görüldü`, LogType.CONFLICT, [thief]);
    this.#markRivals(thief.group, owners[0]?.group);
    for (const person of witnesses) {
      person.relationTo(thief).changeAffinity(-0.15);
      person.addGrievance({ thief, victimHome: home, portions, time: this.world.now });
    }
    // İtibar: tanınmış hırsıza kimse güvenmez
    if (thief.isKnownThief) thief.group?.adults.forEach((m) => m !== thief && m.relationTo(thief).changeAffinity(-CONFLICT.THIEF_DISTRUST));
  }

  // ---------- Eş ilişkileri ----------

  /** Birlikte olursa çocuk da olabilir; görülürse aldatılan eş öğrenir. */
  affair(cheater, lover) {
    if (!lover.alive || (lover.relations.peek(cheater)?.attraction ?? 0) < CONFLICT.AFFAIR_CONSENT) return false;
    this.world.social.mate(cheater, lover);
    this.log.personal([cheater, lover], `🤫 ${cheater.name} ile ${lover.name} gizlice birlikte oldu`, LogType.LOVE);
    for (const [person, other] of [[cheater, lover], [lover, cheater]]) {
      if (person.partner?.alive && this.rng.chance(CONFLICT.DISCOVERY_CHANCE)) this.#discover(person, other);
    }
    return true;
  }

  #discover(cheater, lover) {
    const spouse = cheater.partner;
    if (!spouse) return;
    const trust = spouse.relationTo(cheater);
    trust.changeAffinity(-CONFLICT.BETRAYAL_AFFINITY);
    trust.changeAttraction(-CONFLICT.BETRAYAL_ATTRACTION);
    spouse.relationTo(lover).changeAffinity(-CONFLICT.BETRAYAL_AFFINITY);
    this.log.add(`💔 ${spouse.name}, ${Turkish.genitive(cheater.name)} kendisini ${Turkish.dative(lover.name)} aldattığını öğrendi`, LogType.LOVE, [spouse, cheater]);
    this.quarrel(spouse, cheater, 'aldatma yüzünden');
    if (trust.affinity < CONFLICT.DIVORCE_AFFINITY && cheater.partner === spouse) this.world.social.divorce(spouse, cheater);
  }

  // ---------- Topluluklar arası ----------

  /** Rakip yuvasından yiyecek çalmak; ev sahibi oradaysa kavga çıkar. */
  raid(raider, home) {
    const taken = home.storage.transferTo(raider.inventory, (t) => t.isFood, CONFLICT.RAID_PORTIONS);
    const owners = [...home.owners];
    this.log.add(`⚔ ${raider.name}, ${home.label} deposuna baskın yaptı (${taken} yiyecek)`, LogType.CONFLICT, [raider, ...owners]);
    this.#markRivals(raider.group, owners[0]?.group);
    const defender = owners.find((o) => o.alive && o.isAdult && o.position.distanceTo(home.position) <= CONFLICT.DEFEND_RANGE);
    if (defender) this.fight(raider, defender, 'baskın yüzünden');
  }
}
