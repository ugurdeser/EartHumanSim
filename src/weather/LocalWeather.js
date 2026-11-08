import { ATMOSPHERE, WEATHER } from '../config.js';
import { clamp01, lerp } from '../core/MathUtils.js';
import { saturation } from './atmosphere/AtmosphereState.js';
import { WeatherType } from './WeatherType.js';

const A = ATMOSPHERE;
const DRIZZLE = 0.1; // mm/saat: bundan azı yağış sayılmaz
const STORM_RAIN = 4; // mm/saat
const CONVECTIVE_STORM = 1.5; // kümülüste bu kadar yağış sağanaktır
const BLIZZARD_WIND = 10; // m/s
const HEAVY_SNOW = 2; // mm/saat (su olarak)
const GALE_WIND = 17; // m/s: kuvvet 8
const CLOUDY_COVER = 0.6;
const SOAKING_RATE = 4; // mm/saat: açıkta sırılsıklam eden yağış
const STRONG_WIND = 20; // m/s: yürümeyi zorlaştırır
const COMPASS = ['K', 'KD', 'D', 'GD', 'G', 'GB', 'B', 'KB'];

/**
 * Atmosferin bir hücresindeki hava: insanların ve hayvanların yaşadığı, arayüzün gösterdiği.
 * Değerler modelin son adımından okunur; bir sonraki adıma kadar aynı kalır.
 */
export class LocalWeather {
  /** `upwindOf(saniye)`: rüzgârın o süre sonra buraya getireceği havanın yeri. */
  constructor(atmosphere, cell, upwindOf) {
    this.atmosphere = atmosphere;
    this.cell = cell;
    this.upwindOf = upwindOf;
    this.version = -1;
  }

  /** Model ilerlediyse değerleri yeniden okur. */
  refresh() {
    const { atmosphere, cell: k } = this;
    if (this.version === atmosphere.version) return this;
    const { state, surface } = atmosphere;
    this.version = atmosphere.version;
    this.temperature = state.theta[k] - A.LAPSE_RATE * surface.altitude[k];
    this.humidity = Math.min(1, state.humidity[k] / saturation(this.temperature, surface.altitude[k])); // bağıl nem (0..1)
    this.windEast = state.windEast[k];
    this.windNorth = state.windNorth[k];
    this.wind = Math.hypot(this.windEast, this.windNorth); // m/s
    this.rain = state.rain[k]; // mm/saat
    this.snowfall = state.snowfall[k];
    this.cover = state.cover[k];
    this.pressure = state.pressure[k];
    this.convection = state.convection[k];
    this.soilWetness = clamp01(state.soil[k] / A.SOIL_CAPACITY);
    this.snowCover = surface.ice[k] > 0.5 ? 1 : (1 - Math.exp(-state.snow[k] / A.SNOW_DEPTH_SCALE)) * clamp01((surface.land[k] + surface.ice[k]) * 2);
    this.current = this.#classify();
    this.intensity = this.#intensity();
    this.upwind = null;
    return this;
  }

  #classify() {
    const { rain, snowfall, wind, convection, cover } = this;
    if (snowfall >= HEAVY_SNOW || (snowfall >= DRIZZLE * 5 && wind >= BLIZZARD_WIND)) return WeatherType.BLIZZARD;
    if (rain >= STORM_RAIN || (convection >= 0.5 && rain >= CONVECTIVE_STORM)) return WeatherType.STORM;
    if (wind >= GALE_WIND) return WeatherType.GALE;
    if (snowfall >= DRIZZLE && snowfall >= rain) return WeatherType.SNOW;
    if (rain + snowfall >= DRIZZLE) return WeatherType.RAIN;
    if (cover >= CLOUDY_COVER) return WeatherType.CLOUDY;
    return WeatherType.CLEAR;
  }

  /** Havanın gücü (0..1): yağışın türün tam yağışına oranı. */
  #intensity() {
    const type = this.current;
    if (type === WeatherType.CLEAR) return 1;
    if (type === WeatherType.CLOUDY) return this.cover;
    if (type === WeatherType.GALE) return clamp01(this.wind / (GALE_WIND * 1.5));
    return clamp01((this.rain + this.snowfall) / type.fullRate);
  }

  /** Islatan yağış (0..1). */
  get precipitation() {
    return clamp01((this.rain + this.snowfall * 0.3) / SOAKING_RATE);
  }

  /** Rüzgârla açıkta hissedilen sıcaklık (rüzgâr soğuğu; 10 °C üstünde etkisi yok). */
  static windChill(temperature, wind) {
    const speed = wind * 3.6; // km/saat
    if (temperature > 10 || speed < 4.8) return temperature;
    const power = speed ** 0.16;
    return 13.12 + 0.6215 * temperature - 11.37 * power + 0.3965 * temperature * power;
  }

  get exposedTemperature() {
    return LocalWeather.windChill(this.temperature, this.wind);
  }

  /** Hareket hızı çarpanı: kötü hava, kar örtüsü ve sert rüzgâr yavaşlatır. */
  get moveFactor() {
    const weather = lerp(1, this.current.moveFactor, this.intensity);
    const wind = 1 - 0.2 * clamp01((this.wind - STRONG_WIND) / STRONG_WIND);
    return weather * wind * (1 - this.snowCover * WEATHER.SNOW_SLOWDOWN);
  }

  /** Kar otu örter: hayvanlar daha zor otlar. */
  get forageFactor() {
    return 1 - this.snowCover * WEATHER.SNOW_FORAGE_LOSS;
  }

  /** Kar yerdeki yiyeceği örter: ancak daha yakından fark edilir. */
  get sightFactor() {
    return 1 - this.snowCover * WEATHER.SNOW_SIGHT_LOSS;
  }

  /** Bitki büyümesi: ıslak toprak hızlandırır, kuraklık yavaşlatır, kar durdurur. */
  get growthFactor() {
    return lerp(WEATHER.DRY_GROWTH, WEATHER.WET_GROWTH, clamp01(this.soilWetness / 0.6)) * (1 - this.snowCover);
  }

  /** Şimdiki havanın sığınma isteği. */
  get ownUrge() {
    return this.current.shelterUrge * this.intensity;
  }

  /** Açıktaki insanın sığınma isteği: rüzgârın getirdiği sert hava da ufukta görülür. */
  get shelterUrge() {
    this.upwind ??= this.upwindOf(WEATHER.FORECAST);
    const coming = this.upwind && this.upwind !== this ? this.upwind.refresh().ownUrge * WEATHER.FORECAST_URGE : 0;
    return Math.max(this.ownUrge, coming);
  }

  get isSevere() {
    return this.shelterUrge >= 0.5;
  }

  /** Rüzgârın estiği yön (pusula): rüzgârlar geldikleri yönle anılır. */
  get windFrom() {
    const angle = Math.atan2(-this.windEast, -this.windNorth); // kuzeyden saat yönünde
    return COMPASS[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
  }

  /** Arayüz için: "🌧️ Yağmurlu · 💨 12 m/s KB · kar %40" */
  describe() {
    const wind = this.wind >= 8 ? ` · 💨 ${Math.round(this.wind)} m/s ${this.windFrom}` : '';
    const snow = this.snowCover >= 0.05 ? ` · kar %${Math.round(this.snowCover * 100)}` : '';
    return `${this.current.icon} ${this.current.name}${wind}${snow}`;
  }
}
