import { COMMUNITY } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';

const THEFT_RANGE = 800;

/** Kendi yiyeceği olmayanın son çareleri: topluluktan istemek, çalmak. */
export class FoodFromOthers {
  /** Topluluk üyesi aç kalanı geri çevirmez: durumu iyi olan evden yiyecek ister. */
  static askCommunity(person) {
    if (person.needs.food > COMMUNITY.HUNGRY_FOOD) return null;
    const homes = person.group?.adults.map((m) => m.home) ?? [];
    const helper = homes.find((h) => h !== person.home && h.storage.foodCount >= COMMUNITY.HELP_MIN_STOCK);
    if (!helper) return null;
    return new SequenceAction('Topluluktan yiyecek istiyor', [
      new MoveToAction(`${helper.label} yiyecek istemeye gidiyor`, helper.position, { arriveDistance: 2 }),
      new CallbackAction('Yiyecek alıyor', (p, w) => {
        const given = helper.storage.transferTo(p.inventory, (t) => t.isFood, COMMUNITY.HELP_PORTIONS);
        if (given === 0) return false;
        for (const owner of helper.owners) p.relationTo(owner).changeAffinity(0.1);
        w.log.personal([p, ...helper.owners], `🤲 ${p.name}, ${helper.label} evinden ${given} yiyecek aldı`, LogType.SOCIAL);
        return true;
      }),
    ]);
  }

  /** Adalet duygusu zayıf ve çaresiz olan, başkasının deposundan çalabilir. */
  static tryTheft(person, world) {
    const scruples = person.drives.get('justice').weight;
    if (scruples >= 0.8 || person.needs.food > 0.35) return null;
    const victim = world.findHomeWithFood(person.position, THEFT_RANGE, person.home);
    if (!victim) return null;
    return new SequenceAction('Gizlice depoya gidiyor', [
      new MoveToAction('Gizlice depoya gidiyor', victim.position, { arriveDistance: 2 }),
      new CallbackAction('Çalıyor', (p, w) => {
        const stolen = victim.storage.transferTo(p.inventory, (t) => t.isFood, 3);
        if (stolen === 0) return false;
        w.social.reportTheft(p, victim, stolen);
        return true;
      }),
    ]);
  }
}
