import { CONFLICT } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { Turkish } from '../../core/Turkish.js';

/** Eş ilişkileri: gizli birliktelik, öğrenilmesi ve boşanma. */
export class Infidelity {
  constructor(conflicts) {
    this.conflicts = conflicts;
  }

  /** Birlikte olursa çocuk da olabilir; görülürse aldatılan eş öğrenir. */
  affair(cheater, lover) {
    if (!lover.alive || (lover.relations.peek(cheater)?.attraction ?? 0) < CONFLICT.AFFAIR_CONSENT) return false;
    this.conflicts.world.social.mate(cheater, lover);
    this.conflicts.log.personal([cheater, lover], `🤫 ${cheater.name} ile ${lover.name} gizlice birlikte oldu`, LogType.LOVE);
    for (const [person, other] of [[cheater, lover], [lover, cheater]]) {
      if (person.partner?.alive && this.conflicts.rng.chance(CONFLICT.DISCOVERY_CHANCE)) this.#discover(person, other);
    }
    return true;
  }

  #discover(cheater, lover) {
    const spouse = cheater.partner;
    if (!spouse) return;
    const trust = spouse.relationTo(cheater);
    trust.changeAffinity(-CONFLICT.BETRAYAL_AFFINITY);
    trust.changeAttraction(-CONFLICT.BETRAYAL_ATTRACTION);
    spouse.relationTo(lover).changeAffinity(-CONFLICT.BETRAYAL_AFFINITY);
    this.conflicts.log.add(`💔 ${spouse.name}, ${Turkish.genitive(cheater.name)} kendisini ${Turkish.dative(lover.name)} aldattığını öğrendi`, LogType.LOVE, [spouse, cheater]);
    this.conflicts.quarrel(spouse, cheater, 'aldatma yüzünden');
    if (trust.affinity < CONFLICT.DIVORCE_AFFINITY && cheater.partner === spouse) this.conflicts.world.social.divorce(spouse, cheater);
  }
}
