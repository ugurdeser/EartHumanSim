import { ATMOSPHERE, HOUR } from '../../config.js';
import { smoothstep } from '../../core/MathUtils.js';
import { cloudCover, saturation } from './AtmosphereState.js';

const A = ATMOSPHERE;
const relax = (dt, time) => 1 - Math.exp(-dt / time); // her adım boyunda kararlı yaklaşma

/**
 * Suyun döngüsü: deniz ve ıslak toprak buharlaşır; yükselen hava soğuyup yoğuşur ve bulut olur;
 * bulut ağırlaşınca yağar (soğukta kar), kuru havada dağılır. Buharlaşma yüzeyi soğutur, yoğuşma
 * aynı ısıyı bulutun oluştuğu yerde geri verir: su döngüsü ısıyı denizden yağışın düştüğü yere taşır.
 *
 * Havayı yükselten üç şey: rüzgârların yakınsaması (alçak basınç, cephe, ekvator kuşağı), dağ yamacına
 * çarpan rüzgâr ve öğleden sonra ısınan karadan kalkan sıcak hava kabarcıkları (kümülüs, sağanak).
 * Çöken hava (yüksek basınç, dağın rüzgâr almayan yüzü) kurur ve açar.
 */
export class Moisture {
  /** `evaporationTime`: denizin havayı doyurma süresi (kısaldıkça gezegen yağışlı). */
  constructor(grid, surface, evaporationTime) {
    this.grid = grid;
    this.surface = surface;
    this.evaporationTime = evaporationTime;
  }

  /** Yükselme ve kümülüs ölçüsünü rüzgâr ve ısınmadan hesaplar. */
  measureLift(state) {
    const { grid, surface } = this;
    const { cols, rows } = grid;
    for (let j = 0; j < rows; j++) {
      const north = Math.max(0, j - 1);
      const south = Math.min(rows - 1, j + 1);
      const dyTwice = (south - north) * grid.dy;
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const east = j * cols + (i + 1 === cols ? 0 : i + 1);
        const west = j * cols + (i === 0 ? cols - 1 : i - 1);
        const divergence = (state.windEast[east] - state.windEast[west]) / (2 * grid.dx[j]) + (state.windNorth[north * cols + i] - state.windNorth[south * cols + i]) / dyTwice;
        const upslope = state.windEast[k] * surface.slopeEast[k] + state.windNorth[k] * surface.slopeNorth[k]; // m/s
        const heating = smoothstep(0, 1, (state.theta[k] - state.thetaMean[k] - A.CONVECTION_START) / A.CONVECTION_RANGE) * surface.land[k];
        const tropical = smoothstep(26, 30, state.theta[k]) * (1 - surface.land[k]) * Math.max(0, -divergence * A.CONVERGENCE_LIFT);
        state.convection[k] = Math.min(1, heating + tropical);
        const lift = -divergence * A.CONVERGENCE_LIFT + upslope / A.OROGRAPHIC_LIFT + state.convection[k];
        state.lift[k] = Math.min(A.LIFT_RANGE[1], Math.max(A.LIFT_RANGE[0], lift));
      }
    }
  }

  apply(state, capacity, dt) {
    const { grid, surface } = this;
    const evaporating = relax(dt, this.evaporationTime);
    const condensing = relax(dt, A.CONDENSATION_TIME);
    const drying = relax(dt, A.CLOUD_EVAPORATION_TIME);
    const raining = relax(dt, A.RAIN_TIME);
    const latentEnergy = A.COLUMN_MASS * A.LATENT_HEAT; // J/m² · (kg/kg)⁻¹
    for (let k = 0; k < grid.size; k++) {
      const altitude = surface.altitude[k];
      const temperature = state.theta[k] - A.LAPSE_RATE * altitude;
      const saturated = saturation(temperature, altitude);
      let humidity = state.humidity[k];
      let cloud = state.cloud[k];

      // buharlaşma: deniz her zaman, kara toprağı ıslaksa; rüzgâr hızlandırır
      const land = surface.land[k];
      const sea = 1 - land - surface.ice[k];
      const snowy = state.snow[k] > 1;
      const wetness = snowy ? 0.1 : (A.SOIL_EVAPORATION * state.soil[k]) / A.SOIL_CAPACITY;
      const openWater = state.seaIce[k] > 0 ? 0.05 : 1;
      const wind = Math.hypot(state.windEast[k], state.windNorth[k]);
      const pull = Math.max(0, saturated - humidity) * Math.min(1, evaporating * (1 + wind / 8));
      const fromSea = pull * sea * openWater;
      const fromSoil = land > 0 ? Math.min(pull * land * wetness, (state.soil[k] * land) / A.COLUMN_MASS) : 0;
      if (fromSoil > 0) state.soil[k] -= (fromSoil * A.COLUMN_MASS) / land;
      const evaporated = fromSea + fromSoil;
      humidity += evaporated;
      state.theta[k] -= (evaporated * latentEnergy) / capacity[k];

      // yoğuşma eşiği: yükselen havada düşer, çöken havada yükselir
      const lift = Math.max(-0.5, Math.min(1, state.lift[k]));
      const threshold = (A.SATURATION - A.LIFT_SATURATION * lift) * saturated;
      const excess = humidity - threshold;
      let phaseChange = 0;
      if (excess > 0) phaseChange = excess * condensing;
      else phaseChange = -Math.min(cloud, -excess * drying);
      humidity -= phaseChange;
      cloud += phaseChange;
      state.theta[k] += (phaseChange * latentEnergy) / capacity[k];

      // yağış: bulut suyu eşiği aşınca; kümülüste eşik düşük (sağanak)
      const rainThreshold = A.RAIN_THRESHOLD * (1 - 0.5 * state.convection[k]);
      const fallen = Math.max(0, cloud - rainThreshold) * raining;
      cloud -= fallen;
      const water = fallen * A.COLUMN_MASS; // mm
      const snowShare = 1 - smoothstep(A.SNOW_BELOW, A.RAIN_ABOVE, temperature);
      const perHour = HOUR / dt;
      state.rain[k] = water * (1 - snowShare) * perHour;
      state.snowfall[k] = water * snowShare * perHour;
      state.humidity[k] = Math.min(humidity, saturated * 1.05);
      state.cloud[k] = Math.min(cloud, A.MAX_CLOUD_WATER);
      state.theta[k] = Math.min(A.THETA_RANGE[1], Math.max(A.THETA_RANGE[0], state.theta[k]));
      const stratus = 0.6 * smoothstep(0.85, 1, humidity / saturated); // nemli havada sis ve alçak bulut
      state.cover[k] = Math.max(cloudCover(cloud), stratus);
    }
  }
}
