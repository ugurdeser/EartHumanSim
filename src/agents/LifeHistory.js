const DEFAULT_LIMIT = 150;

/** Bir kişinin hayatındaki önemli olaylar (en eskiden en yeniye). */
export class LifeHistory {
  constructor(limit = DEFAULT_LIMIT) {
    this.limit = limit;
    this.entries = [];
  }

  get length() {
    return this.entries.length;
  }

  add(entry) {
    this.entries.push(entry);
    if (this.entries.length > this.limit) this.entries.shift();
  }
}
