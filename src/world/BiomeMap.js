import { PLANET } from '../config.js';
import { lerp, smoothstep } from '../core/MathUtils.js';
import { latitudeOf, Planet, wrapDelta } from '../core/Planet.js';
import { DetailNoise } from './DetailNoise.js';

const FOREST_SCALE = 700; // m: ormanların tipik boyu
const REGION_SCALE = 9000; // m: büyük ölçekli ormanlık / açık bölgeler
const BUSH_SCALE = 400;
const MEADOW_SCALE = 500;
const VARIETY_SCALE = 300; // m: aynı tür çalıların öbek boyu
const FERTILE_SCALE = 30000; // m: verimli ve çorak diyarların boyu
const WIDEN = 1.5; // sönen ayrıntının yayılımı eşikleri bu kadar sapma genişletir (ortalamayı korur)

/** Ekran kartının aynı hesabı yapması için ölçüler (glsl `BIOMES`). */
export const BIOME_SHAPE = Object.freeze({ WIDEN });

/**
 * `smoothstep(e0, e1, x)`'in, x'in sönmüş ayrıntı yüzünden `spread` kadar oynadığı durumdaki ortalaması
 * (yaklaşık): eşikler yayılım kadar genişler. Uzaktan bakışta orman payı yakından görünenle aynı kalır.
 */
const wideStep = (e0, e1, x, spread) => smoothstep(e0 - WIDEN * spread, e1 + WIDEN * spread, x);

/**
 * Konuma göre bitki yoğunlukları (0..1 kabul olasılıkları).
 * Hem parça üretimi hem uzak görünüm hem de ekran kartının zemin boyası aynı hesabı kullanır.
 * Gürültüler gezegenin çevresine tam oturur (dikiş ve tekrar yok); `footprint` (m) verilirse ondan
 * ince ayrıntı ortalamasına söner: uzaktan bakış, yakının ortalamasıdır.
 */
export class BiomeMap {
  constructor(rng, start, width = Planet.width) {
    this.start = start;
    const noise = (scale, octaves) => new DetailNoise(rng.int(0, 0x7fffffff), width, scale, octaves);
    this.forestNoise = noise(FOREST_SCALE, 4);
    this.regionNoise = noise(REGION_SCALE, 2);
    this.bushNoise = noise(BUSH_SCALE, 3);
    this.meadowNoise = noise(MEADOW_SCALE, 3);
    this.varietyNoise = noise(VARIETY_SCALE, 2);
    this.fertileNoise = noise(FERTILE_SCALE, 2);
  }

  /** Ormanlık ve (uzaktan bakışta) sönen kısmının yayılımı. */
  #forest(x, y, footprint) {
    const value = this.forestNoise.at(x, y, footprint) * 0.7 + this.regionNoise.at(x, y, footprint) * 0.3;
    const spread = footprint > 0 ? Math.hypot(0.7 * this.forestNoise.spreadAt(footprint), 0.3 * this.regionNoise.spreadAt(footprint)) : 0;
    return { value, spread };
  }

  forest(x, y, footprint = 0) {
    return this.#forest(x, y, footprint).value;
  }

  /** Bitki örtüsü çarpanı: uzak diyarlar bölgesine göre verimli ya da çorak, kutuplara doğru tükenir. */
  fertility(x, y, footprint = 0) {
    const distance = Math.hypot(wrapDelta(x - this.start.x), y - this.start.y);
    const fertile = this.fertileNoise.at(x, y, footprint);
    const region = lerp(PLANET.FERTILITY_FAR, 1, wideStep(0.42, 0.62, fertile, this.fertileNoise.spreadAt(footprint)));
    const far = lerp(1, region, smoothstep(PLANET.HOME_RADIUS * 1.5, PLANET.FERTILITY_REACH, distance));
    const polar = smoothstep(0.55, 0.85, Math.sin(latitudeOf(y)) ** 2);
    return far * (1 - polar * 0.8);
  }

  treeChance(x, y, footprint = 0) {
    const forest = this.#forest(x, y, footprint);
    return (wideStep(0.5, 0.72, forest.value, forest.spread) * 0.85 + 0.015) * this.fertility(x, y, footprint);
  }

  bushChance(x, y, footprint = 0) {
    const clump = this.bushNoise.at(x, y, footprint);
    const forest = this.#forest(x, y, footprint);
    const forestEdge = wideStep(0.42, 0.62, forest.value, forest.spread);
    return (wideStep(0.5, 0.72, clump, this.bushNoise.spreadAt(footprint)) * 0.5 + forestEdge * 0.2 + 0.02) * this.fertility(x, y, footprint);
  }

  grassChance(x, y, footprint = 0) {
    const meadow = this.meadowNoise.at(x, y, footprint);
    const forest = this.#forest(x, y, footprint);
    const openness = 1 - wideStep(0.55, 0.75, forest.value, forest.spread);
    return (wideStep(0.35, 0.6, meadow, this.meadowNoise.spreadAt(footprint)) * openness * 0.9 + 0.05) * this.fertility(x, y, footprint);
  }

  /** Bölgenin çalı türü eğilimi (0..1): yakın çalılar aynı türden olur. */
  bushVariety(x, y) {
    return smoothstep(0.3, 0.7, this.varietyNoise.at(x, y));
  }

  isForest(x, y) {
    return this.forest(x, y) > 0.58;
  }

  isMeadow(x, y) {
    return this.grassChance(x, y) > 0.5;
  }
}
