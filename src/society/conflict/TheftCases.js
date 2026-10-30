import { CONFLICT } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { Laws } from '../laws/Laws.js';

/** Hırsızlık: çalmaya değer mi, görülürse ne olur. */
export class TheftCases {
  constructor(conflicts) {
    this.conflicts = conflicts;
  }

  /** Çalmaya değer mi (0..1+): bağlar, yasa, görülme riski ve yakındaki doğal yiyecek. */
  temptation(person, home) {
    const owners = [...home.owners];
    const victims = owners[0]?.group;
    const bond = Math.max(0, ...owners.map((o) => person.relations.peek(o)?.affinity ?? 0));
    let odds = 1 - Math.min(1, bond);
    if (victims && victims === person.group) odds *= CONFLICT.GREED_SAME_GROUP;
    if (person.group?.isRival(victims)) odds *= CONFLICT.GREED_RIVAL;
    odds *= (person.group ?? victims)?.constitution.option(Laws.THEFT).deterrence ?? 1;
    if (this.conflicts.world.peopleNear(home.position, CONFLICT.WITNESS_RANGE, person).length > 0) odds *= CONFLICT.GREED_WITNESS;
    if (this.conflicts.world.findNearestFood(person.position, CONFLICT.GREED_ABUNDANCE_RANGE)) odds *= CONFLICT.GREED_ABUNDANCE;
    return odds;
  }

  /** Görülmeyen hırsızlıkta failin kim olduğu bilinmez. */
  reportTheft(thief, home, portions) {
    const owners = [...home.owners];
    const victims = owners[0]?.group;
    victims?.lawMaking.press(Laws.THEFT, 'Depolardan yiyecek çalınınca');
    if (thief.group !== victims) victims?.lawMaking.press(Laws.STRANGERS, 'Yabancılar depoya dadanınca');
    const witnesses = this.conflicts.world.peopleNear(thief.position, CONFLICT.WITNESS_RANGE, thief).filter((p) => p.isAdult);
    if (witnesses.length === 0) {
      this.conflicts.log.personal(owners, `🕵 Deposundan ${portions} parça eşya kayboldu, kimin aldığı görülmedi`, LogType.CONFLICT);
      return;
    }
    thief.thefts++;
    thief.changeStatus(-0.05);
    this.conflicts.log.add(`🕵 ${thief.name} başkasının deposundan ${portions} parça çalarken görüldü`, LogType.CONFLICT, [thief]);
    this.conflicts.markRivals(thief.group, owners[0]?.group, `${thief.name} onların deposundan çalarken görüldü`);
    for (const person of witnesses) {
      person.relationTo(thief).changeAffinity(-0.15);
      person.addGrievance({ thief, victimHome: home, portions, time: this.conflicts.world.now, crime: `${home.label} deposundan ${portions} parça çalmak`, kind: 'hırsızlık' });
    }
    // İtibar: tanınmış hırsıza kimse güvenmez
    if (thief.isKnownThief) thief.group?.adults.forEach((m) => m !== thief && m.relationTo(thief).changeAffinity(-CONFLICT.THIEF_DISTRUST));
  }
}
