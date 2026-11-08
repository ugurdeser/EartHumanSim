import { ATMOSPHERE } from '../../config.js';

const DEG = 180 / Math.PI;
const { TRADES, WESTERLIES, POLAR_EASTERLIES, HADLEY_INFLOW, FERREL_OUTFLOW, POLAR_INFLOW } = ATMOSPHERE;

/** Üç hücreli dolaşımın 0..30°, 30..60°, 60..90° kuşaklarında yumuşak tepe. */
const belt = (degrees, from) => Math.sin((Math.PI * Math.min(30, Math.max(0, degrees - from))) / 30);

/**
 * Yüzey rüzgârı üç kaynaktan doğar:
 * 1. Genel dolaşım: alizeler ekvatora, batı rüzgârları kutba doğru eser; kuşaklar güneşle kayar.
 * 2. Isınma: sıcak yerde hava hafifler, basınç düşer, çevreden rüzgâr çeker (meltem, muson).
 * 3. Gezen basınç sistemleri.
 * Basınç farkının rüzgârı gezegenin dönüşüyle sapar (Coriolis) ve yüzeyde sürtünmeyle yavaşlar.
 */
export class Circulation {
  constructor(grid, surface, systems) {
    this.grid = grid;
    this.surface = surface;
    this.systems = systems;
    this.thermal = new Float32Array(grid.size); // Pa: ısınmanın basınç farkı
    this.moving = new Float32Array(grid.size); // Pa: gezen sistemlerin basıncı
  }

  /** Enlemdeki genel dolaşım rüzgârı (m/s; doğu ve kuzey artı). */
  static background(latitude, declination) {
    const shifted = (latitude - declination * ATMOSPHERE.ITCZ_SHIFT) * DEG;
    const degrees = Math.abs(shifted);
    const side = Math.sign(shifted) || 1;
    const east = TRADES * belt(degrees, 0) + WESTERLIES * belt(degrees, 30) + POLAR_EASTERLIES * belt(degrees, 60);
    const north = side * (-HADLEY_INFLOW * belt(degrees, 0) + FERREL_OUTFLOW * belt(degrees, 30) - POLAR_INFLOW * belt(degrees, 60));
    return { east, north };
  }

  /** Kuşakların deniz seviyesi basıncı (hPa): ekvatorda alçak, dönencelerde yüksek, 60°'de alçak. */
  static backgroundPressure(latitude, declination) {
    const degrees = Math.abs((latitude - declination * ATMOSPHERE.ITCZ_SHIFT) * DEG);
    const bump = (center, width) => Math.exp(-(((degrees - center) / width) ** 2));
    return 1013 - 5 * bump(0, 10) + 8 * bump(30, 12) - 12 * bump(62, 10) + 5 * bump(88, 10);
  }

  update(state) {
    const { grid, surface } = this;
    const { cols, rows } = grid;
    this.#thermalPressure(state);
    this.moving.fill(0);
    this.systems.addPressure(this.moving);
    const rho = ATMOSPHERE.AIR_DENSITY;
    for (let j = 0; j < rows; j++) {
      const latitude = grid.latitude[j];
      const coriolis = 2 * ATMOSPHERE.ROTATION * grid.sinLat[j];
      const base = Circulation.background(latitude, state.declination);
      const basePressure = Circulation.backgroundPressure(latitude, state.declination);
      const north = Math.max(0, j - 1) * cols;
      const south = Math.min(rows - 1, j + 1) * cols;
      const dyTwice = (Math.min(rows - 1, j + 1) - Math.max(0, j - 1)) * grid.dy;
      const dxTwice = 2 * grid.dx[j];
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const east = j * cols + ((i + 1) % cols);
        const west = j * cols + ((i - 1 + cols) % cols);
        const friction = ATMOSPHERE.FRICTION.SEA + (ATMOSPHERE.FRICTION.LAND - ATMOSPHERE.FRICTION.SEA) * surface.land[k];
        const thermal = Circulation.#wind(this.thermal, k, east, west, north + i, south + i, dxTwice, dyTwice, rho, coriolis, friction, ATMOSPHERE.MAX_THERMAL_WIND);
        const moving = Circulation.#wind(this.moving, k, east, west, north + i, south + i, dxTwice, dyTwice, rho, coriolis, friction, ATMOSPHERE.MAX_WIND);
        let windEast = base.east + thermal.east + moving.east;
        let windNorth = base.north + thermal.north + moving.north;
        const speed = Math.hypot(windEast, windNorth);
        if (speed > ATMOSPHERE.MAX_WIND) {
          windEast *= ATMOSPHERE.MAX_WIND / speed;
          windNorth *= ATMOSPHERE.MAX_WIND / speed;
        }
        state.windEast[k] = windEast;
        state.windNorth[k] = windNorth;
        state.eddyNorth[k] = windNorth - base.north;
        state.pressure[k] = basePressure + (this.thermal[k] + this.moving[k]) / 100;
      }
    }
  }

  /** Sıcak yerde alçak basınç: aynı enlemin ortalamasından sıcak olan hücre hafifler. */
  #thermalPressure(state) {
    const { cols, rows } = this.grid;
    for (let j = 0; j < rows; j++) {
      let mean = 0;
      for (let i = 0; i < cols; i++) mean += state.thetaMean[j * cols + i];
      mean /= cols;
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const warmth = 0.6 * state.thetaMean[k] + 0.4 * state.theta[k] - mean;
        this.thermal[k] = -ATMOSPHERE.THERMAL_PRESSURE * ATMOSPHERE.AIR_DENSITY * warmth;
      }
    }
  }

  /**
   * Basınç farkının sürtünmeli dengedeki rüzgârı: 0 = G − f·(k×u) − r·u.
   * Ekvatorda doğrudan alçağa akar; orta enlemde alçağın çevresinde döner (kuzeyde saat yönü tersine).
   */
  static #wind(field, k, east, west, north, south, dxTwice, dyTwice, rho, coriolis, friction, cap) {
    const pushEast = -(field[east] - field[west]) / dxTwice / rho;
    const pushNorth = -(field[north] - field[south]) / dyTwice / rho;
    const denominator = friction * friction + coriolis * coriolis;
    let windEast = (friction * pushEast + coriolis * pushNorth) / denominator;
    let windNorth = (friction * pushNorth - coriolis * pushEast) / denominator;
    const speed = Math.hypot(windEast, windNorth);
    if (speed > cap) {
      windEast *= cap / speed;
      windNorth *= cap / speed;
    }
    return { east: windEast, north: windNorth };
  }
}
