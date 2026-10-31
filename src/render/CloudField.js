import { WORLD } from '../config.js';
import { clamp01, lerp, smoothstep } from '../core/MathUtils.js';
import { seamless } from '../core/Planet.js';
import { Random } from '../core/Random.js';
import { ValueNoise } from '../core/ValueNoise.js';

const WIDTH = 1536;
const HEIGHT = 768;
const SEED = 0xc10d;
const SCALE = 3800; // m: bulut kümelerinin tipik boyu (gerçek ölçekte ~600 km)
const FRONT_SCALE = 15000; // m: kümelerin dizildiği cepheler (gerçek ölçekte ~2.400 km)
const SWIRL = 1.1; // örüntünün kıvrılması
const SAMPLES = 20000;
const CLEAR_SKY_COVER = 0.42; // açık havada bile gezegenin bu kadarı bulutlu
const STORM_COVER = 0.35; // kapalı havada eklenen oran
const EDGE = 0.035; // bulut kenarının yumuşaklığı
const MAX_ALPHA = 0.93;
const WIND_FAST = 0.06; // gün başına ekvator çevresinin payı (jet akımı ~%6)
const WIND_SLOW = 0.025;

/**
 * Gezegeni saran tek bulut deseni: küre ve yakın görünüm aynı bulutları buradan okur.
 * Birbirine göre kayan iki katman üst üste binip sürekli değişir.
 */
export class CloudField {
  constructor() {
    const rng = new Random(SEED);
    const detail = new ValueNoise(rng);
    const swirl = new ValueNoise(rng);
    this.values = new Float32Array(WIDTH * HEIGHT);
    for (let row = 0; row < HEIGHT; row++) {
      const y = ((row + 0.5) / HEIGHT) * WORLD.HEIGHT;
      for (let col = 0; col < WIDTH; col++) {
        const x = ((col + 0.5) / WIDTH) * WORLD.WIDTH;
        this.values[row * WIDTH + col] = seamless(x, (sx) => {
          const bend = swirl.fractal(sx / FRONT_SCALE, y / FRONT_SCALE, 3) * SWIRL;
          return detail.fractal(sx / SCALE + bend, y / SCALE + bend * 0.5, 5, 0.6) * 0.7 + bend * 0.27;
        });
      }
    }
    // iki katmanın ortalamasının dağılımı: istenen kaplama oranının eşiği buradan okunur
    this.pairs = Float32Array.from({ length: SAMPLES }, () => (rng.pick(this.values) + rng.pick(this.values)) / 2).sort();
  }

  /** Gezegenin `coverage` oranını kaplayan eşik. */
  threshold(coverage) {
    return this.pairs[Math.floor((1 - coverage) * (SAMPLES - 1))];
  }

  /** Hava kapandıkça örtü büyür. */
  coverage(weather) {
    return clamp01(CLEAR_SKY_COVER + STORM_COVER * weather.current.clouds * weather.intensity);
  }

  /** u, v: 0..1 harita konumu (u sarar); komşu değerler harmanlanır. */
  #at(u, v) {
    const px = (u - Math.floor(u)) * WIDTH - 0.5;
    const py = Math.max(0, Math.min(HEIGHT - 1.001, v * HEIGHT - 0.5));
    const left = Math.floor(px);
    const col = (left + WIDTH) % WIDTH;
    const next = (col + 1) % WIDTH;
    const row = Math.floor(py);
    const fx = px - left;
    const top = lerp(this.values[row * WIDTH + col], this.values[row * WIDTH + next], fx);
    const bottom = lerp(this.values[(row + 1) * WIDTH + col], this.values[(row + 1) * WIDTH + next], fx);
    return lerp(top, bottom, py - row);
  }

  /** Noktadaki bulutun saydamsızlığı (0: açık gökyüzü). `days`: rüzgârın sürüklediği zaman. */
  opacity(u, v, days, threshold) {
    const density = (this.#at(u - days * WIND_FAST, v) + this.#at(u + 0.37 + days * WIND_SLOW, 1 - v)) / 2;
    return smoothstep(threshold - EDGE, threshold + EDGE, density) * MAX_ALPHA;
  }
}
