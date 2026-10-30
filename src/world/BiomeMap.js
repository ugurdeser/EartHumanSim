import { smoothstep } from '../core/MathUtils.js';
import { ValueNoise } from '../core/ValueNoise.js';

const FOREST_SCALE = 700; // m: ormanların tipik boyu
const REGION_SCALE = 9000; // m: büyük ölçekli ormanlık / açık bölgeler
const BUSH_SCALE = 400;
const MEADOW_SCALE = 500;
const VARIETY_SCALE = 300; // m: aynı tür çalıların öbek boyu

/**
 * Konuma göre bitki yoğunlukları (0..1 kabul olasılıkları).
 * Hem parça üretimi hem uzak görünüm haritası aynı fonksiyonları kullanır.
 */
export class BiomeMap {
  constructor(rng) {
    this.forestNoise = new ValueNoise(rng);
    this.regionNoise = new ValueNoise(rng);
    this.bushNoise = new ValueNoise(rng);
    this.meadowNoise = new ValueNoise(rng);
    this.varietyNoise = new ValueNoise(rng);
  }

  forest(x, y) {
    const local = this.forestNoise.fractal(x / FOREST_SCALE, y / FOREST_SCALE, 4);
    const region = this.regionNoise.fractal(x / REGION_SCALE, y / REGION_SCALE, 2);
    return local * 0.7 + region * 0.3;
  }

  treeChance(x, y) {
    return smoothstep(0.5, 0.72, this.forest(x, y)) * 0.85 + 0.015;
  }

  bushChance(x, y) {
    const clump = this.bushNoise.fractal(x / BUSH_SCALE, y / BUSH_SCALE, 3);
    const forestEdge = smoothstep(0.42, 0.62, this.forest(x, y));
    return smoothstep(0.5, 0.72, clump) * 0.5 + forestEdge * 0.2 + 0.02;
  }

  grassChance(x, y) {
    const meadow = this.meadowNoise.fractal(x / MEADOW_SCALE, y / MEADOW_SCALE, 3);
    const openness = 1 - smoothstep(0.55, 0.75, this.forest(x, y));
    return smoothstep(0.35, 0.6, meadow) * openness * 0.9 + 0.05;
  }

  /** Bölgenin çalı türü eğilimi (0..1): yakın çalılar aynı türden olur. */
  bushVariety(x, y) {
    return smoothstep(0.3, 0.7, this.varietyNoise.fractal(x / VARIETY_SCALE, y / VARIETY_SCALE, 2));
  }

  isForest(x, y) {
    return this.forest(x, y) > 0.58;
  }

  isMeadow(x, y) {
    return this.grassChance(x, y) > 0.5;
  }
}
