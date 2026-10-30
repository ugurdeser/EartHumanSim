export const LogType = Object.freeze({
  INFO: 'info',
  LIFE: 'life',
  SOCIAL: 'social',
  LOVE: 'love',
  DANGER: 'danger',
  CONFLICT: 'conflict',
  BUILD: 'build',
});

/**
 * Simülasyonda olan önemli olayların kaydı (gözlemci deseni).
 * Olayın ilgili olduğu kişiler verilirse, olay onların hayat hikâyesine de yazılır.
 */
export class EventLog {
  constructor(calendar, limit = 200) {
    this.calendar = calendar;
    this.limit = limit;
    this.entries = [];
    this.listeners = new Set();
  }

  #createEntry(message, type) {
    return { time: this.calendar.format(), simTime: this.calendar.now, message, type };
  }

  /** Genel akışa ekler; `involved` kişilerin hikâyelerine de yazar. */
  add(message, type = LogType.INFO, involved = []) {
    const entry = this.#createEntry(message, type);
    this.entries.unshift(entry);
    if (this.entries.length > this.limit) this.entries.pop();
    this.#recordFor(involved, entry);
    this.listeners.forEach((listener) => listener(entry));
    return entry;
  }

  /** Yalnızca kişilerin hikâyesine yazar (genel akışı kalabalıklaştırmayan kişisel notlar). */
  personal(people, message, type = LogType.INFO) {
    this.#recordFor(people, this.#createEntry(message, type));
  }

  #recordFor(people, entry) {
    for (const person of new Set(people.filter(Boolean))) person.history.add(entry);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
