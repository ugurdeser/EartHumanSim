import { ATMOSPHERE, DAY, HOUR } from '../../config.js';

const A = ATMOSPHERE;

/**
 * Yerdeki su: yağmur toprağı ıslatır, kar birikir ve sıcakta eriyerek toprağa geçer;
 * toprak dolarsa fazlası akıp gider. Denizde kar birikmez; deniz donunca buz olur.
 */
export class Ground {
  constructor(grid, surface) {
    this.grid = grid;
    this.surface = surface;
  }

  apply(state, dt) {
    const { grid, surface } = this;
    const hours = dt / HOUR;
    for (let k = 0; k < grid.size; k++) {
      const land = surface.land[k] + surface.ice[k];
      const temperature = state.theta[k] - A.LAPSE_RATE * surface.altitude[k];
      state.seaIce[k] = land < 1 && state.theta[k] < A.SEA_FREEZE ? 1 : 0;
      if (land <= 0.05) {
        state.snow[k] = 0;
        continue;
      }
      let snow = state.snow[k] + state.snowfall[k] * hours;
      const melted = Math.min(snow, (Math.max(0, temperature) * A.SNOW_MELT * dt) / DAY);
      snow -= melted;
      state.snow[k] = snow;
      state.soil[k] = Math.min(A.SOIL_CAPACITY, state.soil[k] + state.rain[k] * hours + melted);
    }
  }
}
