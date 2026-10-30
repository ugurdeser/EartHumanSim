import { Turkish } from '../../core/Turkish.js';
import { CONFLICT, MINUTE } from '../../config.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { SocialQueries } from '../../ai/SocialQueries.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const PROPOSE_MIN_ATTRACTION = 0.4; // bundan azsa önce kur yapar

/** Evliyse eşiyle birlikte olmak; bekârsa evlenme teklif etmek. */
export class DesireDrive extends Drive {
  static ID = 'desire';
  static NAME = 'Arzu / Şehvet';
  static CATEGORY = DriveCategory.REPRODUCTIVE;
  static DESCRIPTION = 'Başka bir bireyle cinsiyete dayalı bir ilişki arayışı.';

  isApplicable(person) {
    return person.isAdult && !person.pregnancy;
  }

  computeRaw(_person, _world, dt) {
    this.accumulate(dt, 30);
    return this.pressure * 0.9;
  }

  createAction(person, world) {
    const lover = person.partner ? this.#temptation(person, world) : null;
    if (lover) return this.#affair(lover);
    return person.partner ? this.#withPartner(person.partner) : this.#propose(person, world);
  }

  /** Evli kişinin, eşinden çok çekildiği biri varsa gözü dışarı kayabilir. */
  #temptation(person, world) {
    if (person.drives.get('justice').weight >= CONFLICT.GREED_SCRUPLES) return null;
    if (!world.rng.chance(CONFLICT.TEMPTATION_CHANCE * world.social.conflicts.intensity)) return null;
    return SocialQueries.lover(person, world, CONFLICT.TEMPTATION_ATTRACTION);
  }

  #affair(lover) {
    return new SequenceAction(`${Turkish.genitive(lover.name)} yanına gizlice gidiyor`, [
      ActionFactory.goToPerson(`${Turkish.genitive(lover.name)} yanına gidiyor`, lover, 3),
      new PerformAction(`${lover.name} ile gizlice görüşüyor`, 20 * MINUTE, {
        onComplete: (p, w) => w.social.conflicts.affair(p, lover),
      }),
    ]);
  }

  #withPartner(partner) {
    return new SequenceAction(`${Turkish.genitive(partner.name)} yanına gidiyor`, [
      ActionFactory.goToPerson(`${Turkish.genitive(partner.name)} yanına gidiyor`, partner, 3),
      new CallbackAction('Eşine yaklaşıyor', (p, w) => {
        if (!w.social.acceptsMating(partner, p)) return false;
        return new PerformAction(`${partner.name} ile birlikte`, 20 * MINUTE, {
          onComplete: () => w.social.mate(p, partner),
        });
      }),
    ]);
  }

  #propose(person, world) {
    const target = SocialQueries.bestMateCandidate(person, world);
    if (!target) return null;
    if (person.relationTo(target).attraction < PROPOSE_MIN_ATTRACTION) return this.#court(target);
    return new SequenceAction(`${Turkish.dative(target.name)} evlenme teklif edecek`, [
      ActionFactory.goToPerson(`${Turkish.dative(target.name)} gidiyor`, target, 3),
      new CallbackAction('Evlenme teklif ediyor', (p, w) => {
        const accepted = w.social.propose(p, target);
        this.relieve(accepted ? 0.6 : 0.5);
      }),
    ]);
  }

  /** Henüz yeterince yakın değilse önce ilgisini çekmeye çalışır. */
  #court(target) {
    return new SequenceAction(`${Turkish.dative(target.name)} kur yapacak`, [
      ActionFactory.goToPerson(`${Turkish.dative(target.name)} gidiyor`, target, 5),
      new PerformAction(`${Turkish.dative(target.name)} kur yapıyor`, 15 * MINUTE, {
        onComplete: (p, w) => {
          if (!target.alive) return;
          w.social.impress(p, target);
          p.relationTo(target).changeAttraction(0.05);
          this.relieve(0.3);
        },
      }),
    ]);
  }
}
