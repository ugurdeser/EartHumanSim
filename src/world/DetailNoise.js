const OCTAVE_SALT = 0x9e3779b9;
const FADE_FROM = 0.5; // kat, örnek kafes aralığının yarısını aşınca sönmeye başlar
const FADE_TO = 2; // iki katını aşınca tümüyle söner
const OCTAVE_SPREAD = 0.2; // tek katın değerlerinin standart sapması (ara değerlenmiş düzgün dağılım)

/** Ekran kartının aynı hesabı yapması için ölçüler. */
export const DETAIL_FADE = Object.freeze({ FROM: FADE_FROM, TO: FADE_TO, SPREAD: OCTAVE_SPREAD });

/** Kafes noktasının değeri (0..1): tamsayı karması; ekran kartı aynı işlemleri yapar (glsl `latticeValue`). */
export const latticeValue = (x, y, seed) => {
  let h = (Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ seed) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 8) / 16777216;
};

const fade = (t) => t * t * (3 - 2 * t);

/**
 * Tablosuz, doğu-batı saran değer gürültüsü: gezegenin her boyunda gerçek ölçüsünde kalan ayrıntı
 * (sırtlar, tepeler, kıyıların girinti çıkıntısı) için. Kafes gezegenin çevresine tam oturur
 * (`cells` hücre), böylece dikiş görünmez; bellek tutmaz, her noktada hesaplanır.
 * Ekran kartındaki eşi `glsl.js`teki `detailNoise`tır: ikisi aynı değeri verir.
 */
export class DetailNoise {
  /**
   * @param {number} width gezegenin çevresi (m)
   * @param {number} scale istenen kafes aralığı (m); çevreye tam bölünsün diye biraz değişir
   */
  constructor(seed, width, scale, octaves, persistence = 0.5) {
    this.seed = seed >>> 0;
    this.cells = Math.max(1, Math.round(width / scale));
    this.scale = width / this.cells;
    this.octaves = octaves;
    this.persistence = persistence;
  }

  #sample(x, y, wrap, seed) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const sx = fade(x - x0);
    const sy = fade(y - y0);
    const left = ((x0 % wrap) + wrap) % wrap;
    const right = left + 1 === wrap ? 0 : left + 1;
    const a = latticeValue(left, y0, seed);
    const b = latticeValue(right, y0, seed);
    const c = latticeValue(left, y0 + 1, seed);
    const d = latticeValue(right, y0 + 1, seed);
    const top = a + (b - a) * sx;
    return top + (c + (d - c) * sx - top) * sy;
  }

  /**
   * Katın sönme payı: bir örneğin kapladığı uzunluk (`footprint`, m) katın kafes aralığından büyükse
   * kat görünmez, yerini ortalaması alır (uzaktan bakışta kumlanma olmasın). 1: tam, 0: sönük.
   */
  static weight(spacing, footprint) {
    if (footprint <= spacing * FADE_FROM) return 1;
    if (footprint >= spacing * FADE_TO) return 0;
    const t = (footprint - spacing * FADE_FROM) / (spacing * (FADE_TO - FADE_FROM));
    return 1 - t * t * (3 - 2 * t);
  }

  /** Noktadaki değer (0..1, ortası 0,5); `footprint` verilirse ondan ince katlar ortalamasına söner. */
  at(x, y, footprint = 0) {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let norm = 0;
    const u = x / this.scale;
    const v = y / this.scale;
    for (let i = 0; i < this.octaves; i++) {
      const weight = footprint > 0 ? DetailNoise.weight(this.scale / frequency, footprint) : 1;
      const value = weight > 0 ? this.#sample(u * frequency, v * frequency, this.cells * frequency, (this.seed ^ Math.imul(i, OCTAVE_SALT)) >>> 0) : 0.5;
      sum += (0.5 + (value - 0.5) * weight) * amplitude;
      norm += amplitude;
      amplitude *= this.persistence;
      frequency *= 2;
    }
    return sum / norm;
  }

  /** Sönen katların yayılımı (standart sapma): sönmüş ayrıntının ne kadar oynattığı. */
  spreadAt(footprint) {
    if (footprint <= 0) return 0;
    let amplitude = 1;
    let frequency = 1;
    let missing = 0;
    let norm = 0;
    for (let i = 0; i < this.octaves; i++) {
      const weight = DetailNoise.weight(this.scale / frequency, footprint);
      missing += amplitude * amplitude * (1 - weight * weight);
      norm += amplitude;
      amplitude *= this.persistence;
      frequency *= 2;
    }
    return (Math.sqrt(missing) / norm) * OCTAVE_SPREAD;
  }

  /**
   * Ekran kartına: görünen alanın başlangıcının kafes konumu, tamsayı ve kesir olarak ayrı
   * (büyük gezegende 32 bitlik ondalık sayı kaymasın diye). [tamX, tamY, kesirX, kesirY]
   */
  originOf(x, y) {
    const u = x / this.scale;
    const v = y / this.scale;
    const iu = Math.floor(u);
    const iv = Math.floor(v);
    return [((iu % this.cells) + this.cells) % this.cells, iv, u - iu, v - iv];
  }
}
