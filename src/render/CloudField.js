import { WORLD } from '../config.js';
import { lerp, smoothstep } from '../core/MathUtils.js';
import { seamless } from '../core/Planet.js';
import { Random } from '../core/Random.js';
import { ValueNoise } from '../core/ValueNoise.js';

const WIDTH = 1536;
const HEIGHT = 768;
const SEED = 0xc10d;
const SCALE = 1700; // m: bulut kümelerinin tipik boyu (Dünya ölçeğinde ~270 km); yeri ve miktarı modelden
const FRONT_SCALE = 7000; // m: kümelerin kıvrılıp dizildiği şeritler (Dünya ölçeğinde ~1.100 km)
const SWIRL = 1.1; // örüntünün kıvrılması
const SAMPLES = 20000;
const EDGE = 0.035; // bulut kenarının yumuşaklığı
const MAX_ALPHA = 0.93;
const WIND_FAST = 0.02; // gün başına ekvator çevresinin payı: dokunun kayması (~9 m/s)
const WIND_SLOW = 0.012;
const SECOND_LAYER = 0.37; // ikinci katmanın birinciye göre kayıklığı

/** Desenin okunma ölçüleri: işlemci ve ekran kartı aynı değerlerle hesaplar. */
export const CLOUD_FIELD = Object.freeze({ WIDTH, HEIGHT, EDGE, MAX_ALPHA });

/**
 * Bulutların dokusu: birbirine göre kayan iki katmanlı desen. Nerede ve ne kadar bulut olduğunu
 * atmosfer modeli söyler (örtü → yerel eşik); desen yalnızca bulutun biçimini verir.
 * Küre ve yakın görünüm aynı deseni okur.
 */
export class CloudField {
  static #DEFERRED = Symbol('sonra üretilecek');

  /** Desen bir solukta üretilir; yükleme ekranı `CloudField.building()` ile parça parça üretir. */
  constructor(mode) {
    if (mode !== CloudField.#DEFERRED) for (const _ of this.#build());
  }

  /** Parça parça üretim: ilerlemeyi (0..1) verir, sonunda deseni döndürür. */
  static *building() {
    const field = new CloudField(CloudField.#DEFERRED);
    yield* field.#build();
    return field;
  }

  *#build(rowsPerStep = 64) {
    const rng = new Random(SEED);
    const detail = new ValueNoise(rng);
    const swirl = new ValueNoise(rng);
    this.values = new Float32Array(WIDTH * HEIGHT);
    for (let row = 0; row < HEIGHT; row++) {
      if (row % rowsPerStep === 0) yield row / HEIGHT;
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

  /** İki katmanın `days` gündeki kayması (harita genişliğinin payı, 0..1). */
  static drift(days) {
    const fast = days * WIND_FAST;
    const slow = SECOND_LAYER + days * WIND_SLOW;
    return [fast - Math.floor(fast), slow - Math.floor(slow)];
  }

  /** Noktadaki bulutun saydamsızlığı (0: açık gökyüzü). `days`: rüzgârın sürüklediği zaman. */
  opacity(u, v, days, threshold) {
    const density = (this.#at(u - days * WIND_FAST, v) + this.#at(u + SECOND_LAYER + days * WIND_SLOW, 1 - v)) / 2;
    return smoothstep(threshold - EDGE, threshold + EDGE, density) * MAX_ALPHA;
  }
}
