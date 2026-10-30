import { DAY, LAWS } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { GroupChapter } from '../GroupHistory.js';
import { ALL_LAWS } from './Laws.js';

/**
 * Yasalar olaylardan doğar: yaşanan sorunlar bir konuda baskı biriktirir, baskı yeterince
 * artınca lider çözüm önerir, yetişkinler güdülerine göre oylar. Sonuç topluluğun hikâyesine yazılır.
 */
export class LawMaking {
  constructor(group) {
    this.group = group;
    this.pressure = new Map(); // yasa -> { amount, reason }
    this.nextReview = 0;
  }

  /** Yaşanan bir olay bu konuyu gündeme iter. */
  press(law, reason, amount = 1) {
    const current = this.pressure.get(law);
    this.pressure.set(law, { amount: (current?.amount ?? 0) + amount, reason });
  }

  update(world) {
    if (world.now < this.nextReview) return;
    this.nextReview = world.now + LAWS.REVIEW_DAYS * DAY;
    const { leader, adults } = this.group;
    if (!leader || adults.length < LAWS.MIN_VOTERS) return;
    const law = ALL_LAWS.find((l) => (this.pressure.get(l)?.amount ?? 0) >= LAWS.PRESSURE_TO_VOTE);
    if (!law) return;
    const { reason } = this.pressure.get(law);
    this.pressure.delete(law);
    const current = this.group.constitution.option(law);
    const proposal = this.#proposalOf(leader, law, current);
    if (proposal) this.#vote(world, law, current, proposal, reason);
  }

  /** Liderin mevcut düzenden daha çok benimsediği seçenek (yoksa null: konu kapanır). */
  #proposalOf(leader, law, current) {
    const options = law.options.filter((o) => o !== current);
    const best = options.reduce((top, o) => (o.opinion(leader) > top.opinion(leader) ? o : top));
    return best.opinion(leader) > current.opinion(leader) ? best : null;
  }

  #vote(world, law, current, proposal, reason) {
    const { group } = this;
    const { leader, adults } = group;
    const opposed = adults.filter((m) => proposal.opinion(m) <= current.opinion(m));
    const inFavour = adults.length - opposed.length;
    const passed = inFavour > opposed.length;
    const summary = `${inFavour} kabul, ${opposed.length} ret`;
    if (passed) {
      group.constitution.set(law, proposal);
      for (const member of opposed) if (member !== leader) member.relationTo(leader).changeRespect(-LAWS.DISSENT_RESPECT);
      world.log.add(`📜 ${group.name} yeni yasa kabul etti: ${law.name} — ${proposal.name}`, LogType.SOCIAL, [leader]);
    } else {
      leader.changeStatus(-LAWS.REJECTED_STATUS);
    }
    group.record(world, GroupChapter.LAWS, `📜 ${reason} ${leader.name}, ${law.name} yasasını "${proposal.name}" yapmayı önerdi: ${summary}, ${passed ? 'kabul edildi' : 'reddedildi'} (önceki: ${current.name})`);
  }
}
