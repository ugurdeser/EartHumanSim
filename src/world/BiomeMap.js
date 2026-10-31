import { PLANET } from '../config.js';
import { lerp, smoothstep } from '../core/MathUtils.js';
import { latitudeOf, seamless, wrapDelta } from '../core/Planet.js';
import { ValueNoise } from '../core/ValueNoise.js';

const FOREST_SCALE = 700; // m: ormanların tipik boyu
const REGION_SCALE = 9000; // m: büyük ölçekli ormanlık / açık bölgeler
const BUSH_SCALE = 400;
const MEADOW_SCALE = 500;
const VARIETY_SCALE = 300; // m: aynı tür çalıların öbek boyu
const FERTILE_SCALE = 30000; // m: verimli ve çorak diyarların boyu

/**
 * Konuma göre bitki yoğunlukları (0..1 kabul olasılıkları).
 * Hem parça üretimi hem uzak görünüm haritası aynı fonksiyonları kullanır.
 */
export class BiomeMap {
  constructor(rng, start) {
    this.start = start;
    this.forestNoise = new ValueNoise(rng);
    this.regionNoise = new ValueNoise(rng);
    this.bushNoise = new ValueNoise(rng);
    this.meadowNoise = new ValueNoise(rng);
    this.varietyNoise = new ValueNoise(rng);
    this.fertileNoise = new ValueNoise(rng);
  }

  /** Örüntü dünyanın dikişinde kopmasın diye başa bağlanmış gürültü. */
  #sample(noise, x, y, scale, octaves) {
    return seamless(x, (sx) => noise.fractal(sx / scale, y / scale, octaves));
  }

  forest(x, y) {
    const local = this.#sample(this.forestNoise, x, y, FOREST_SCALE, 4);
    const region = this.#sample(this.regionNoise, x, y, REGION_SCALE, 2);
    return local * 0.7 + region * 0.3;
  }

  /** Bitki örtüsü çarpanı: uzak diyarlar bölgesine göre verimli ya da çorak, kutuplara doğru tükenir. */
  fertility(x, y) {
    const distance = Math.hypot(wrapDelta(x - this.start.x), y - this.start.y);
    const region = lerp(PLANET.FERTILITY_FAR, 1, smoothstep(0.42, 0.62, this.#sample(this.fertileNoise, x, y, FERTILE_SCALE, 2)));
    const far = lerp(1, region, smoothstep(PLANET.HOME_RADIUS * 1.5, PLANET.FERTILITY_REACH, distance));
    const polar = smoothstep(0.55, 0.85, Math.sin(latitudeOf(y)) ** 2);
    return far * (1 - polar * 0.8);
  }

  treeChance(x, y) {
    return (smoothstep(0.5, 0.72, this.forest(x, y)) * 0.85 + 0.015) * this.fertility(x, y);
  }

  bushChance(x, y) {
    const clump = this.#sample(this.bushNoise, x, y, BUSH_SCALE, 3);
    const forestEdge = smoothstep(0.42, 0.62, this.forest(x, y));
    return (smoothstep(0.5, 0.72, clump) * 0.5 + forestEdge * 0.2 + 0.02) * this.fertility(x, y);
  }

  grassChance(x, y) {
    const meadow = this.#sample(this.meadowNoise, x, y, MEADOW_SCALE, 3);
    const openness = 1 - smoothstep(0.55, 0.75, this.forest(x, y));
    return (smoothstep(0.35, 0.6, meadow) * openness * 0.9 + 0.05) * this.fertility(x, y);
  }

  /** Bölgenin çalı türü eğilimi (0..1): yakın çalılar aynı türden olur. */
  bushVariety(x, y) {
    return smoothstep(0.3, 0.7, this.#sample(this.varietyNoise, x, y, VARIETY_SCALE, 2));
  }

  isForest(x, y) {
    return this.forest(x, y) > 0.58;
  }

  isMeadow(x, y) {
    return this.grassChance(x, y) > 0.5;
  }
}
