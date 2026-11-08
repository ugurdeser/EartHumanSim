import { Random } from '../core/Random.js';

const REGION = 16000; // m: uzak göletler ve madenler bu boyda bölgeler halinde üretilir
const MAX_PER_QUERY = 64; // bir sorgu en çok bu kadar bölge ürettirir (uzaktan bakış üretmez)
const GENERATE_ALL_BELOW = 2048; // bölge sayısı bundan azsa (küçük gezegen) hepsi baştan üretilir
const SALT = 0x5eed_f00d;

/**
 * Gezegenin seyrek göletlerini ve madenlerini bölge bölge, ilk sorulduğunda üretir: gerçek boyda
 * gezegende hepsi baştan üretilseydi yüz milyonlarca olurdu. Her bölge kendi tohumuyla üretilir;
 * ne zaman üretilirse üretilsin aynı olur. Bölge üretilirken başka bölge istenmez (zincirleme olmasın).
 */
export class FeatureRegions {
  /** `populate(rng, minX, minY, maxX, maxY)`: bölgeyi dolduran (FeatureGenerator). */
  constructor(width, height, seed, populate) {
    this.width = width;
    this.cols = Math.ceil(width / REGION);
    this.rows = Math.ceil(height / REGION);
    this.height = height;
    this.seed = seed;
    this.populate = populate;
    this.done = new Set();
    this.busy = false;
  }

  get count() {
    return this.cols * this.rows;
  }

  /** Küçük gezegende hepsi hemen (uzak görünümde de göletler görünsün). */
  generateAllIfSmall() {
    if (this.count > GENERATE_ALL_BELOW) return;
    this.#run(() => {
      for (let ry = 0; ry < this.rows; ry++) for (let rx = 0; rx < this.cols; rx++) this.#generate(rx, ry);
    });
  }

  /** Dikdörtgene değen bölgeler üretilmiş olsun. */
  ensure(minX, minY, maxX, maxY) {
    if (this.busy) return;
    const rx0 = Math.floor(minX / REGION);
    const rx1 = Math.floor(maxX / REGION);
    const ry0 = Math.max(0, Math.floor(minY / REGION));
    const ry1 = Math.min(this.rows - 1, Math.floor(maxY / REGION));
    const spanX = Math.min(this.cols, rx1 - rx0 + 1);
    if (spanX * (ry1 - ry0 + 1) > MAX_PER_QUERY) return;
    this.#run(() => {
      for (let ry = ry0; ry <= ry1; ry++) {
        for (let i = 0; i < spanX; i++) this.#generate((((rx0 + i) % this.cols) + this.cols) % this.cols, ry);
      }
    });
  }

  #run(work) {
    this.busy = true;
    try {
      work();
    } finally {
      this.busy = false;
    }
  }

  #generate(rx, ry) {
    const key = ry * this.cols + rx;
    if (this.done.has(key)) return;
    this.done.add(key);
    const minX = rx * REGION;
    const minY = ry * REGION;
    this.populate(Random.derive(this.seed ^ SALT, key), minX, minY, Math.min(minX + REGION, this.width), Math.min(minY + REGION, this.height));
  }
}
