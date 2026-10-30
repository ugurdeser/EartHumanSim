import { CALENDAR, DAY } from '../config.js';
import { SEASON_ORDER } from './Season.js';

const SEASON_LENGTH = CALENDAR.DAYS_PER_SEASON * DAY;
const YEAR_LENGTH = SEASON_LENGTH * SEASON_ORDER.length;
const MONTH_LENGTH = SEASON_LENGTH / 3; // her mevsim 3 ay
const NIGHT_COOLING = 6; // gece en soğuk anda düşen derece
const YEARLY_GROWTH = SEASON_ORDER.reduce((sum, s) => sum + s.growth * SEASON_LENGTH, 0);

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

  /** Ay adı (mevsimin 3 ayından biri). */
  get month() {
    return this.season.months[Math.floor((this.now % SEASON_LENGTH) / MONTH_LENGTH)];
  }

  /** Ayın kaçıncı günü. */
  get dayOfMonth() {
    return Math.floor((this.now % MONTH_LENGTH) / DAY) + 1;
  }

  /** "12 Nisan" */
  get date() {
    return `${this.dayOfMonth} ${this.month}`;
  }

  get isNight() {
    return this.clock.isNight;
  }

  /** Verilen mevsimin başlamasına kalan gün (o mevsimin içindeyken 0). */
  daysUntil(season) {
    if (this.season === season) return 0;
    const target = SEASON_ORDER.indexOf(season) * SEASON_LENGTH;
    return (((target - this.now) % YEAR_LENGTH) + YEAR_LENGTH) % YEAR_LENGTH / DAY;
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
    let total = fullYears * YEARLY_GROWTH;
    let t = from + fullYears * YEAR_LENGTH;
    while (t < to) {
      const seasonEnd = (Math.floor(t / SEASON_LENGTH) + 1) * SEASON_LENGTH;
      const end = Math.min(seasonEnd, to);
      total += (end - t) * Calendar.seasonAt(t).growth;
      t = end;
    }
    return total;
  }

  /** Büyüme süresi "yıl" cinsinden: ortalama bir yılın büyümesi = 1 (kış yavaş, bahar hızlı sayılır). */
  static growthYearsBetween(from, to) {
    return Calendar.growthTimeBetween(from, to) / YEARLY_GROWTH;
  }

  static get yearLength() {
    return YEAR_LENGTH;
  }

  format() {
    return `Yıl ${this.year} · ${this.date} · ${this.clock.formatTime()}`;
  }
}
