import { ATMOSPHERE, HOUR } from '../../config.js';
import { saturation } from './AtmosphereState.js';
import { Sun } from './Sun.js';

const { OLR_A, OLR_B, CLOUD_GREENHOUSE, DRY_AIR_COOLING, CLEAR_SKY_ALBEDO, CLOUD_ALBEDO, ALBEDO, LAPSE_RATE, SNOW_DEPTH_SCALE } = ATMOSPHERE;
const DAILY_MEAN_FROM = 3 * HOUR; // bundan uzun adımda gece-gündüz yerine günlük ortalama güneş

/**
 * Enerji dengesi: güneşten gelen (yansıtılan hariç) ile uzaya kaçan ışınımın farkı ısıtır ya da soğutur.
 * Bulut gündüz güneşi keser, gece ısıyı tutar; kar ve buz güneşi geri yansıtır; kuru hava gece çabuk soğur.
 */
export class Radiation {
  /** `solarConstant`: gezegene gelen güneş ışınımı (W/m²). */
  constructor(grid, surface, solarConstant) {
    this.grid = grid;
    this.surface = surface;
    this.solarConstant = solarConstant;
  }

  /** Yüzeyin yansıtması: deniz koyu, kar ve buz parlak. */
  albedoAt(state, k) {
    const { land, ice } = this.surface;
    const snowCover = 1 - Math.exp(-state.snow[k] / SNOW_DEPTH_SCALE);
    const ground = ALBEDO.LAND + (ALBEDO.SNOW - ALBEDO.LAND) * snowCover;
    const sea = state.seaIce[k] > 0 ? ALBEDO.SEA_ICE : ALBEDO.SEA;
    return land[k] * ground + ice[k] * ALBEDO.ICE + (1 - land[k] - ice[k]) * sea;
  }

  apply(state, capacity, dt, sunX) {
    const { grid, surface } = this;
    const { cols, rows } = grid;
    const sinDec = Math.sin(state.declination);
    const cosDec = Math.cos(state.declination);
    const daily = dt > DAILY_MEAN_FROM;
    for (let j = 0; j < rows; j++) {
      const sinLat = grid.sinLat[j];
      const cosLat = grid.cosLat[j];
      const dailySun = daily ? Sun.dailyMean(sinLat, cosLat, sinDec, cosDec) : 0;
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const sun = daily ? dailySun : Math.max(0, Sun.elevation(sinLat, cosLat, sinDec, cosDec, (2 * Math.PI * (grid.xOf(i) - sunX)) / grid.width));
        const cover = state.cover[k];
        const albedo = 1 - (1 - CLEAR_SKY_ALBEDO) * (1 - this.albedoAt(state, k)) * (1 - CLOUD_ALBEDO * cover);
        const absorbed = this.solarConstant * sun * (1 - albedo);
        const theta = state.theta[k];
        const altitude = surface.altitude[k];
        const relative = Math.min(1, state.humidity[k] / saturation(theta - LAPSE_RATE * altitude, altitude));
        const outgoing = OLR_A + OLR_B * theta - CLOUD_GREENHOUSE * cover + DRY_AIR_COOLING * (0.5 - relative);
        state.theta[k] = theta + ((absorbed - outgoing) * dt) / capacity[k];
      }
    }
  }
}
