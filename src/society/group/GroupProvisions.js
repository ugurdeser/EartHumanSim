import { COMMUNITY } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { Laws } from '../laws/Laws.js';

/** Ortak pay: yasanın topladığı ve emirle gelen ürünlerin bölüşülmesi. */
export class GroupProvisions {
  constructor(group) {
    this.group = group;
  }

  /** Yetişkin tam, çocuk yarım pay alır; çocuğun payını evindeki yetişkin taşır. Artan kalır. */
  share(world) {
    this.group.nextShare = world.now + COMMUNITY.SHARE_INTERVAL;
    this.#collectDues();
    const shares = [...this.group.members].flatMap((m) => {
      const carrier = m.isAdult ? m : [...m.home.owners].find((o) => o.alive && o.isAdult);
      return carrier ? [{ carrier, weight: m.isAdult ? 1 : COMMUNITY.CHILD_SHARE }] : [];
    });
    const total = shares.reduce((sum, s) => sum + s.weight, 0);
    if (total === 0) return;
    const shared = [];
    for (const { type, count } of this.group.pot.entries()) {
      const each = count / total;
      if (each < 1) continue;
      for (const { carrier, weight } of shares) {
        const amount = Math.floor(each * weight);
        this.group.pot.remove(type, amount);
        carrier.share.add(type, amount);
      }
      shared.push(`${Math.floor(each)} ${type.name.toLocaleLowerCase('tr')}`);
    }
    if (shared.length) world.log.add(`🤲 ${this.group.name} ürünleri bölüştü: yetişkin başı ${shared.join(', ')}`, LogType.SOCIAL, this.group.adults);
  }

  /** Yiyecek yasası: yuvaların stoğunun bir kısmı bölüşülmek üzere ortak paya geçer. */
  #collectDues() {
    const { dues } = this.group.constitution.option(Laws.FOOD);
    if (dues === 0) return;
    for (const home of new Set(this.group.adults.map((m) => m.home))) {
      const surplus = home.storage.foodCount - COMMUNITY.HELP_MIN_STOCK;
      if (surplus > 0) home.storage.transferTo(this.group.pot, (t) => t.isFood, Math.ceil(surplus * dues));
    }
  }
}
