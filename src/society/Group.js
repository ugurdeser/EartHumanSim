import { AGING, COMMUNITY, CONFLICT } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { Inventory } from '../items/Inventory.js';
import { COMMUNITY_ORDERS } from './CommunityOrders.js';

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
      this.#share(world);
      this.#appointNanny(world);
      this.#placeOrphans(world);
    }
    if (now >= this.nextElection) this.#elect(world);
    if (this.leader && now >= this.nextUnrest) {
      this.#checkUnrest(world);
      this.#checkLoyalty(world);
    }
    if (this.leader && now >= this.nextOrder) this.#issueOrder(world);
  }

  /** Annesiz bebeğe oylamayla süt annesi seçilir; 2 yaşına gelen bebek babasına döner. */
  #placeOrphans(world) {
    for (const child of this.members) {
      if (child.foster && !child.isInfant) this.#returnToFather(child, world);
      else if (child.alive && child.isInfant && !child.caretaker) this.#voteFoster(child, world);
    }
  }

  /** Her yetişkin en güvendiği kadına oy verir; bakma isteği de tartılır. */
  #voteFoster(child, world) {
    const women = this.adults.filter((m) => m.isFemale);
    if (women.length === 0) return;
    const votes = new Map();
    for (const voter of this.adults) {
      const score = (w) => (voter === w ? 1 : voter.relations.peek(w)?.affinity ?? 0) + w.drives.get('nurture').weight * COMMUNITY.FOSTER_NURTURE;
      const choice = women.reduce((best, w) => (score(w) > score(best) ? w : best));
      votes.set(choice, (votes.get(choice) ?? 0) + 1);
    }
    const [winner, count] = [...votes].reduce((best, entry) => (entry[1] > best[1] ? entry : best));
    child.foster = winner;
    world.log.add(`🗳 ${this.name} oyladı (${count} oy): ${child.name} bebeğine ${winner.name} bakacak`, LogType.SOCIAL, [child, winner]);
  }

  /** Babası yoksa süt annesinin hanesinde kalır. */
  #returnToFather(child, world) {
    const { foster, father } = child;
    child.foster = null;
    const parent = father?.alive ? father : foster;
    if (parent?.family) parent.family.add(child);
    else if (parent) child.moveHome(parent.home);
    if (parent === father) world.log.add(`👶 ${foster.name}, ${child.name} bebeğini babası ${father.name} adlı kişiye geri verdi`, LogType.LIFE, [child, foster, father]);
  }

  /** Çocuk varsa en şefkatli kadın gündüzleri onlara bakar; çocuk kalmazsa görev biter. */
  #appointNanny(world) {
    if (this.daycareChildren.length === 0) {
      this.nanny = null;
      return;
    }
    if (this.nanny?.alive && !this.nanny.isConfined) return;
    const women = this.adults.filter((m) => m.isFemale && !m.isConfined);
    if (women.length === 0) return;
    this.nanny = women.reduce((best, w) => (w.drives.get('nurture').weight > best.drives.get('nurture').weight ? w : best));
    world.log.add(`👩 ${this.nanny.name}, ${this.name} çocuklarına bakmaya başladı`, LogType.SOCIAL, [this.nanny]);
  }

  /** Yetişkin tam, çocuk yarım pay alır; çocuğun payını evindeki yetişkin taşır. Artan kalır. */
  #share(world) {
    this.nextShare = world.now + COMMUNITY.SHARE_INTERVAL;
    const shares = [...this.members].flatMap((m) => {
      const carrier = m.isAdult ? m : [...m.home.owners].find((o) => o.alive && o.isAdult);
      return carrier ? [{ carrier, weight: m.isAdult ? 1 : COMMUNITY.CHILD_SHARE }] : [];
    });
    const total = shares.reduce((sum, s) => sum + s.weight, 0);
    if (total === 0) return;
    const shared = [];
    for (const { type, count } of this.pot.entries()) {
      const each = count / total;
      if (each < 1) continue;
      for (const { carrier, weight } of shares) {
        const amount = Math.floor(each * weight);
        this.pot.remove(type, amount);
        carrier.share.add(type, amount);
      }
      shared.push(`${Math.floor(each)} ${type.name.toLocaleLowerCase('tr')}`);
    }
    if (shared.length) world.log.add(`🤲 ${this.name} ürünleri bölüştü: yetişkin başı ${shared.join(', ')}`, LogType.SOCIAL, this.adults);
  }

  /** Emir süresince ürün getiren üye. */
  recordWork(person) {
    this.workers.add(person);
  }

  /** Kıtlıkta herkes kendi derdindedir: emre uymamak suç sayılmaz. */
  get #isStarving() {
    const adults = this.adults;
    const hunger = adults.reduce((sum, m) => sum + m.needs.food, 0) / adults.length;
    return this.stock.food < this.size * COMMUNITY.FAMINE_FOOD_PER_HEAD || hunger < COMMUNITY.FAMINE_HUNGER;
  }

  /** Emir süresi biterken çalışmayan üye sevilmemeye başlar; hasta, aç ve bakım verenler hariç. */
  #judgeShirkers(world) {
    const adults = this.adults;
    const excused = adults.length === 0 || this.#isStarving;
    for (const shirker of excused ? [] : adults) {
      if (this.workers.has(shirker) || shirker.isSick || shirker.isCaregiver || shirker.needs.food < COMMUNITY.HUNGRY_FOOD) continue;
      for (const member of adults) {
        if (member === shirker) continue;
        member.relationTo(shirker).changeAffinity(-COMMUNITY.SHIRK_AFFINITY);
        member.relationTo(shirker).changeRespect(-COMMUNITY.SHIRK_RESPECT);
      }
      shirker.changeStatus(-COMMUNITY.SHIRK_STATUS);
      world.log.add(`😒 ${shirker.name} emre uymadı, ${this.name} ondan soğuyor`, LogType.CONFLICT, [shirker]);
    }
    this.workers.clear();
  }

  /** Üyelerin saygı duyduğu, statüsü ve yeteneği yüksek yetişkin lider olur. */
  #elect(world) {
    this.nextElection = world.now + COMMUNITY.ELECTION_INTERVAL;
    const adults = this.adults.filter((a) => a !== this.deposed);
    if (adults.length < COMMUNITY.MIN_ADULTS) {
      this.leader = null;
      this.order = null;
      this.nextElection = world.now + COMMUNITY.RETRY_INTERVAL;
      return;
    }
    const winner = adults.reduce((best, c) => (Group.#standing(c, adults) > Group.#standing(best, adults) ? c : best));
    if (winner === this.leader) return;
    this.leader = winner;
    this.order = null;
    this.nextOrder = 0;
    winner.changeStatus(0.1);
    world.log.add(`👑 ${winner.name}, ${this.name} lideri oldu`, LogType.SOCIAL, [winner]);
  }

  /** Saygısını yitiren lider devrilir; onu hâlâ sevenlerle ayrılıp yeni topluluk kurar. */
  #checkUnrest(world) {
    this.nextUnrest = world.now + CONFLICT.UNREST_INTERVAL;
    const old = this.leader;
    const others = this.adults.filter((a) => a !== old);
    if (others.length < COMMUNITY.MIN_ADULTS) return;
    const respect = others.reduce((sum, a) => sum + (a.relations.peek(old)?.respect ?? 0), 0) / others.length;
    if (respect >= CONFLICT.UNREST_RESPECT) return;
    this.leader = null;
    this.order = null;
    this.deposed = old;
    this.nextElection = 0;
    old.changeStatus(-0.2);
    world.log.add(`✊ ${this.name} üyeleri lideri ${old.name} görevden indirdi`, LogType.CONFLICT, [old]);
    const supporters = others.filter((a) => (a.relations.peek(old)?.affinity ?? 0) > CONFLICT.SUPPORTER_AFFINITY);
    if (supporters.length === 0) return;
    const split = world.social.groups.split(this, [old, ...supporters]);
    world.log.add(`⚡ ${old.name} destekçileriyle ayrıldı: ${split.name} kuruldu`, LogType.CONFLICT, [old, ...supporters]);
  }

  /** Lidere saygısını yitiren üye hanesiyle ayrılır; hanenin kararını koca verir. */
  #checkLoyalty(world) {
    const { leader } = this;
    if (!leader) return;
    for (const member of this.adults) {
      const followsSpouse = member.isFemale && member.partner?.group === this;
      if (member === leader || followsSpouse || !this.members.has(member)) continue;
      if ((member.relations.peek(leader)?.respect ?? 0) >= COMMUNITY.LEAVE_RESPECT) continue;
      world.social.groups.leave(member);
      world.log.add(`🚶 ${member.name} ${this.name} topluluğundan ayrıldı`, LogType.SOCIAL, [member]);
    }
  }

  static #standing(candidate, adults) {
    const others = adults.filter((a) => a !== candidate);
    const respect = others.reduce((sum, a) => sum + (a.relations.peek(candidate)?.respect ?? 0), 0) / others.length;
    return (
      candidate.status +
      respect +
      candidate.traits.charm * 0.3 +
      candidate.traits.intelligence * 0.3 +
      candidate.skills.get('leadership') * 0.3
    );
  }

  /** Lider topluluğun en büyük eksiğine bakıp emir verir; eksik yoksa herkes kendi işine döner. */
  #issueOrder(world) {
    this.nextOrder = world.now + COMMUNITY.ORDER_INTERVAL;
    this.leader.improveSkill('leadership', COMMUNITY.LEADERSHIP_HOURS, world);
    if (this.order) this.#judgeShirkers(world);
    let best = null;
    let bestNeed = COMMUNITY.MIN_NEED;
    for (const order of COMMUNITY_ORDERS) {
      const need = order.need(this, world);
      if (need > bestNeed) {
        best = order;
        bestNeed = need;
      }
    }
    if (best === this.order) return;
    this.order = best;
    if (!best) return;
    world.log.add(`📣 ${this.leader.name}: "${best.shout}"`, LogType.SOCIAL, [this.leader]);
  }
}
