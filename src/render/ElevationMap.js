import { clamp01 } from '../core/MathUtils.js';
import { Surface } from '../world/Terrain.js';

const ALPHA = 0.78;

/** [t, r, g, b] durakları arasında renk (yükselti haritalarının alışılmış renkleri). */
const ramp = (stops) => (t) => {
  const x = clamp01(t);
  for (let i = 1; i < stops.length; i++) {
    const [t1, ...c1] = stops[i];
    if (x > t1) continue;
    const [t0, ...c0] = stops[i - 1];
    const f = (x - t0) / (t1 - t0 || 1);
    return c0.map((c, n) => c + (c1[n] - c) * f);
  }
  return stops[stops.length - 1].slice(1);
};

/** Kara: kıyıda yeşil, yükseldikçe sarı, kahverengi, doruklarda beyaz. */
export const LAND_COLORS = ramp([[0, 60, 140, 70], [0.12, 120, 175, 85], [0.3, 225, 210, 120], [0.55, 175, 120, 70], [0.8, 130, 95, 80], [1, 250, 250, 252]]);
/** Deniz: kıyıda açık, derinde koyu mavi. */
const SEA_COLORS = ramp([[0, 140, 200, 235], [0.35, 50, 120, 200], [1, 15, 40, 110]]);
const ICE_COLOR = [225, 238, 248];

/**
 * Yükselti haritası: arazinin kendi çözünürlüğünde, bir kez boyanır (arazi değişmez).
 * Kara yükseltiye, deniz derinliğe göre renklenir.
 */
export class ElevationMap {
  /** `alpha`: haritanın üstüne serilirken saydamlığı (önizlemede 1). */
  constructor(terrain, { alpha = ALPHA } = {}) {
    this.terrain = terrain;
    this.alpha = alpha;
    this.width = terrain.cols;
    this.height = terrain.rows;
    this.pixels = null;
    this.canvas = null;
  }

  /** İlk istendiğinde boyar. */
  ensure() {
    if (this.pixels) return this;
    const { terrain, width, height } = this;
    const pixels = new Uint8ClampedArray(width * height * 4);
    let deepest = terrain.seaLevel;
    for (const h of terrain.heights) deepest = Math.min(deepest, h);
    const cell = terrain.cellSize;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const i = row * width + col;
        const surface = terrain.surfaceAt(col * cell, row * cell);
        let color;
        if (surface === Surface.ICE) color = ICE_COLOR;
        else if (surface === Surface.SEA) color = SEA_COLORS((terrain.seaLevel - terrain.heights[i]) / (terrain.seaLevel - deepest || 1));
        else color = LAND_COLORS(terrain.elevations[i]);
        pixels.set([color[0], color[1], color[2], this.alpha * 255], i * 4);
      }
    }
    this.pixels = pixels;
    this.canvas = document.createElement('canvas');
    Object.assign(this.canvas, { width, height });
    this.canvas.getContext('2d').putImageData(new ImageData(pixels, width, height), 0, 0);
    return this;
  }
}
