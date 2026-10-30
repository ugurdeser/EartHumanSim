import { COMMUNITY } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { Group } from './Group.js';
import { GroupChapter } from './GroupHistory.js';
import { Laws } from './laws/Laws.js';

const GROUP_COLORS = ['#ff9f1c', '#2ec4b6', '#9b5de5', '#f15bb5', '#00bbf9', '#e63946', '#8ac926'];

/**
 * Toplulukların kurulması, büyümesi ve dağılması. İki dost erkek topluluk kurar; biri
 * katılınca hanesi de katılır. Eş ve bakılan çocuklar her zaman aynı topluluktadır.
 */
export class GroupManager {
  constructor(world) {
    this.world = world;
    this.groups = [];
    this.nextId = 1;
  }

  #create(center) {
    const group = new Group(this.nextId, GROUP_COLORS[(this.nextId - 1) % GROUP_COLORS.length], center);
    this.nextId++;
    this.groups.push(group);
    return group;
  }

  /** Karşılıklı dost mu? */
  static #areFriends(a, b) {
    return a.relationTo(b).affinity >= COMMUNITY.FRIEND_AFFINITY && b.relationTo(a).affinity >= COMMUNITY.FRIEND_AFFINITY;
  }

  /** Kişi, eşi ve bakmakla yükümlü olduğu çocuklar. */
  static #household(person) {
    const partner = person.partner?.alive ? [person.partner] : [];
    return [...new Set([person, ...partner, ...person.dependentChildren, ...partner.flatMap((p) => p.dependentChildren)])];
  }

  /** Sohbet eden iki yetişkin: topluluk kurabilir ya da biri diğerininkine katılabilir. */
  meet(a, b) {
    if (!a.group && !b.group) return this.#tryFound(a, b);
    if (a.group && !b.group) return this.#tryJoin(b, a);
    if (b.group && !a.group) return this.#tryJoin(a, b);
    return null;
  }

  #tryFound(a, b) {
    if (a.isFemale || b.isFemale || !GroupManager.#areFriends(a, b)) return null;
    const group = this.#create(a.home.position.clone());
    group.founders = [a, b];
    this.join(a, group);
    this.join(b, group);
    this.world.log.add(`🤝 ${a.name} ve ${b.name} "${group.name}" topluluğunu kurdu`, LogType.SOCIAL, [a, b]);
    group.record(this.world, GroupChapter.FOUNDING, `🏕 ${a.name} ve ${b.name} bu topluluğu kurdu: birbirlerine güvenen iki dosttular`);
    return group;
  }

  /** Kişi topluluğa kendi seçer: oradaki dostuna güvenmeli, lidere saygısını yitirmemiş olmalı. */
  #tryJoin(person, member) {
    const group = member.group;
    if (group.constitution.is(Laws.STRANGERS, 'closed')) return null;
    if (GroupManager.#household(person).some((m) => group.banned.has(m)) || person.relationTo(member).affinity < COMMUNITY.FRIEND_AFFINITY) return null; // sürgün eşinin arkasından dönemez
    const respect = group.leader ? person.relations.peek(group.leader)?.respect ?? 0 : 0;
    if (respect < COMMUNITY.JOIN_RESPECT) return null;
    this.join(person, group);
    this.world.log.add(`🤝 ${person.name} ${group.name} topluluğuna katıldı`, LogType.SOCIAL, [person, member]);
    group.record(this.world, GroupChapter.MEMBERS, `🤝 ${person.name} katıldı: dostu ${member.name} sayesinde`);
    return group;
  }

  /** Kişi hanesiyle topluluğa geçer; yapısı olmayan yuvalar köy merkezine taşınır. */
  join(person, group) {
    for (const member of GroupManager.#household(person)) {
      if (member.group === group) continue;
      if (member.group) this.remove(member);
      group.add(member);
      this.#moveCamp(member.home, group);
    }
  }

  #moveCamp(home, group) {
    if (home.shelterLevel > 0 || home.construction) return;
    if (home.position.distanceTo(group.center) <= COMMUNITY.VILLAGE_RADIUS) return;
    const spot = this.world.spotNear(group.center);
    this.world.removeHome(home);
    home.position.set(spot.x, spot.y);
    this.world.addHome(home);
  }

  /** Evlilikte eşler aynı toplulukta olur: varsa kocanınkinde, yoksa karınınkinde. */
  uniteCouple(husband, wife) {
    const group = husband.group ?? wife.group;
    if (!group) return;
    const newcomer = husband.group === group ? wife : husband;
    if (newcomer.group !== group) group.record(this.world, GroupChapter.MEMBERS, `💍 ${newcomer.name} evlilikle katıldı`);
    if (newcomer.group && newcomer.group !== group) newcomer.group.lawMaking.press(Laws.MARRIAGE, `${newcomer.name} evlenip başka topluluğa gidince`, 2);
    this.join(husband, group);
  }

  /** Kişi hanesiyle topluluktan ayrılır. */
  leave(person) {
    for (const member of GroupManager.#household(person)) this.remove(member);
  }

  /** Üyelerin bir kısmı hanesiyle ayrılıp yeni, rakip bir topluluk kurar. */
  split(group, members) {
    const fresh = this.#create(members[0].home.position.clone());
    fresh.founders = members.slice(0, 2);
    for (const member of members) this.join(member, fresh);
    fresh.markRival(group);
    return fresh;
  }

  update(world) {
    for (const group of this.groups) group.update(world);
  }

  remove(person) {
    const group = person.group;
    if (!group) return;
    person.share.transferTo(person.home.storage);
    group.remove(person);
    if (group.size > 1) return;
    const [heir] = group.members;
    if (heir) group.pot.transferTo(heir.home.storage);
    group.members.forEach((m) => group.remove(m));
    this.groups = this.groups.filter((g) => g !== group);
    for (const other of group.rivals) other.rivals.delete(group);
    group.record(this.world, GroupChapter.FOUNDING, '🏚 Topluluk dağıldı: geride birlikte yaşayacak kimse kalmadı');
  }
}
