import { CALENDAR, DAY } from '../config.js';
import { SEASON_ORDER } from './Season.js';

const SEASON_LENGTH = CALENDAR.DAYS_PER_SEASON * DAY;
const YEAR_LENGTH = SEASON_LENGTH * SEASON_ORDER.length;
const NIGHT_COOLING = 6; // gece en soğuk anda düşen derece

/** Saatin üzerine mevsim, yıl ve sıcaklık bilgisi ekler. */
export class Calendar {
  constructor(clock) {
    this.clock = clock;
  }

  get now() {
    return this.clock.time;
  }

  static seasonAt(time) {
    return SEASON_ORDER[Math.floor((time % YEAR_LENGTH) / SEASON_LENGTH)];
  }

  get season() {
    return Calendar.seasonAt(this.now);
  }

  get year() {
    return Math.floor(this.now / YEAR_LENGTH) + 1;
  }

  get dayOfSeason() {
    return Math.floor((this.now % SEASON_LENGTH) / DAY) + 1;
  }

  get isNight() {
    return this.clock.isNight;
  }

  /** Mevsim ortalaması + gün içi değişim (öğleden sonra en sıcak, şafakta en soğuk). */
  get temperature() {
    const hour = this.clock.hourOfDay;
    const daily = Math.cos(((hour - 15) / 24) * Math.PI * 2); // 15:00'te +1
    return this.season.temperature + (daily - 1) * (NIGHT_COOLING / 2);
  }

  /** [from, to] aralığındaki "büyüme saniyesi": mevsimin büyüme katsayısıyla ağırlıklı süre. */
  static growthTimeBetween(from, to) {
    if (to <= from) return 0;
    const fullYears = Math.floor((to - from) / YEAR_LENGTH);
    const yearlyGrowth = SEASON_ORDER.reduce((sum, s) => sum + s.growth * SEASON_LENGTH, 0);
    let total = fullYears * yearlyGrowth;
    let t = from + fullYears * YEAR_LENGTH;
    while (t < to) {
      const seasonEnd = (Math.floor(t / SEASON_LENGTH) + 1) * SEASON_LENGTH;
      const end = Math.min(seasonEnd, to);
      total += (end - t) * Calendar.seasonAt(t).growth;
      t = end;
    }
    return total;
  }

  format() {
    return `Yıl ${this.year} · ${this.season.name} ${this.dayOfSeason} · ${this.clock.formatTime()}`;
  }
}
