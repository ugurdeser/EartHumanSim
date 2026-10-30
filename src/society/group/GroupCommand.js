import { COMMUNITY, DAY } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { COMMUNITY_ORDERS } from '../CommunityOrders.js';
import { GroupChapter } from '../GroupHistory.js';
import { Laws } from '../laws/Laws.js';

/** Liderin emirleri: eksiğe göre emir vermek, sonucu yazmak, çalışmayanı kınamak. */
export class GroupCommand {
  constructor(group) {
    this.group = group;
  }

  /** Kıtlıkta herkes kendi derdindedir: emre uymamak suç sayılmaz. */
  get #isStarving() {
    const adults = this.group.adults;
    const hunger = adults.reduce((sum, m) => sum + m.needs.food, 0) / adults.length;
    return this.group.stock.food < this.group.size * COMMUNITY.FAMINE_FOOD_PER_HEAD || hunger < COMMUNITY.FAMINE_HUNGER;
  }

  /** Emir süresi biterken çalışmayan üye sevilmemeye başlar; hasta, aç ve bakım verenler hariç. */
  #judgeShirkers(world) {
    const adults = this.group.adults;
    const excused = adults.length === 0 || this.#isStarving || !this.group.constitution.option(Laws.WORK).shamesShirkers;
    for (const shirker of excused ? [] : adults) {
      if (this.group.workers.has(shirker) || shirker.isSick || shirker.isCaregiver || shirker.needs.food < COMMUNITY.HUNGRY_FOOD) continue;
      for (const member of adults) {
        if (member === shirker) continue;
        member.relationTo(shirker).changeAffinity(-COMMUNITY.SHIRK_AFFINITY);
        member.relationTo(shirker).changeRespect(-COMMUNITY.SHIRK_RESPECT);
      }
      shirker.changeStatus(-COMMUNITY.SHIRK_STATUS);
      world.log.add(`😒 ${shirker.name} emre uymadı, ${this.group.name} ondan soğuyor`, LogType.CONFLICT, [shirker]);
      this.group.record(world, GroupChapter.JUSTICE, `😒 ${shirker.name} kınandı: "${this.group.order.shout}" emrinde çalışmadı, oysa hasta ya da aç değildi`);
      this.group.lawMaking.press(Laws.WORK, `${shirker.name} emre uymayınca`);
    }
    for (const worker of this.group.workers) this.group.orderWorkers.add(worker);
    this.group.workers.clear();
  }

  /** Biten emrin sonucu: kimler çalıştı, depo ne durumda. */
  #recordOrderResult(world) {
    if (!this.group.order) return;
    const workers = [...this.group.orderWorkers].map((p) => p.name);
    this.group.orderWorkers.clear();
    const result = workers.length ? `çalışanlar: ${workers.join(', ')}` : 'kimse ürün getirmedi';
    this.group.record(world, GroupChapter.DECISIONS, `✅ "${this.group.order.shout}" emri bitti, ${result} (şimdi ${this.group.stock.food} yiyecek)`);
  }

  /** Lider topluluğun en büyük eksiğine bakıp emir verir; eksik yoksa herkes kendi işine döner. */
  issueOrder(world) {
    this.group.nextOrder = world.now + COMMUNITY.ORDER_INTERVAL;
    this.group.leader.improveSkill('leadership', COMMUNITY.LEADERSHIP_HOURS, world);
    if (this.group.order) this.#judgeShirkers(world);
    let best = null;
    let bestNeed = COMMUNITY.MIN_NEED;
    for (const order of COMMUNITY_ORDERS) {
      const need = order.need(this.group, world);
      if (need > bestNeed) {
        best = order;
        bestNeed = need;
      }
    }
    if (best === this.group.order) return;
    this.#recordOrderResult(world);
    this.group.order = best;
    if (!best) return;
    world.log.add(`📣 ${this.group.leader.name}: "${best.shout}"`, LogType.SOCIAL, [this.group.leader]);
    const { food, fuelSeconds } = this.group.stock;
    this.group.record(world, GroupChapter.DECISIONS, `📣 ${this.group.leader.name} emretti: "${best.shout}" (o an ${food} yiyecek, ${Math.round(fuelSeconds / DAY)} günlük yakacak vardı)`);
  }
}
