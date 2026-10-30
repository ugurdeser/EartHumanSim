/** Tohumlanabilir (seed) rastgele sayı üreteci — mulberry32. */
export class Random {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
    this.state = this.seed;
  }

  next() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + (max - min) * this.next();
  }

  int(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  chance(probability) {
    return this.next() < probability;
  }

  pick(array) {
    return array[Math.floor(this.next() * array.length)];
  }

  angle() {
    return this.next() * Math.PI * 2;
  }

  /** Standart normal dağılım (Box–Muller). */
  normal(mean = 0, deviation = 1) {
    const u = 1 - this.next();
    const v = this.next();
    return mean + deviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Bir tamsayı anahtardan türetilmiş bağımsız üreteç (parça bazlı üretim için). */
  static derive(seed, key) {
    return new Random((Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(key, 0xc2b2ae35)) >>> 0);
  }
}
