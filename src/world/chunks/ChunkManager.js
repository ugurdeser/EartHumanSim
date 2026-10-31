import { wrapX } from '../../core/Planet.js';
import { Chunk } from './Chunk.js';

/**
 * Parçaları gerektikçe üretir ve dokunulmamış olanları bellekten atar.
 * Dünyanın geri kalanı parçaların nasıl üretildiğini bilmez (yalnızca sorgular).
 */
export class ChunkManager {
  constructor({ worldWidth, worldHeight, chunkSize, generator, maxLoaded }) {
    this.chunkSize = chunkSize;
    this.cols = Math.ceil(worldWidth / chunkSize);
    this.rows = Math.ceil(worldHeight / chunkSize);
    this.generator = generator;
    this.maxLoaded = maxLoaded;
    this.chunks = new Map();
    this.tick = 0;
  }

  get loadedCount() {
    return this.chunks.size;
  }

  coordX(x) {
    return Math.min(this.cols - 1, Math.floor(wrapX(x) / this.chunkSize));
  }

  coordY(y) {
    return Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.chunkSize)));
  }

  keyOf(cx, cy) {
    return cy * this.cols + cx;
  }

  keyAt(position) {
    return this.keyOf(this.coordX(position.x), this.coordY(position.y));
  }

  /** Parçayı döndürür; henüz yoksa üretir. */
  get(cx, cy) {
    const key = this.keyOf(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cy, this.chunkSize, key);
      this.generator.populate(chunk);
      this.chunks.set(key, chunk);
    }
    chunk.lastUsed = this.tick;
    return chunk;
  }

  /** Üretmeden bakar (yoksa null). */
  peek(cx, cy) {
    return this.chunks.get(this.keyOf(cx, cy)) ?? null;
  }

  isLoaded(cx, cy) {
    return this.chunks.has(this.keyOf(cx, cy));
  }

  forEachInRect(minX, minY, maxX, maxY, callback, { generate = true } = {}) {
    const x0 = Math.floor(minX / this.chunkSize);
    const x1 = Math.min(Math.floor(maxX / this.chunkSize), x0 + this.cols - 1);
    const y0 = this.coordY(minY);
    const y1 = this.coordY(maxY);
    for (let cy = y0; cy <= y1; cy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const cx = ((gx % this.cols) + this.cols) % this.cols;
        const chunk = generate ? this.get(cx, cy) : this.peek(cx, cy);
        if (chunk) callback(chunk);
      }
    }
  }

  /**
   * Parçaları yakından uzağa tarayarak koşulu sağlayan en yakın nesneyi bulur.
   * `itemsOf(chunk)` parçadaki aday listesini verir.
   */
  findNearest(position, maxRadius, itemsOf, predicate = () => true) {
    const cx = this.coordX(position.x);
    const cy = this.coordY(position.y);
    const maxRing = Math.ceil(maxRadius / this.chunkSize);
    let best = null;
    let bestDistance = maxRadius;

    for (let ring = 0; ring <= maxRing; ring++) {
      if (best && (ring - 1) * this.chunkSize > bestDistance) break;
      for (let gy = cy - ring; gy <= cy + ring; gy++) {
        if (gy < 0 || gy >= this.rows) continue;
        for (let gx = cx - ring; gx <= cx + ring; gx++) {
          if (Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) !== ring) continue;
          const chunk = this.get((gx + this.cols) % this.cols, gy);
          if (chunk.distanceTo(position) > bestDistance) continue;
          for (const item of itemsOf(chunk)) {
            const distance = position.distanceTo(item.position);
            if (distance < bestDistance && predicate(item)) {
              best = item;
              bestDistance = distance;
            }
          }
        }
      }
    }
    return best;
  }

  /** Bellek sınırı aşıldıysa uzun süredir kullanılmayan, değişmemiş parçaları atar. */
  evict(protectedKeys = new Set()) {
    this.tick++;
    if (this.chunks.size <= this.maxLoaded) return;
    const candidates = [...this.chunks.values()]
      .filter((c) => !protectedKeys.has(c.key) && !c.isModified)
      .sort((a, b) => a.lastUsed - b.lastUsed);
    const excess = this.chunks.size - Math.floor(this.maxLoaded * 0.8);
    for (const chunk of candidates.slice(0, excess)) this.chunks.delete(chunk.key);
  }
}
