import { COLORS } from '../config.js';
import { smoothstep } from '../core/MathUtils.js';
import { Surface } from '../world/Terrain.js';

const WIDTH = 2016; // 125 m/piksel
const HEIGHT = 1008;
const MAX_ZOOM = 0.18; // bundan yakında parça katmanı devralır
// Parça resimlerinde ölçülen kaplama: olasılık 1 iken yüzeyin bu payı o bitkinin noktalarıyla örtülü.
// Uzak görünüm, yakındaki noktaların ortalama rengidir; yaklaşınca görüntü değişmez.
const GRASS_COVER = 0.0192;
const BUSH_COVER = 0.016;
const TREE_COVER = 0.0977;

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const covered = (chance, cover) => 1 - Math.exp(-chance * cover); // noktalar üst üste de binebilir

/**
 * Yeryüzünün zemini: bitki yoğunluklarından renklenmiş tek bir resim.
 * Yakın katmanlar da bu resmin üstüne çizilir; uzaktan bakış yakının küçülmüş hâlidir.
 * Yoğunluklar bir kez hesaplanır; mevsim değişince yalnızca yeniden renklenir.
 */
export class OverviewLayer {
  constructor(world) {
    this.world = world;
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.season = null;
    this.#computeDensities();
  }

  #computeDensities() {
    const n = WIDTH * HEIGHT;
    this.tree = new Float32Array(n);
    this.bush = new Float32Array(n);
    this.grass = new Float32Array(n);
    this.fertility = new Float32Array(n);
    this.surface = new Uint8Array(n);
    const cell = this.world.width / WIDTH;
    const { biomes, terrain } = this.world;
    for (let py = 0; py < HEIGHT; py++) {
      for (let px = 0; px < WIDTH; px++) {
        const x = (px + 0.5) * cell;
        const y = (py + 0.5) * cell;
        const i = py * WIDTH + px;
        this.surface[i] = terrain.surfaceAt(x, y);
        if (this.surface[i] !== Surface.LAND) continue;
        this.tree[i] = biomes.treeChance(x, y);
        this.bush[i] = biomes.bushChance(x, y);
        this.grass[i] = biomes.grassChance(x, y);
        this.fertility[i] = biomes.fertility(x, y);
      }
    }
  }

  #paint(season) {
    const ctx = this.canvas.getContext('2d');
    const image = ctx.createImageData(WIDTH, HEIGHT);
    const palette = Object.fromEntries(Object.entries(season.palette).map(([k, v]) => [k, hexToRgb(v)]));
    const sea = hexToRgb(COLORS.SEA);
    const ice = hexToRgb(COLORS.ICE);
    for (let i = 0; i < this.tree.length; i++) {
      if (this.surface[i] !== Surface.LAND) {
        image.data.set([...(this.surface[i] === Surface.SEA ? sea : ice), 255], i * 4);
        continue;
      }
      // verimli toprak otla, sık ağaçlık orman tabanıyla örtülüdür
      const meadow = smoothstep(0.25, 0.9, this.fertility[i]) * (0.6 + 0.4 * Math.min(1, this.grass[i] / 0.6));
      let c = mix(palette.ground, palette.meadow, meadow);
      c = mix(c, palette.forest, smoothstep(0.08, 0.7, this.tree[i]));
      c = mix(c, palette.grass, covered(this.grass[i], GRASS_COVER));
      c = mix(c, palette.bush, covered(this.bush[i], BUSH_COVER));
      c = mix(c, palette.tree, covered(this.tree[i], TREE_COVER));
      image.data.set([c[0], c[1], c[2], 255], i * 4);
    }
    ctx.putImageData(image, 0, 0);

    const scale = WIDTH / this.world.width;
    for (const pond of this.world.ponds) {
      ctx.fillStyle = COLORS.WATER;
      ctx.beginPath();
      pond.trace(ctx, scale, 0.8);
      ctx.fill();
    }
    this.pixels = ctx.getImageData(0, 0, WIDTH, HEIGHT).data; // küre görünümü buradan örnekler (sular abartılı, seçilsin diye)
    ctx.putImageData(image, 0, 0); // düz görünümde suları gerçek boyutlarıyla özellik katmanı çizer
    this.season = season;
  }

  /** Mevsimin renkleriyle boyalı olmasını sağlar. */
  refresh() {
    const season = this.world.calendar.season;
    if (season !== this.season) this.#paint(season);
  }

  /** Daha yakın katmanların altında da zemin olarak çizilir (eksik parçalar görünmesin). */
  draw(ctx, camera) {
    this.refresh();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.canvas, 0, 0, this.world.width, this.world.height);
  }

  static get width() {
    return WIDTH;
  }

  static get height() {
    return HEIGHT;
  }

  static get maxZoom() {
    return MAX_ZOOM;
  }
}
