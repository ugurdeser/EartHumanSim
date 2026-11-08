import { CALENDAR, DAY, WORLD } from '../config.js';
import { SEASON_ORDER } from './Season.js';

const SEASON_LENGTH = CALENDAR.DAYS_PER_SEASON * DAY;
const YEAR_LENGTH = SEASON_LENGTH * SEASON_ORDER.length;
const MONTH_LENGTH = SEASON_LENGTH / 3; // her mevsim 3 ay
const YEARLY_GROWTH = SEASON_ORDER.reduce((sum, s) => sum + s.growth * SEASON_LENGTH, 0);

/**
 * Saatin üzerine tarih ve mevsim bilgisi ekler. Tarih (ay adları) bütün gezegende aynıdır;
 * mevsim yarıküreye göredir: güneyde kuzeyin tersi (yarım yıl kayık).
 */
export class Calendar {
  constructor(clock) {
    this.clock = clock;
  }

  get now() {
    return this.clock.time;
  }

  /** Güney yarıkürede mevsimler yarım yıl kayıktır. `y`: harita y'si (verilmezse kuzey). */
  static #shift(y) {
    return y > WORLD.HEIGHT / 2 ? YEAR_LENGTH / 2 : 0;
  }

  static seasonAt(time, y = 0) {
    return SEASON_ORDER[Math.floor(((time + Calendar.#shift(y)) % YEAR_LENGTH) / SEASON_LENGTH)];
  }

  /** Bir yerdeki mevsim. */
  seasonAt(position) {
    return Calendar.seasonAt(this.now, position.y);
  }

  /** Kuzey yarıkürenin mevsimi (tarihle birlikte anılan). */
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

  /** Bir yerde verilen mevsimin başlamasına kalan gün (o mevsimin içindeyken 0). */
  daysUntil(season, position) {
    if (this.seasonAt(position) === season) return 0;
    const target = SEASON_ORDER.indexOf(season) * SEASON_LENGTH;
    const now = this.now + Calendar.#shift(position.y);
    return (((target - now) % YEAR_LENGTH) + YEAR_LENGTH) % YEAR_LENGTH / DAY;
  }

  /** [from, to] aralığındaki "büyüme saniyesi": yerin mevsiminin büyüme katsayısıyla ağırlıklı süre. */
  static growthTimeBetween(from, to, y = 0) {
    if (to <= from) return 0;
    const shift = Calendar.#shift(y);
    from += shift;
    to += shift;
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
  static growthYearsBetween(from, to, y = 0) {
    return Calendar.growthTimeBetween(from, to, y) / YEARLY_GROWTH;
  }

  static get yearLength() {
    return YEAR_LENGTH;
  }

  format() {
    return `Yıl ${this.year} · ${this.date} · ${this.clock.formatTime()}`;
  }
}
