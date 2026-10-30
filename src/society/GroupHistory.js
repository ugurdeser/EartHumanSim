import { LogType } from '../core/EventLog.js';

/** Topluluk hikâyesinin bölümleri; `logType` arayüzdeki rengi belirler. */
export const GroupChapter = Object.freeze({
  FOUNDING: { id: 'founding', name: '🏕 Kuruluş', logType: LogType.LIFE },
  LEADERSHIP: { id: 'leadership', name: '👑 Liderlik', logType: LogType.SOCIAL },
  LAWS: { id: 'laws', name: '📜 Yasalar', logType: LogType.SOCIAL },
  MEMBERS: { id: 'members', name: '👥 Gelenler ve gidenler', logType: LogType.INFO },
  JUSTICE: { id: 'justice', name: '⚖ Yargı ve sürgün', logType: LogType.CONFLICT },
  CONFLICT: { id: 'conflict', name: '⚔ Çatışma', logType: LogType.DANGER },
  DECISIONS: { id: 'decisions', name: '📣 Emirler ve kararlar', logType: LogType.BUILD },
});

export const GROUP_CHAPTERS = Object.freeze(Object.values(GroupChapter));

const CHAPTER_LIMIT = 80;

/** Topluluğun yaşadıkları. Sınır bölüm başınadır: sık kararlar kuruluşu ya da sürgünleri silmez. */
export class GroupHistory {
  constructor() {
    this.chapters = new Map(GROUP_CHAPTERS.map((chapter) => [chapter, []]));
    this.latest = null;
  }

  /** En eskiden en yeniye. */
  entriesOf(chapter) {
    return this.chapters.get(chapter);
  }

  add(chapter, time, message) {
    const entries = this.chapters.get(chapter);
    this.latest = { time, message };
    entries.push(this.latest);
    if (entries.length > CHAPTER_LIMIT) entries.shift();
  }
}
