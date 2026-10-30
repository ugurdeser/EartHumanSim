import { AGING, COMMUNITY, CONFLICT } from '../config.js';
import { Inventory } from '../items/Inventory.js';
import { GroupCare } from './group/GroupCare.js';
import { GroupCommand } from './group/GroupCommand.js';
import { GroupLeadership } from './group/GroupLeadership.js';
import { GroupProvisions } from './group/GroupProvisions.js';
import { GroupHistory } from './GroupHistory.js';
import { Constitution } from './laws/Constitution.js';
import { LawMaking } from './laws/LawMaking.js';

/** Topluluk: üyeleri, seçtikleri lider ve liderin o anki emri. */
export class Group {
  constructor(id, color, center) {
    this.id = id;
    this.name = `Topluluk ${id}`;
    this.color = color;
    this.center = center; // köy merkezi: emirle üretilenler burada toplanıp bölüşülür
    this.pot = new Inventory(); // bölüşülmeyi bekleyen ürünler
    this.nextShare = 0;
    this.workers = new Set(); // bu emirde ürün getirenler
    this.orderWorkers = new Set(); // emir boyunca çalışanlar (hikâye için)
    this.members = new Set();
    this.leader = null;
    this.nanny = null; // gündüz çocuklara bakan kadın
    this.order = null;
    this.nextElection = 0;
    this.nextOrder = 0;
    this.nextUnrest = 0;
    this.deposed = null; // devrilen lider yeniden seçilemez
    this.rivals = new Set();
    this.banned = new Set();
    this.history = new GroupHistory();
    this.founders = []; // kurucular yaşadıkça lider ancak onlardan olur
    this.dynasty = new Set(); // liderlik etmiş kişiler (soydan geçiş için)
    this.constitution = new Constitution();
    this.lawMaking = new LawMaking(this);
    this.flag = null;
    this.care = new GroupCare(this);
    this.provisions = new GroupProvisions(this);
    this.command = new GroupCommand(this);
    this.leadership = new GroupLeadership(this);
  }

  /** Topluluğun hikâyesine yazar. */
  record(world, chapter, message) {
    this.history.add(chapter, world.calendar.format(), message);
  }

  get size() {
    return this.members.size;
  }

  get adults() {
    return [...this.members].filter((m) => m.alive && m.isAdult);
  }

  /** Gündüz bakıma gelen çocuklar (bebekler annesiyle kalır). */
  get daycareChildren() {
    return [...this.members].filter((m) => m.alive && m.isDependent && m.ageYears >= AGING.DAYCARE_AGE);
  }

  /** Üyelerin yuvalarındaki toplam erzak. */
  get stock() {
    const homes = [...new Set(this.adults.map((m) => m.home))];
    return {
      homes: homes.length,
      food: homes.reduce((sum, h) => sum + h.storage.foodCount, this.pot.foodCount),
      fuelSeconds: homes.reduce((sum, h) => sum + h.storage.fuelSeconds, this.pot.fuelSeconds),
      count: (type) => homes.reduce((sum, h) => sum + h.storage.count(type), this.pot.count(type)),
    };
  }

  isRival(other) {
    return Boolean(other) && this.rivals.has(other);
  }

  markRival(other) {
    this.rivals.add(other);
    other.rivals.add(this);
  }

  ban(person) {
    this.banned.add(person);
  }

  /** Liderin yakınındaki, yiyeceği olan en yakın rakip yuva. */
  raidTarget() {
    const from = this.leader?.position;
    if (!from) return null;
    const homes = [...this.rivals].flatMap((g) => g.adults.map((m) => m.home)).filter((h) => h.storage.foodCount > 0 && h.position.distanceTo(from) <= CONFLICT.RAID_RANGE);
    return homes.sort((a, b) => a.position.distanceTo(from) - b.position.distanceTo(from))[0] ?? null;
  }

  knows(technology) {
    return this.adults.some((m) => m.knowledge.knows(technology));
  }

  /** Emrin çalışma hızı çarpanı: lider ne kadar deneyimliyse o kadar yüksek. */
  get orderBonus() {
    return 1 + COMMUNITY.BONUS_BASE + COMMUNITY.BONUS_LEADERSHIP * this.leader.skills.get('leadership');
  }

  /** Emir verilen işte çalışanın hız çarpanı. */
  workBonus(skill) {
    return this.order?.skills.includes(skill) ? this.orderBonus : 1;
  }

  add(person) {
    this.members.add(person);
    person.group = this;
  }

  remove(person) {
    this.members.delete(person);
    if (person.group === this) person.group = null;
    if (this.nanny === person) this.nanny = null;
    if (this.leader === person) {
      this.leader = null;
      this.order = null;
      this.nextElection = 0;
    }
  }

  update(world) {
    const now = world.now;
    if (now >= this.nextShare) {
      this.provisions.share(world);
      this.care.appointNanny(world);
      this.care.placeOrphans(world);
    }
    if (now >= this.nextElection) this.leadership.elect(world);
    if (this.leader && now >= this.nextUnrest) {
      this.leadership.checkUnrest(world);
      this.leadership.checkLoyalty(world);
    }
    if (this.leader && now >= this.nextOrder) this.command.issueOrder(world);
    this.lawMaking.update(world);
  }

  /** Emir süresince ürün getiren üye. */
  recordWork(person) {
    this.workers.add(person);
  }

}
