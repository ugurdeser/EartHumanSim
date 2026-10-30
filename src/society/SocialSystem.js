import { Turkish } from '../core/Turkish.js';
import { REPRODUCTION } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { Kinship } from './Kinship.js';
import { ConflictSystem } from './ConflictSystem.js';
import { FamilyRegistry } from './FamilyRegistry.js';
import { GroupManager } from './GroupManager.js';

const COUPLE_ATTRACTION_THRESHOLD = 0.55;
const PROPOSAL_ACCEPT_THRESHOLD = 0.45;

const PLAY_HOURS = 1 / 3; // oyun da pratiktir

/** Kişiler arası etkileşimlerin kuralları (çift olma, hediye, hırsızlık, ceza ...). */
export class SocialSystem {
  constructor(world) {
    this.world = world;
    this.groups = new GroupManager(world);
    this.families = new FamilyRegistry(world);
    this.conflicts = new ConflictSystem(world);
  }

  update() {
    this.groups.update(this.world);
    this.conflicts.update();
  }

  get log() {
    return this.world.log;
  }

  // ---------- Bağlılık / Oyun ----------

  chat(a, b) {
    if (this.conflicts.soursChat(a, b)) return;
    a.relationTo(b).changeAffinity(0.1);
    b.relationTo(a).changeAffinity(0.1);
    this.groups.meet(a, b);
    // Sohbet bilgi paylaşımıdır: iki taraf da birbirine bir şey öğretebilir
    this.world.invention.tryTeach(a, b);
    this.world.invention.tryTeach(b, a);
  }

  play(a, b) {
    a.relationTo(b).changeAffinity(0.08);
    b.relationTo(a).changeAffinity(0.08);
    a.improveRandomSkill(PLAY_HOURS, this.world);
    b.improveRandomSkill(PLAY_HOURS, this.world);
    this.world.invention.tryInvent(a, 0.3);
  }

  // ---------- Üreme ----------

  /** Cezbetmek: hedefin kişiye duyduğu çekimi artırır. */
  impress(actor, target) {
    const gain = (0.03 + actor.status * 0.06 + actor.averageSkill * 0.03) * (0.5 + actor.traits.charm);
    target.relationTo(actor).changeAttraction(gain);
    actor.relationTo(target).changeAttraction(0.03);
    this.tryFormCouple(actor, target);
  }

  /** Yetişkin, karşı cins ve yakın akraba olmayan iki kişi eş olabilir. */
  canPair(a, b) {
    return a !== b && a.isAdult && b.isAdult && a.sex !== b.sex && !a.isCloseRelativeOf(b);
  }

  /** Çocuk yalnızca evli çiftlerden olur. */
  acceptsMating(target, suitor) {
    return target.alive && target.partner === suitor;
  }

  /** Evlenme teklifi: hedef bekârsa ve teklif edene yeterince çekim duyuyorsa kabul eder. */
  propose(suitor, target) {
    const accepted =
      target.alive &&
      !suitor.partner &&
      !target.partner &&
      this.canPair(suitor, target) &&
      target.relationTo(suitor).attraction >= PROPOSAL_ACCEPT_THRESHOLD;
    if (accepted) {
      this.#marry(suitor, target);
      return true;
    }
    const relation = suitor.relationTo(target);
    relation.rejectedAt = this.world.now;
    relation.changeAttraction(-0.15);
    this.log.personal([suitor], `🙅 ${Turkish.dative(target.name)} evlenme teklif etti, reddedildi`, LogType.LOVE);
    return false;
  }

  mate(a, b) {
    a.drives.get('desire').relieve(1);
    b.drives.get('desire').relieve(1);
    a.relationTo(b).changeAttraction(0.05);
    b.relationTo(a).changeAttraction(0.05);
    this.tryFormCouple(a, b);

    const mother = a.isFemale ? a : b;
    const father = mother === a ? b : a;
    if (mother.canConceive && this.world.rng.chance(REPRODUCTION.CONCEPTION_CHANCE)) {
      mother.pregnancy = { father, start: this.world.now };
      this.log.add(`🤰 ${mother.name} hamile kaldı`, LogType.LIFE, [mother, father]);
    }
  }

