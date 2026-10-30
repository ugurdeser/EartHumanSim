import { Turkish } from '../../core/Turkish.js';
import { COMMUNITY, MINUTE } from '../../config.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { SocialQueries } from '../../ai/SocialQueries.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const GIFT_PORTIONS = 2;

export class StatusDrive extends Drive {
  static ID = 'status';
  static NAME = 'Statü';
  static CATEGORY = DriveCategory.SOCIAL;
  static DESCRIPTION = 'Başkalarından saygınlık ve saygı kazanmayı amaçlamak.';

  /** 10 yaşından sonra çocuklar da liderin emrindeki işlere yardım eder. */
  isApplicable(person) {
    return !person.isDependent;
  }

  computeRaw(person, _world, dt) {
    this.accumulate(dt, 12);
    const duty = person.group?.order ? this.pressure * COMMUNITY.DUTY : 0;
    const share = person.group && person.share.entries().length > 0 ? COMMUNITY.SHARE_URGE : 0;
    return Math.max(duty, share, this.pressure * 0.8 * (1.2 - person.status));
  }

  createAction(person, world) {
    if (person.group && person.share.entries().length > 0) return this.#collectShare(person);
    const duty = this.#followOrder(person, world);
    if (duty) return duty;
    const available = person.inventory.foodCount + person.home.storage.foodCount;
    const recipient = available >= GIFT_PORTIONS ? SocialQueries.hungriest(person, world) : null;
    return recipient ? this.#gift(person, world, recipient) : this.#showOff(person, world);
  }

  /** Liderin emrindeki işi yapıp ürünü yuvaya taşımak topluluk içinde saygınlık kazandırır. */
  #followOrder(person, world) {
    const { group } = person;
    const order = group?.order;
    const work = order?.work(person, world);
    if (!work) return null;
    return new SequenceAction(`Lider emri: ${order.shout}`, [
      work,
      ActionFactory.goTo('Ürünü köy merkezine taşıyor', group.center, { arriveDistance: 4 }),
      new CallbackAction('Ürünü topluluğa bırakıyor', (p) => {
        p.inventory.transferTo(group.pot, order.keeps);
        group.recordWork(p);
        p.changeStatus(COMMUNITY.DUTY_STATUS);
        this.relieve(COMMUNITY.DUTY_DONE);
      }),
    ]);
  }

  /** Köy merkezinden kendi payını alıp evine götürür. */
  #collectShare(person) {
    const types = new Set(person.share.entries().map((e) => e.type));
    return new SequenceAction('Payını almaya gidiyor', [
      ActionFactory.goTo('Köy merkezine gidiyor', person.group.center, { arriveDistance: 4 }),
      new CallbackAction('Payını alıyor', (p) => {
        p.share.transferTo(p.inventory);
      }),
      ActionFactory.depositAtHome(person, 'Payını evine taşıyor', (t) => types.has(t)),
    ]);
  }

  /** Cömertlik: aç birine yiyecek götürmek saygınlık kazandırır. */
  #gift(person, world, recipient) {
    return new SequenceAction(`${Turkish.dative(recipient.name)} hediye götürüyor`, [
      person.inventory.foodCount >= GIFT_PORTIONS ? null : ActionFactory.fetchFromHome(person, 'Hediye için depodan alıyor', (t) => t.isFood, GIFT_PORTIONS),
      ActionFactory.goToPerson(`${Turkish.dative(recipient.name)} gidiyor`, recipient, 3),
      new CallbackAction('Yiyecek veriyor', (p, w) => {
        if (!recipient.alive) return false;
        const portions = p.inventory.transferTo(recipient.inventory, (t) => t.isFood, GIFT_PORTIONS);
        if (portions === 0) return false;
        w.social.giveGift(p, recipient);
        this.relieve(0.8);
        return true;
      }),
    ]);
  }

  /** Hünerini başkalarının önünde sergilemek. */
  #showOff(person, world) {
    const audience = SocialQueries.closestCompanion(person, world, 1000);
    if (!audience) return null;
    return new SequenceAction('Kendini göstermek istiyor', [
      ActionFactory.goToPerson(`${Turkish.genitive(audience.name)} yanına gidiyor`, audience, 8),
      new PerformAction('Hünerlerini sergiliyor', 10 * MINUTE, {
        onComplete: (p, w) => {
          w.social.showOff(p);
          this.relieve(0.5);
        },
      }),
    ]);
  }
}
