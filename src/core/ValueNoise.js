import { lerp } from './MathUtils.js';

/** Basit 2B değer gürültüsü; ormanlık / çalılık bölgelerin kümelenmesi için. */
export class ValueNoise {
  constructor(rng, size = 256) {
    this.size = size;
    this.values = new Float32Array(size * size);
    for (let i = 0; i < this.values.length; i++) this.values[i] = rng.next();
  }

  #value(ix, iy) {
    const s = this.size;
    const x = ((ix % s) + s) % s;
    const y = ((iy % s) + s) % s;
    return this.values[y * s + x];
  }

  sample(x, y) {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const top = lerp(this.#value(x0, y0), this.#value(x0 + 1, y0), sx);
    const bottom = lerp(this.#value(x0, y0 + 1), this.#value(x0 + 1, y0 + 1), sx);
    return lerp(top, bottom, sy);
  }

  fractal(x, y, octaves = 4, persistence = 0.5) {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.sample(x * frequency, y * frequency) * amplitude;
      norm += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }
    return sum / norm;
  }
}
