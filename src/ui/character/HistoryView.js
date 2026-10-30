import { LogType } from '../../core/EventLog.js';
import { ChapterList } from '../ChapterList.js';

/** Hikâyenin bölümleri; olayın türü hangi bölüme yazılacağını belirler. */
const CHAPTERS = Object.freeze([
  { name: '🌱 Yaşam', type: LogType.LIFE },
  { name: '❤️ Aşk ve evlilik', type: LogType.LOVE },
  { name: '🤝 Dostluk ve toplum', type: LogType.SOCIAL },
  { name: '🔨 İş ve üretim', type: LogType.BUILD },
  { name: '⚔ Çatışma', type: LogType.CONFLICT },
  { name: '⚠ Tehlike', type: LogType.DANGER },
  { name: '📝 Diğer', type: LogType.INFO },
]);

/** Kişinin hayat hikâyesi: konularına göre bölümlü, en yeni olay üstte, olay anındaki yaşıyla. */
export class HistoryView {
  constructor(person, world) {
    this.person = person;
    this.world = world;
    this.lastEntry = undefined;
    this.list = new ChapterList('Henüz kayda değer bir olay yok.');
    this.root = this.list.root;
  }

  update() {
    const { entries } = this.person.history;
    const last = entries[entries.length - 1] ?? null;
    if (last === this.lastEntry) return;
    this.lastEntry = last;

    const now = this.world.now;
    const items = (type) =>
      entries
        .filter((entry) => entry.type === type)
        .reverse()
        .map((entry) => ({ time: `${entry.time} · ${this.person.ageAt(entry.simTime, now)} yaş`, message: entry.message }));
    this.list.render(CHAPTERS.map(({ name, type }) => ({ id: type, name, logType: type, items: items(type) })));
  }
}
