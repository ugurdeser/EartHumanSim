import { Calendar } from '../core/Calendar.js';
import { DotPainter } from './DotPainter.js';
import { OverviewLayer } from './OverviewLayer.js';

const BITMAP = 96; // parça resmi kenarı (piksel)
const MAX_ZOOM = 1.5; // bundan yakında bitkiler tek tek çizilir
const CACHE_LIMIT = 1800;
const NEW_PER_FRAME = 24; // kare başına üretilecek en fazla yeni parça resmi
const MIN_DOT_PX = 0.6;

/**
 * Orta yakınlık: her parçanın bitkileri saydam küçük bir resme bir kez çizilir, altta zemin görünür.
 * Mevsim ya da parça içeriği değişince resim yenilenir.
 */
export class ChunkLayer {
  constructor(world) {
    this.world = world;
    this.cache = new Map(); // anahtar -> { canvas, version, season }
  }

  static get maxZoom() {
    return MAX_ZOOM;
  }

  draw(ctx, camera) {
    if (camera.zoom < OverviewLayer.maxZoom || camera.zoom >= MAX_ZOOM) return;
    const { minX, minY, maxX, maxY } = camera.visibleBounds;
    let budget = NEW_PER_FRAME;
    const chunks = this.world.chunks;
    const x0 = Math.max(0, Math.floor(minX / chunks.chunkSize)); // dikişin öbür yanı ayrı geçişte çizilir
    const y0 = chunks.coordY(minY);
    const x1 = Math.min(chunks.cols - 1, Math.floor(maxX / chunks.chunkSize));
    const y1 = chunks.coordY(maxY);

    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const key = chunks.keyOf(cx, cy);
        let entry = this.cache.get(key);
        const chunk = chunks.peek(cx, cy);
        const season = Calendar.seasonAt(this.world.now, (cy + 0.5) * chunks.chunkSize); // parçanın yarıküresinin mevsimi
        const stale = !entry || entry.season !== season || (chunk && entry.version !== chunk.version);
        if (stale) {
          if (budget-- <= 0) continue; // sonraki karelerde; altında uzak görünüm var
          entry = this.#render(chunks.get(cx, cy), season, entry?.canvas);
          this.cache.set(key, entry);
        }
        const size = chunks.chunkSize;
        ctx.drawImage(entry.canvas, cx * size, cy * size, size, size);
      }
    }
    this.#trim();
  }

  #render(chunk, season, reuse) {
    const canvas = reuse ?? document.createElement('canvas');
    canvas.width = BITMAP;
    canvas.height = BITMAP;
    const ctx = canvas.getContext('2d');
    const size = chunk.maxX - chunk.minX;
    const scale = BITMAP / size;
    ctx.setTransform(scale, 0, 0, scale, -chunk.minX * scale, -chunk.minY * scale);
    const radiusOf = (p) => Math.max(p.radius, MIN_DOT_PX / scale);
    DotPainter.batch(ctx, chunk.grass, season.palette.grass, radiusOf);
    DotPainter.batch(ctx, chunk.bushes, season.palette.bush, radiusOf);
    DotPainter.batch(ctx, chunk.standingTrees, season.palette.tree, radiusOf);
    return { canvas, version: chunk.version, season };
  }

  #trim() {
    if (this.cache.size <= CACHE_LIMIT) return;
    const excess = this.cache.size - CACHE_LIMIT;
    let i = 0;
    for (const key of this.cache.keys()) {
      if (i++ >= excess) break;
      this.cache.delete(key);
    }
  }
}
