import { COMMUNITY } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { GroupChapter } from '../GroupHistory.js';

/** Topluluğun çocukları: annesize süt annesi, gündüzleri bakıcı. */
export class GroupCare {
  constructor(group) {
    this.group = group;
  }

  /** Annesiz bebeğe oylamayla süt annesi seçilir; 2 yaşına gelen bebek babasına döner. */
  placeOrphans(world) {
    for (const child of this.group.members) {
      if (child.foster && !child.isInfant) this.#returnToFather(child, world);
      else if (child.alive && child.isInfant && !child.caretaker) this.#voteFoster(child, world);
    }
  }

  /** Her yetişkin en güvendiği kadına oy verir; bakma isteği de tartılır. */
  #voteFoster(child, world) {
    const women = this.group.adults.filter((m) => m.isFemale);
    if (women.length === 0) return;
    const votes = new Map();
    for (const voter of this.group.adults) {
      const score = (w) => (voter === w ? 1 : voter.relations.peek(w)?.affinity ?? 0) + w.drives.get('nurture').weight * COMMUNITY.FOSTER_NURTURE;
      const choice = women.reduce((best, w) => (score(w) > score(best) ? w : best));
      votes.set(choice, (votes.get(choice) ?? 0) + 1);
    }
    const [winner, count] = [...votes].reduce((best, entry) => (entry[1] > best[1] ? entry : best));
    child.foster = winner;
    this.group.record(world, GroupChapter.DECISIONS, `🗳 ${child.name} bebeğine ${winner.name} bakacak (${count} oy): annesi yok`);
    world.log.add(`🗳 ${this.group.name} oyladı (${count} oy): ${child.name} bebeğine ${winner.name} bakacak`, LogType.SOCIAL, [child, winner]);
  }

  /** Babası yoksa süt annesinin hanesinde kalır. */
  #returnToFather(child, world) {
    const { foster, father } = child;
    child.foster = null;
    const parent = father?.alive ? father : foster;
    if (parent?.family) parent.family.add(child);
    else if (parent) child.moveHome(parent.home);
    if (parent === father) world.log.add(`👶 ${foster.name}, ${child.name} bebeğini babası ${father.name} adlı kişiye geri verdi`, LogType.LIFE, [child, foster, father]);
  }

  /** Çocuk varsa en şefkatli kadın gündüzleri onlara bakar; çocuk kalmazsa görev biter. */
  appointNanny(world) {
    if (this.group.daycareChildren.length === 0) {
      this.group.nanny = null;
      return;
    }
    if (this.group.nanny?.alive && !this.group.nanny.isConfined) return;
    const women = this.group.adults.filter((m) => m.isFemale && !m.isConfined);
    if (women.length === 0) return;
    this.group.nanny = women.reduce((best, w) => (w.drives.get('nurture').weight > best.drives.get('nurture').weight ? w : best));
    world.log.add(`👩 ${this.group.nanny.name}, ${this.group.name} çocuklarına bakmaya başladı`, LogType.SOCIAL, [this.group.nanny]);
    this.group.record(world, GroupChapter.DECISIONS, `👩 ${this.group.nanny.name} çocuk bakıcısı oldu: en şefkatli kadın o`);
  }
}
