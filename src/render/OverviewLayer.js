import { COLORS } from '../config.js';
import { Calendar } from '../core/Calendar.js';
import { Surface, Terrain } from '../world/Terrain.js';
import { groundColor, hexToRgb, paletteAt, paletteRgb } from './GroundColor.js';

const WIDTH = 2016; // küçük gezegende 125 m/piksel
const HEIGHT = 1008;
const MAX_ZOOM = 0.18; // bundan yakında parça katmanı devralır

/**
 * Yeryüzünün zemini: bitki yoğunluklarından renklenmiş tek bir resim (küre bunu sarar).
 * Ekran kartı varsa düz görünümün zeminini GroundLayer her yakınlıkta ayrıntısıyla boyar; yoksa
 * yakın katmanlar bu resmin üstüne çizilir. Yoğunluklar bir kez, pikselin boyuna göre ortalanarak
 * hesaplanır; mevsim değişince yalnızca yeniden renklenir.
 */
export class OverviewLayer {
  constructor(world) {
    this.world = world;
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.seasons = null; // [kuzey, güney]: boyandığı mevsimler
    this.version = 0;
    this.ready = false;
  }

  /** Yoğunlukları bir solukta hesaplar (hazırlanmadıysa). */
  prepare() {
    for (const _ of this.preparing());
    return this;
  }

  /** Yoğunlukların parça parça hesabı: ilerlemeyi (0..1) verir (yükleme ekranı için). */
  *preparing(rowsPerStep = 48) {
    if (this.ready) return;
    for (const progress of this.#computeDensities(rowsPerStep)) yield progress;
    this.ready = true;
  }

  *#computeDensities(rowsPerStep) {
    const n = WIDTH * HEIGHT;
    this.tree = new Float32Array(n);
    this.bush = new Float32Array(n);
    this.grass = new Float32Array(n);
    this.fertility = new Float32Array(n);
    this.surface = new Uint8Array(n);
    const cell = this.world.width / WIDTH;
    const detail = Terrain.detailFor(cell);
    const { biomes, terrain } = this.world;
    for (let py = 0; py < HEIGHT; py++) {
      for (let px = 0; px < WIDTH; px++) {
        const x = (px + 0.5) * cell;
        const y = (py + 0.5) * cell;
        const i = py * WIDTH + px;
        this.surface[i] = terrain.surfaceAt(x, y, detail);
        if (this.surface[i] !== Surface.LAND) continue;
        this.tree[i] = biomes.treeChance(x, y, cell);
        this.bush[i] = biomes.bushChance(x, y, cell);
        this.grass[i] = biomes.grassChance(x, y, cell);
        this.fertility[i] = biomes.fertility(x, y, cell);
      }
      if ((py + 1) % rowsPerStep === 0) yield (py + 1) / HEIGHT;
    }
  }

  #paint(north, south) {
    const ctx = this.canvas.getContext('2d');
    const image = ctx.createImageData(WIDTH, HEIGHT);
    const flat = ctx.createImageData(WIDTH, HEIGHT); // düz görünüm: deniz yerine de zemin (denizi SeaLayer çizer)
    const [n, s] = [paletteRgb(north), paletteRgb(south)];
    const palettes = Array.from({ length: HEIGHT }, (_, row) => paletteAt(n, s, (row + 0.5) / HEIGHT));
    const sea = hexToRgb(COLORS.SEA);
    const ice = hexToRgb(COLORS.ICE);
    for (let i = 0; i < this.tree.length; i++) {
      const palette = palettes[Math.floor(i / WIDTH)];
      const land = this.surface[i] === Surface.LAND;
      const c = land ? groundColor(palette, this.tree[i], this.bush[i], this.grass[i], this.fertility[i]) : palette.ground;
      flat.data.set([c[0], c[1], c[2], 255], i * 4);
      image.data.set(land ? [c[0], c[1], c[2], 255] : [...(this.surface[i] === Surface.SEA ? sea : ice), 255], i * 4);
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
    ctx.putImageData(flat, 0, 0); // düz görünümde suları gerçek boyutlarıyla özellik katmanı çizer
    this.seasons = [north, south];
    this.version++;
  }

  /** İki yarıkürenin mevsim renkleriyle boyalı olmasını sağlar. */
  refresh() {
    const north = Calendar.seasonAt(this.world.now, 0);
    const south = Calendar.seasonAt(this.world.now, this.world.height);
    if (!this.seasons || this.seasons[0] !== north || this.seasons[1] !== south) this.#paint(north, south);
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
