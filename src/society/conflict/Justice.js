import { CONFLICT } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { Turkish } from '../../core/Turkish.js';
import { GroupChapter } from '../GroupHistory.js';
import { Laws } from '../laws/Laws.js';

/** Yargı: şikâyet, liderin hesap sorması ve yasaya göre ceza. */
export class Justice {
  constructor(conflicts) {
    this.conflicts = conflicts;
  }

  /** Şikâyetçi derdini lidere anlatır; artık hesabı lider sorar. */
  complain(person, leader, grievance) {
    leader.addGrievance(grievance);
    person.dropGrievance(grievance);
    this.conflicts.log.personal([person, leader], `🗣 ${person.name}, ${Turkish.dative(leader.name)} ${Turkish.accusative(grievance.thief.name)} şikâyet etti`, LogType.CONFLICT);
  }

  judge(judge, grievance) {
    const { thief: offender, victimHome, portions, crime, kind } = grievance;
    const record = Justice.#criminalRecord(offender);
    offender.offenses++;
    offender.crimes.push(kind);
    offender.changeStatus(-0.12);
    judge.changeStatus(0.04);
    judge.relationTo(offender).changeAffinity(-0.2);
    offender.relationTo(judge).changeAffinity(-0.2);
    offender.relationTo(judge).changeRespect(0.1);
    if (victimHome) offender.inventory.transferTo(victimHome.storage, (t) => t.isFood, portions);
    // Aynı suç için diğer tanıkların şikâyeti de kapanır
    for (const person of this.conflicts.world.people) person.resolveGrievance(offender, victimHome);
    const isLeader = offender.group?.leader === judge;
    const group = offender.group;
    const verdict = isLeader ? this.#sentence(judge, offender) : 'hesap sordu';
    this.conflicts.log.add(`⚖ ${judge.name}, ${Turkish.ablative(offender.name)} ${verdict}`, LogType.CONFLICT, [judge, offender]);
    group?.record(this.conflicts.world, GroupChapter.JUSTICE, `⚖ ${judge.name}, ${Turkish.ablative(offender.name)} ${verdict}. Sebep: ${crime}${record}`);
  }

  /** Önceki suçların özeti: " (sabıkası: 3 hırsızlık, 1 kavga)" */
  static #criminalRecord({ crimes }) {
    if (crimes.length === 0) return '';
    const counts = new Map();
    for (const kind of crimes) counts.set(kind, (counts.get(kind) ?? 0) + 1);
    return ` (sabıkası: ${[...counts].map(([kind, count]) => `${count} ${kind}`).join(', ')})`;
  }

  /** Liderin cezası suç sayısına göre ağırlaşır; topluluk bunun adil olup olmadığını tartar. */
  #sentence(leader, offender) {
    const group = offender.group;
    const members = group.adults.filter((m) => m !== leader && m !== offender);
    const judged = (delta) => members.forEach((m) => m.relationTo(leader).changeRespect(delta));
    if (leader.isCloseRelativeOf(offender) || leader.relationTo(offender).affinity > CONFLICT.FAVOUR_AFFINITY) {
      judged(-CONFLICT.UNFAIR_RESPECT);
      return 'hesap sordu ama kayırıp serbest bıraktı';
    }
    const law = group.constitution.option(Laws.THEFT);
    if (offender.offenses >= law.exileFrom) {
      for (const member of members) member.relationTo(leader).changeRespect(member.relationTo(offender).affinity > 0.4 ? -CONFLICT.UNFAIR_RESPECT : CONFLICT.FAIR_RESPECT);
      group.ban(offender);
      this.conflicts.world.social.groups.leave(offender);
      return `hesap sordu ve onu ${group.name} topluluğundan sürdü`;
    }
    judged(CONFLICT.FAIR_RESPECT);
    if (offender.offenses < law.fineFrom) return 'hesap sordu ve uyardı';
    offender.home.storage.transferTo(leader.home.storage, (t) => t.isFood, CONFLICT.FINE_PORTIONS);
    return 'hesap sordu ve yiyecek cezası verdi';
  }
}
