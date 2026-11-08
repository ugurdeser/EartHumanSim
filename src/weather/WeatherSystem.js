import { ATMOSPHERE } from '../config.js';
import { Sun } from './atmosphere/Sun.js';
import { LogType } from '../core/EventLog.js';
import { wrapX } from '../core/Planet.js';
import { Atmosphere } from './atmosphere/Atmosphere.js';
import { SystemKind } from './atmosphere/PressureSystems.js';
import { LocalWeather } from './LocalWeather.js';
import { WeatherType } from './WeatherType.js';

const ALERTS = new Set([WeatherType.BLIZZARD, WeatherType.STORM, WeatherType.GALE]);

/**
 * Gezegenin havası: atmosfer modelinin üstünde yerel sorgular.
 * Her yerin havası ayrıdır; `at(konum)` o yerin havasını, `temperatureAt(konum)` o noktanın
 * yüksekliğine göre sıcaklığını verir.
 */
export class WeatherSystem {
  /** Model kurulur ama çalışmaz: `start()` (ya da parça parça `warmUp()`) bir yıl önceden ısıtır. */
  constructor({ calendar, log, terrain, width, height, seed, sunXAt, planet }) {
    this.calendar = calendar;
    this.log = log;
    this.terrain = terrain;
    this.planet = planet;
    this.atmosphere = new Atmosphere({ width, height, terrain, seed, sunXAt, climate: WeatherSystem.#climateOf(planet) });
    this.cells = new Array(this.atmosphere.grid.size).fill(null);
    this.paused = false; // geliştirici paneli: hava olduğu gibi kalır
    this.alerted = new Map(); // hücre → son uyarılan hava (her kötü havada bir kez yazılır)
  }

  /** Gezegen ayarlarından modelin iklim değerleri. */
  static #climateOf(planet) {
    return {
      solarConstant: ATMOSPHERE.SOLAR_CONSTANT * planet.solar,
      obliquity: planet.obliquity,
      peakAltitude: planet.peakAltitude,
      evaporationTime: ATMOSPHERE.EVAPORATION_TIME * planet.evaporation,
      stormRate: planet.stormRate,
    };
  }

  start() {
    this.atmosphere.start(this.calendar.now);
  }

  /** Isınmanın parça parça hâli: ilerlemeyi (0..1) verir. */
  warmUp() {
    return this.atmosphere.warmUp(this.calendar.now);
  }

  /** Güneşin şu an dik geldiği enlem (radyan). */
  get declination() {
    return Sun.declination(this.calendar.now, this.planet.obliquity);
  }

  get grid() {
    return this.atmosphere.grid;
  }

  /** Hücrenin havası (önbellekte; model ilerleyince tazelenir). */
  atCell(cell) {
    this.cells[cell] ??= new LocalWeather(this.atmosphere, cell, (seconds) => this.#upwind(cell, seconds));
    return this.cells[cell].refresh();
  }

  at(position) {
    return this.atCell(this.grid.cellAt(position.x, position.y));
  }

  /** En yüksek dağın yüksekliği (m, Dünya ölçeği): arazinin 0..1 yükseltisi bununla çarpılır. */
  get peakAltitude() {
    return this.planet.peakAltitude;
  }

  /** Noktanın gerçek yüksekliğine göre hava sıcaklığı (komşu hücreler harmanlanır). */
  temperatureAt(position) {
    const { grid, state } = this.atmosphere;
    const altitude = this.terrain.elevationAt(position.x, position.y) * this.peakAltitude;
    return grid.sample(state.theta, position.x, position.y) - ATMOSPHERE.LAPSE_RATE * altitude;
  }

  /** Açıkta hissedilen: rüzgâr soğuğu eklenir. */
  exposedTemperatureAt(position) {
    return LocalWeather.windChill(this.temperatureAt(position), this.at(position).wind);
  }

  /** Rüzgârın `seconds` sonra buraya getireceği havanın hücresi. */
  #upwind(cell, seconds) {
    const { grid, state } = this.atmosphere;
    const j = Math.floor(cell / grid.cols);
    const x = grid.xOf(cell % grid.cols) - (state.windEast[cell] * seconds) / (grid.scale * Math.max(0.25, grid.cosLat[j]));
    const y = grid.yOf(j) + (state.windNorth[cell] * seconds) / grid.scale;
    return this.atCell(grid.cellAt(wrapX(x), Math.min(grid.height - 1, Math.max(0, y))));
  }

  /** `watched`: kötü hava başlayınca günlüğe yazılacak yerler (yuvalar). */
  update(watched = []) {
    if (this.paused) {
      this.atmosphere.time = Math.max(this.atmosphere.time, this.calendar.now - ATMOSPHERE.STEP);
      return;
    }
    const version = this.atmosphere.version;
    this.atmosphere.update(this.calendar.now);
    if (version !== this.atmosphere.version) this.#alert(watched);
  }

  #alert(watched) {
    for (const position of watched) {
      const local = this.at(position);
      const before = this.alerted.get(local.cell);
      if (ALERTS.has(local.current) && before !== local.current) this.log.add(`${local.current.icon} ${local.current.name} başladı`, LogType.DANGER);
      this.alerted.set(local.cell, ALERTS.has(local.current) ? local.current : null);
    }
  }

  // ---------- Geliştirici paneli ----------

  /** Noktada yeni bir basınç sistemi doğurur (alçak basınç, yüksek basınç ya da kasırga). */
  spawnSystem(kind, position) {
    this.atmosphere.systems.spawnAt(kind, position.x, position.y);
  }

  setSnowAt(position, cover) {
    const cell = this.grid.cellAt(position.x, position.y);
    this.atmosphere.state.snow[cell] = -Math.log(Math.max(1e-3, 1 - Math.min(0.999, cover))) * ATMOSPHERE.SNOW_DEPTH_SCALE;
    this.atmosphere.version++;
  }

  setSoilAt(position, wetness) {
    const cell = this.grid.cellAt(position.x, position.y);
    this.atmosphere.state.soil[cell] = wetness * ATMOSPHERE.SOIL_CAPACITY;
    this.atmosphere.version++;
  }

  static get systemKinds() {
    return SystemKind;
  }
}
