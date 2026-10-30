import { DAY, HOUR, WEATHER } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { clamp01, lerp } from '../core/MathUtils.js';
import { Calendar } from '../core/Calendar.js';
import { WeatherType } from './WeatherType.js';

const RAMP = 1 * HOUR; // hava bu sürede yavaş yavaş başlar ve diner
const MOISTURE_MEMORY = 30 * DAY;
const NORMAL_MOISTURE = 0.15; // ortalama bir ayın yağışı
const SEVERE_URGE = 0.5; // bundan güçlü hava "sert" sayılır

/**
 * Tüm dünya için tek hava. Sıradaki hava da bellidir (`next`): insanlar gökyüzüne bakıp
 * yaklaşan sert havayı görür. Yağış kar örtüsünü ve toprağın nemini belirler.
 */
export class WeatherSystem {
  constructor({ rng, calendar, log }) {
    this.rng = rng;
    this.calendar = calendar;
    this.log = log;
    this.current = WeatherType.CLEAR;
    this.next = this.#roll(0);
    this.startedAt = 0;
    this.until = this.#durationOf(this.current);
    this.snowCover = 0; // 0..1
    this.moisture = NORMAL_MOISTURE;
  }

  #weightedPick(weights) {
    const entries = Object.entries(weights);
    let roll = this.rng.next() * entries.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [id, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return WeatherType[id];
    }
    return WeatherType.CLEAR;
  }

  /** `time` anının mevsimine göre sıradaki hava. */
  #roll(time) {
    return this.#weightedPick(Calendar.seasonAt(time).weather);
  }

  #durationOf(weather) {
    const [min, max] = weather.duration;
    return this.rng.range(min, max) * HOUR;
  }

  /** Havanın o anki gücü (0..1): başlarken ve dinerken zayıftır. */
  get intensity() {
    const now = this.calendar.now;
    return clamp01(Math.min((now - this.startedAt) / RAMP, (this.until - now) / RAMP));
  }

  /** Hava sıcaklığı: mevsim + gün içi değişim + bulut/yağış. */
  get temperature() {
    return this.calendar.temperature - this.current.cooling * this.intensity;
  }

  /** Açıkta hissedilen: rüzgâr da eklenir. */
  get exposedTemperature() {
    return this.temperature - this.current.windChill * this.intensity;
  }

  get precipitation() {
    return this.current.precipitation * this.intensity;
  }

  /** Hareket hızı çarpanı: kötü hava ve kar örtüsü yavaşlatır. */
  get moveFactor() {
    return lerp(1, this.current.moveFactor, this.intensity) * (1 - this.snowCover * WEATHER.SNOW_SLOWDOWN);
  }

  /** Kar otu örter: hayvanlar daha zor otlar. */
  get forageFactor() {
    return 1 - this.snowCover * WEATHER.SNOW_FORAGE_LOSS;
  }

  /** Kar yerdeki yiyeceği örter: ancak daha yakından fark edilir. */
  get sightFactor() {
    return 1 - this.snowCover * WEATHER.SNOW_SIGHT_LOSS;
  }

  /** Bitki büyümesi: yağış hızlandırır, kuraklık yavaşlatır, kar durdurur. */
  get growthFactor() {
    const wetness = clamp01(this.moisture / (NORMAL_MOISTURE * 2));
    return lerp(WEATHER.DRY_GROWTH, WEATHER.WET_GROWTH, wetness) * (1 - this.snowCover);
  }

  /** Açıktaki insanın sığınma isteği; sert hava yaklaşırken de eve dönülür. */
  get shelterUrge() {
    const now = this.current.shelterUrge * this.intensity;
    const closing = this.until - this.calendar.now < WEATHER.FORECAST;
    return Math.max(now, closing ? this.next.shelterUrge * WEATHER.FORECAST_URGE : 0);
  }

  get isSevere() {
    return this.shelterUrge >= SEVERE_URGE;
  }

  update(dt) {
    if (this.calendar.now >= this.until) this.#change();
    this.#updateGround(dt);
  }

  #change() {
    const now = this.calendar.now;
    this.current = this.next;
    this.startedAt = now;
    this.until = now + this.#durationOf(this.current);
    this.next = this.#roll(this.until);
    if (this.current === WeatherType.BLIZZARD) this.log.add(`${this.current.icon} Tipi başladı`, LogType.DANGER);
  }

  #updateGround(dt) {
    const intensity = this.intensity;
    this.moisture += ((this.precipitation - this.moisture) * dt) / MOISTURE_MEMORY;
    const fallen = (this.current.snowfall * intensity * dt) / HOUR;
    const melted = (Math.max(0, this.temperature) * dt) / WEATHER.SNOW_MELT_TIME;
    const settled = dt / WEATHER.SNOW_SETTLE_TIME;
    this.snowCover = clamp01(this.snowCover + fallen - melted - settled);
  }

  /** Arayüz için: "🌧️ Yağmurlu · ❄ kar %40" */
  describe() {
    const snow = this.snowCover >= 0.05 ? ` · kar %${Math.round(this.snowCover * 100)}` : '';
    return `${this.current.icon} ${this.current.name}${snow}`;
  }
}