  tryFormCouple(a, b) {
    if (a.partner || b.partner || !this.canPair(a, b)) return false;
    const mutual =
      a.relationTo(b).attraction >= COUPLE_ATTRACTION_THRESHOLD &&
      b.relationTo(a).attraction >= COUPLE_ATTRACTION_THRESHOLD;
    if (!mutual) return false;
    this.#marry(a, b);
    return true;
  }

  #marry(a, b) {
    a.partner = b;
    b.partner = a;
    const family = this.#foundFamily(a, b);
    const [husband, wife] = a.isFemale ? [b, a] : [a, b];
    this.groups.uniteCouple(husband, wife);
    this.log.add(`💍 ${a.name} ve ${b.name} evlendi, ${family.name} kuruldu`, LogType.LOVE, [a, b]);
    for (const spouse of [a, b]) this.#notifyParents(spouse, `💍 ${Kinship.childWord(spouse)} ${spouse.name} evlendi`);
  }

  /** Çift, barınağı daha gelişmiş olan yuvada yeni bir aile kurar; diğer yuvanın erzağı taşınır. */
  #foundFamily(a, b) {
    const [husband, wife] = a.isFemale ? [b, a] : [a, b];
    const [keep, drop] = a.home.shelterLevel >= b.home.shelterLevel ? [a.home, b.home] : [b.home, a.home];
    if (drop !== keep) drop.storage.transferTo(keep.storage);

    const family = this.families.found(husband, wife, keep);
    if (drop !== keep && drop.owners.size === 0) this.world.removeHome(drop);
    return family;
  }

  /** Boşanma: bakılan çocuklar annede kalır, erkek kendi yuvasını kurar. */
  divorce(a, b) {
    a.partner = null;
    b.partner = null;
    for (const [x, y] of [[a, b], [b, a]]) x.relationTo(y).changeAttraction(-0.5);
    const leaver = a.isFemale ? b : a;
    this.log.add(`💔 ${a.name} ve ${b.name} boşandı`, LogType.LOVE, [a, b]);
    this.families.leave(leaver);
    this.world.settleAlone(leaver);
  }

  // ---------- Statü ----------

  /** Yiyecek zaten alıcının üzerine aktarılmıştır; burada sosyal sonuçları işlenir. */
  giveGift(giver, receiver) {
    giver.changeStatus(0.08);
    const relation = receiver.relationTo(giver);
    relation.changeAffinity(0.15);
    relation.changeRespect(0.15);
    this.log.personal([giver, receiver], `🎁 ${giver.name}, ${Turkish.dative(receiver.name)} yiyecek verdi`, LogType.SOCIAL);
  }

  showOff(actor) {
    actor.changeStatus(0.03 + actor.averageSkill * 0.03);
    for (const observer of this.world.peopleNear(actor.position, 30, actor)) {
      observer.relationTo(actor).changeRespect(0.05);
    }
  }

  // ---------- Adalet ----------

  reportTheft(thief, home, portions) {
    this.conflicts.reportTheft(thief, home, portions);
  }

  punish(judge, grievance) {
    this.conflicts.judge(judge, grievance);
  }

  #notifyParents(person, message) {
    this.log.personal([person.mother, person.father].filter((p) => p?.alive), message, LogType.LIFE);
  }

  // ---------- Ölüm ----------

  handleDeath(person) {
    if (person.partner) {
      person.partner.partner = null;
      this.log.add(`💔 ${person.partner.name} eşini kaybetti`, LogType.LOVE);
    }
    this.groups.remove(person);
    person.home.removeOwner(person);
    this.families.prune();
  }
}
