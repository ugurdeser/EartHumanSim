const TRAIL_LENGTH = 8;

/** Kişinin son işleri: ölüm raporunda "ne yapıyordu" sorusuna cevap verir. */
export class ActivityTrail {
  constructor() {
    this.entries = []; // { time, activity, drive }
  }

  note(time, activity, drive) {
    if (this.entries.at(-1)?.activity === activity) return;
    this.entries.push({ time, activity, drive });
    if (this.entries.length > TRAIL_LENGTH) this.entries.shift();
  }
}
