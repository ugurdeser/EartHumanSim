import { ATMOSPHERE } from '../../config.js';
import { AtmosphereGrid } from './AtmosphereGrid.js';
import { AtmosphereState, cloudCover, saturation } from './AtmosphereState.js';
import { Circulation } from './Circulation.js';
import { Ground } from './Ground.js';
import { Moisture } from './Moisture.js';
import { PressureSystems } from './PressureSystems.js';
import { Radiation } from './Radiation.js';
import { SurfaceMap } from './SurfaceMap.js';
import { Sun } from './Sun.js';
import { Transport } from './Transport.js';

const A = ATMOSPHERE;

/**
 * Gezegenin atmosferi: sabit adımlarla ilerleyen ızgara modeli.
 * Her adım: basınç sistemleri → rüzgâr → yükselme → taşınım → ışınım → su döngüsü → yer.
 * `sunXAt(time)`: o anda güneşin tepede olduğu boylam (harita x'i).
 * `climate`: gezegenin iklim ayarları { solarConstant, obliquity, peakAltitude, evaporationTime, stormRate }.
 */
export class Atmosphere {
  constructor({ width, height, terrain, seed, sunXAt, climate }) {
    this.climate = climate;
    this.grid = new AtmosphereGrid(width, height);
    this.surface = new SurfaceMap(this.grid, terrain, climate.peakAltitude);
    this.state = new AtmosphereState(this.grid.size);
    this.state.declination = 0;
    this.sunXAt = sunXAt;
    this.systems = new PressureSystems(this.grid, this.surface, seed, climate.stormRate);
    this.circulation = new Circulation(this.grid, this.surface, this.systems);
    this.transport = new Transport(this.grid);
    this.radiation = new Radiation(this.grid, this.surface, climate.solarConstant);
    this.moisture = new Moisture(this.grid, this.surface, climate.evaporationTime);
    this.ground = new Ground(this.grid, this.surface);
    this.capacity = new Float32Array(this.grid.size);
    this.airShare = new Float32Array(this.grid.size); // taşınan havanın hücreyi ısıtma payı
    this.heatLimit = new Float32Array(this.grid.size); // °C: bir adımda havanın yüzeyi en çok ısıtıp soğutması
    this.previousCover = new Float32Array(this.grid.size); // çizimde iki adım arası yumuşak geçsin
    this.time = 0;
    this.version = 0;
  }

  /** Kaba bir başlangıç durumundan modeli `time`'dan önce bir yıl çalıştırır: mevsimler yerine oturur. */
  start(time) {
    for (const _ of this.warmUp(time));
  }

  /** `start`'ın parça parça hâli: her birkaç adımda ilerlemeyi (0..1) verir (yükleme ekranı için). */
  *warmUp(time, every = 15) {
    this.#seed();
    const from = time - A.SPIN_UP;
    this.time = from;
    let steps = 0;
    while (this.time < time) {
      this.#step(Math.min(A.SPIN_UP_STEP, time - this.time));
      if (++steps % every === 0) yield (this.time - from) / A.SPIN_UP;
    }
    this.previousCover.set(this.state.cover);
  }

  #seed() {
    const { grid, state, surface } = this;
    for (let j = 0; j < grid.rows; j++) {
      const theta = -25 + 52 * grid.cosLat[j] ** 2;
      for (let i = 0; i < grid.cols; i++) {
        const k = j * grid.cols + i;
        state.theta[k] = theta;
        state.thetaMean[k] = theta;
        state.humidity[k] = 0.7 * saturation(theta - A.LAPSE_RATE * surface.altitude[k], surface.altitude[k]);
        state.soil[k] = A.SOIL_CAPACITY / 2;
      }
    }
  }

  /** Saat `now`a gelene kadar adımlar. */
  update(now) {
    while (this.time + A.STEP <= now) {
      this.previousCover.set(this.state.cover);
      this.#step(A.STEP);
    }
  }

  /** Son adımdan bu yana geçen sürenin adıma oranı (çizim iki adım arasını harmanlar). */
  progress(now) {
    return Math.min(1, Math.max(0, (now - this.time) / A.STEP));
  }

  #step(dt) {
    const { state, transport } = this;
    const middle = this.time + dt / 2;
    state.declination = Sun.declination(middle, this.climate.obliquity);
    this.#capacities(dt);
    this.systems.update(state, dt);
    this.circulation.update(state);
    this.moisture.measureLift(state);
    transport.advectHeat(state.theta, state.windEast, state.eddyNorth, dt, this.capacity, this.airShare, this.heatLimit);
    transport.advectAmount(state.humidity, state.windEast, state.windNorth, dt);
    transport.advectAmount(state.cloud, state.windEast, state.windNorth, dt);
    transport.diffuseHeat(state.theta, A.HEAT_DIFFUSION, dt, this.capacity, this.airShare);
    transport.diffuseAmount(state.humidity, A.HEAT_DIFFUSION / 2, dt);
    for (let k = 0; k < this.grid.size; k++) state.cover[k] = cloudCover(state.cloud[k]);
    this.radiation.apply(state, this.capacity, dt, this.sunXAt(middle));
    this.moisture.apply(state, this.capacity, dt);
    this.ground.apply(state, dt);
    const memory = 1 - Math.exp(-dt / A.DAILY_MEMORY);
    for (let k = 0; k < this.grid.size; k++) state.thetaMean[k] += (state.theta[k] - state.thetaMean[k]) * memory;
    this.time += dt;
    this.version++;
  }

  /** Isı sığası: kara ve buz çabuk, açık deniz yavaş ısınır. */
  #capacities(dt) {
    const { land, ice } = this.surface;
    const { CAPACITY } = A;
    for (let k = 0; k < this.grid.size; k++) {
      const sea = 1 - land[k] - ice[k];
      const seaCapacity = this.state.seaIce[k] > 0 ? CAPACITY.ICE : CAPACITY.SEA;
      const capacity = land[k] * CAPACITY.LAND + ice[k] * CAPACITY.ICE + sea * seaCapacity;
      this.capacity[k] = capacity;
      this.airShare[k] = Math.min(1, CAPACITY.AIR / capacity);
      this.heatLimit[k] = (A.HEAT_EXCHANGE * dt) / capacity;
    }
  }
}
