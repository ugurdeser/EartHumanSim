import { Turkish } from '../../core/Turkish.js';
import { MINUTE } from '../../config.js';
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

  isApplicable(person) {
    return person.isAdult;
  }

  computeRaw(person, _world, dt) {
    this.accumulate(dt, 12);
    return this.pressure * 0.8 * (1.2 - person.status);
  }

  createAction(person, world) {
    const available = person.inventory.foodCount + person.home.storage.foodCount;
    const recipient = available >= GIFT_PORTIONS ? SocialQueries.hungriest(person, world) : null;
    return recipient ? this.#gift(person, world, recipient) : this.#showOff(person, world);
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
