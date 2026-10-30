import { clamp01, lerp, smoothstep } from '../core/MathUtils.js';

const RESOLUTION = 160; // tüm harita için örtü resminin piksel boyutu
const OCTAVES = [
  [4, 0.45],
  [8, 0.28],
  [16, 0.17],
  [32, 0.1],
]; // [periyot (hücre), ağırlık]
const EDGE = [0.05, 0.1]; // bulut kenarının yumuşaklığı (eşiğin altı / üstü)
const LIGHT = [205, 210, 216];
const DARK = [52, 58, 70];
const REPAINT_STEP = 0.01;

/** Kenarları birbirine bağlanan (döşenebilir) değer gürültüsü: örtü kaydıkça dikiş görünmez. */
function tileableNoise() {
  const field = new Float32Array(RESOLUTION * RESOLUTION);
  for (const [period, weight] of OCTAVES) {
    const grid = Float32Array.from({ length: period * period }, () => Math.random());
    const at = (gx, gy) => grid[(gy % period) * period + (gx % period)];
    for (let py = 0; py < RESOLUTION; py++) {
      const v = (py / RESOLUTION) * period;
      const gy = Math.floor(v);
      const ty = smoothstep(0, 1, v - gy);
      for (let px = 0; px < RESOLUTION; px++) {
        const u = (px / RESOLUTION) * period;
        const gx = Math.floor(u);
        const tx = smoothstep(0, 1, u - gx);
        const top = lerp(at(gx, gy), at(gx + 1, gy), tx);
        const bottom = lerp(at(gx, gy + 1), at(gx + 1, gy + 1), tx);
        field[py * RESOLUTION + px] += lerp(top, bottom, ty) * weight;
      }
    }
  }
  return field;
}

/**
 * Yağışlı havada gökyüzünü kapatan sürekli bulut örtüsü. Haritanın tam olarak istenen
 * oranı kaplanır (gürültünün yüzdeliğinden eşik seçilir); kalın yerler daha koyudur.
 */
export class OvercastSheet {
  constructor(worldSize) {
    this.worldSize = worldSize;
    this.noise = tileableNoise();
    this.sorted = Float32Array.from(this.noise).sort();
    this.canvas = document.createElement('canvas');
    this.canvas.width = RESOLUTION;
    this.canvas.height = RESOLUTION;
    this.painted = { coverage: -1, darkness: -1 };
  }

  /** Haritanın `coverage` oranı kadarını kaplayan gürültü eşiği. */
  #threshold(coverage) {
    const index = Math.floor((1 - coverage) * (this.sorted.length - 1));
    return this.sorted[Math.max(0, index)];
  }

  #paint(coverage, darkness) {
    const threshold = this.#threshold(coverage);
    const ctx = this.canvas.getContext('2d');
    const image = ctx.createImageData(RESOLUTION, RESOLUTION);
    for (let i = 0; i < this.noise.length; i++) {
      const n = this.noise[i];
      const presence = smoothstep(threshold - EDGE[0], threshold + EDGE[1], n);
      if (presence <= 0) continue;
      const depth = clamp01((n - threshold) / (1 - threshold));
      const shade = clamp01(darkness * (0.35 + depth));
      image.data.set([lerp(LIGHT[0], DARK[0], shade), lerp(LIGHT[1], DARK[1], shade), lerp(LIGHT[2], DARK[2], shade), presence * (0.8 + depth * 0.2) * 255], i * 4);
    }
    ctx.putImageData(image, 0, 0);
    this.painted = { coverage, darkness };
  }

  /** Örtüyü (offsetX, offsetY) kadar kaymış olarak, harita sınırları içinde çizer. */
  draw(ctx, { coverage, darkness, alpha, offsetX, offsetY }) {
    if (alpha <= 0.01) return;
    const { painted } = this;
    if (Math.abs(painted.coverage - coverage) > REPAINT_STEP || Math.abs(painted.darkness - darkness) > REPAINT_STEP * 3) this.#paint(coverage, darkness);

    const size = this.worldSize;
    const ox = ((offsetX % size) + size) % size;
    const oy = ((offsetY % size) + size) % size;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, size, size);
    ctx.clip();
    ctx.globalAlpha = alpha;
    ctx.imageSmoothingEnabled = true;
    for (const x of [ox - size, ox]) {
      for (const y of [oy - size, oy]) ctx.drawImage(this.canvas, x, y, size, size);
    }
    ctx.restore();
  }
}
