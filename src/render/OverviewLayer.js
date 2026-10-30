import { COLORS } from '../config.js';

const RESOLUTION = 800; // 8 km → 10 m/piksel
const MAX_ZOOM = 0.25; // bundan yakında parça katmanı devralır

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/**
 * Tüm haritanın uzaktan görünümü: bitki yoğunluklarından renklenmiş tek bir resim.
 * Yoğunluklar bir kez hesaplanır; mevsim değişince yalnızca yeniden renklenir.
 */
export class OverviewLayer {
  constructor(world) {
    this.world = world;
    this.canvas = document.createElement('canvas');
    this.canvas.width = RESOLUTION;
    this.canvas.height = RESOLUTION;
    this.season = null;
    this.#computeDensities();
  }

  #computeDensities() {
    const n = RESOLUTION * RESOLUTION;
    this.tree = new Float32Array(n);
    this.bush = new Float32Array(n);
    this.grass = new Float32Array(n);
    const cell = this.world.size / RESOLUTION;
    const biomes = this.world.biomes;
    for (let py = 0; py < RESOLUTION; py++) {
      for (let px = 0; px < RESOLUTION; px++) {
        const x = (px + 0.5) * cell;
        const y = (py + 0.5) * cell;
        const i = py * RESOLUTION + px;
        this.tree[i] = biomes.treeChance(x, y);
        this.bush[i] = biomes.bushChance(x, y);
        this.grass[i] = biomes.grassChance(x, y);
      }
    }
  }

  #paint(season) {
    const ctx = this.canvas.getContext('2d');
    const image = ctx.createImageData(RESOLUTION, RESOLUTION);
    const palette = Object.fromEntries(Object.entries(season.palette).map(([k, v]) => [k, hexToRgb(v)]));
    for (let i = 0; i < this.tree.length; i++) {
      let c = mix(palette.ground, palette.grass, Math.min(1, this.grass[i] * 0.8));
      c = mix(c, palette.bush, Math.min(1, this.bush[i] * 0.6));
      c = mix(c, palette.tree, Math.min(1, this.tree[i] * 1.1));
      image.data.set([c[0], c[1], c[2], 255], i * 4);
    }
    ctx.putImageData(image, 0, 0);

    const scale = RESOLUTION / this.world.size;
    for (const pond of this.world.ponds) {
      ctx.fillStyle = pond.contaminated ? COLORS.WATER_DIRTY : COLORS.WATER;
      ctx.beginPath();
      ctx.arc(pond.position.x * scale, pond.position.y * scale, Math.max(0.8, pond.radius * scale), 0, Math.PI * 2);
      ctx.fill();
    }
    this.season = season;
  }

  /** Daha yakın katmanların altında da zemin olarak çizilir (eksik parçalar görünmesin). */
  draw(ctx, camera) {
    const season = this.world.calendar.season;
    if (season !== this.season) this.#paint(season);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, 0, 0, this.world.size, this.world.size);
  }

  static get maxZoom() {
    return MAX_ZOOM;
  }
}
