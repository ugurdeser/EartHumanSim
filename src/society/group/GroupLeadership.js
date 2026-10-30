import { COMMUNITY, CONFLICT } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { Flag } from '../Flag.js';
import { GroupChapter } from '../GroupHistory.js';
import { Laws } from '../laws/Laws.js';

/** Liderlik: kim aday olur, seçim, görevden indirme, ayrılma ve bölünme. */
export class GroupLeadership {
  constructor(group) {
    this.group = group;
  }

  /** Kim aday olabilir: kurucular kaldıkça yalnızca onlar; kalmadıysa liderlik yasası belirler. */
  #candidates(adults) {
    const founders = adults.filter((a) => this.group.founders.includes(a));
    if (founders.length > 0) return { candidates: founders, why: 'kurucu olduğu için' };
    if (this.group.constitution.is(Laws.SUCCESSION, 'elders')) {
      return { candidates: [adults.reduce((old, a) => (a.ageYears > old.ageYears ? a : old))], why: 'en yaşlı üye olduğu için' };
    }
    if (this.group.constitution.is(Laws.SUCCESSION, 'hereditary')) {
      const heirs = adults.filter((a) => [a.mother, a.father].some((parent) => this.group.dynasty.has(parent)));
      if (heirs.length > 0) return { candidates: heirs, why: 'liderler soyundan geldiği için' };
    }
    return { candidates: adults, why: null };
  }

  /** Aday olabilenler arasından saygı, statü ve yeteneği en yüksek olan lider olur. */
  elect(world) {
    this.group.nextElection = world.now + COMMUNITY.ELECTION_INTERVAL;
    const adults = this.group.adults.filter((a) => a !== this.group.deposed);
    if (adults.length < COMMUNITY.MIN_ADULTS) {
      this.group.leader = null;
      this.group.order = null;
      this.group.nextElection = world.now + COMMUNITY.RETRY_INTERVAL;
      return;
    }
    const { candidates, why } = this.#candidates(adults);
    const winner = candidates.reduce((best, c) => (GroupLeadership.#standing(c, adults) > GroupLeadership.#standing(best, adults) ? c : best));
    if (winner === this.group.leader) return;
    this.group.dynasty.add(winner);
    const previous = this.group.leader;
    this.group.leader = winner;
    this.group.order = null;
    this.group.nextOrder = 0;
    winner.changeStatus(0.1);
    world.log.add(`👑 ${winner.name}, ${this.group.name} lideri oldu`, LogType.SOCIAL, [winner]);
    this.group.record(world, GroupChapter.LEADERSHIP, `👑 ${winner.name} lider oldu${previous ? `, ${previous.name} görevi bıraktı` : ''}: ${why ?? GroupLeadership.#reasonToLead(winner)}`);
    this.#raiseFlag(world);
  }

  /** İlk lider seçilince topluluk bayrağını çizer. */
  #raiseFlag(world) {
    if (this.group.flag) return;
    this.group.flag = Flag.design(this.group);
    this.group.record(world, GroupChapter.FOUNDING, `🚩 ${this.group.name} bayrağını çizdi: ${this.group.flag.description}`);
  }

  /** Saygısını yitiren lider devrilir; onu hâlâ sevenlerle ayrılıp yeni topluluk kurar. */
  checkUnrest(world) {
    this.group.nextUnrest = world.now + CONFLICT.UNREST_INTERVAL;
    const old = this.group.leader;
    const others = this.group.adults.filter((a) => a !== old);
    if (others.length < COMMUNITY.MIN_ADULTS) return;
    const respect = others.reduce((sum, a) => sum + (a.relations.peek(old)?.respect ?? 0), 0) / others.length;
    if (respect >= CONFLICT.UNREST_RESPECT) return;
    this.group.leader = null;
    this.group.order = null;
    this.group.deposed = old;
    this.group.nextElection = 0;
    old.changeStatus(-0.2);
    world.log.add(`✊ ${this.group.name} üyeleri lideri ${old.name} görevden indirdi`, LogType.CONFLICT, [old]);
    this.group.record(world, GroupChapter.LEADERSHIP, `✊ Lider ${old.name} görevden indirildi: üyelerin saygısını yitirmişti (ortalama saygı %${Math.round(respect * 100)})`);
    this.group.lawMaking.press(Laws.SUCCESSION, `${old.name} görevden indirilince`, 2);
    const supporters = others.filter((a) => (a.relations.peek(old)?.affinity ?? 0) > CONFLICT.SUPPORTER_AFFINITY);
    if (supporters.length === 0) return;
    const split = world.social.groups.split(this.group, [old, ...supporters]);
    world.log.add(`⚡ ${old.name} destekçileriyle ayrıldı: ${split.name} kuruldu`, LogType.CONFLICT, [old, ...supporters]);
    const names = supporters.map((s) => s.name).join(', ');
    this.group.record(world, GroupChapter.LEADERSHIP, `⚡ ${old.name} ve destekçileri (${names}) ayrılıp ${split.name} topluluğunu kurdu`);
    split.record(world, GroupChapter.FOUNDING, `🏕 ${old.name}, ${this.group.name} liderliğinden indirilince destekçileriyle (${names}) bu topluluğu kurdu`);
    if (this.group.flag) {
      split.flag = Flag.fork(this.group.flag, split);
      split.record(world, GroupChapter.FOUNDING, `🚩 ${this.group.name} bayrağı tersine çevrilerek yeni bayrak yapıldı`);
    }
    this.group.record(world, GroupChapter.CONFLICT, `💢 ${split.name} ile düşman olundu: ayrılık yüzünden`);
    split.record(world, GroupChapter.CONFLICT, `💢 ${this.group.name} ile düşman olundu: ayrılık yüzünden`);
  }

  /** Lidere saygısını yitiren üye hanesiyle ayrılır; hanenin kararını koca verir. */
  checkLoyalty(world) {
    const { leader } = this.group;
    if (!leader) return;
    for (const member of this.group.adults) {
      const followsSpouse = member.isFemale && member.partner?.group === this.group;
      if (member === leader || followsSpouse || !this.group.members.has(member)) continue;
      if ((member.relations.peek(leader)?.respect ?? 0) >= COMMUNITY.LEAVE_RESPECT) continue;
      world.social.groups.leave(member);
      world.log.add(`🚶 ${member.name} ${this.group.name} topluluğundan ayrıldı`, LogType.SOCIAL, [member]);
      this.group.record(world, GroupChapter.MEMBERS, `🚶 ${member.name} ayrıldı: lider ${leader.name} adlı kişiye saygısı kalmamıştı`);
    }
  }

  /** Adayın öne çıkan yanı: seçimi neden kazandığı. */
  static #reasonToLead(winner) {
    const strengths = [
      [winner.skills.get('leadership'), 'liderlik deneyimi'],
      [winner.traits.intelligence, 'zekâsı'],
      [winner.traits.charm, 'karizması'],
      [winner.status, 'itibarı'],
    ];
    return `en güçlü yanı ${strengths.reduce((best, s) => (s[0] > best[0] ? s : best))[1]}`;
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
}
