import { CONFLICT } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { GroupChapter } from '../GroupHistory.js';
import { Laws } from '../laws/Laws.js';

/** Topluluklar arası baskın. */
export class Raids {
  constructor(conflicts) {
    this.conflicts = conflicts;
  }

  /** Rakip yuvasından yiyecek çalmak; ev sahibi oradaysa kavga çıkar. */
  raid(raider, home) {
    const taken = home.storage.transferTo(raider.inventory, (t) => t.isFood, CONFLICT.RAID_PORTIONS);
    const owners = [...home.owners];
    this.conflicts.log.add(`⚔ ${raider.name}, ${home.label} deposuna baskın yaptı (${taken} yiyecek)`, LogType.CONFLICT, [raider, ...owners]);
    this.conflicts.markRivals(raider.group, owners[0]?.group, `${raider.name} depolarına baskın yaptı`);
    for (const group of new Set([raider.group, owners[0]?.group])) group?.record(this.conflicts.world, GroupChapter.CONFLICT, `⚔ ${raider.name}, ${home.label} deposuna baskın yaptı (${taken} yiyecek)`);
    const defender = owners.find((o) => o.alive && o.isAdult && o.position.distanceTo(home.position) <= CONFLICT.DEFEND_RANGE);
    owners[0]?.group?.lawMaking.press(Laws.RAIDS, `${raider.group?.name ?? 'Yabancılar'} baskın yapınca`, 2);
    const loser = defender ? this.conflicts.fight(raider, defender, 'baskın yüzünden') : null;
    if (raider.group && (!defender || loser === defender) && taken > 0 && raider.group.flag?.addStar()) {
      raider.group.record(this.conflicts.world, GroupChapter.FOUNDING, `⭐ Baskın zaferi bayrağa yıldız olarak eklendi`);
    }
  }
}
