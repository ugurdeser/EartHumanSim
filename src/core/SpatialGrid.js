import { wrapX } from './Planet.js';

/**
 * Konumu sabit nesneler için uzamsal ızgara (göletler, madenler, yuvalar ...).
 * Nesnelerin bir `position` (Vector2) alanı olmalı. `onQuery(minX, minY, maxX, maxY)` verilirse her
 * sorgudan önce çağrılır: nesneleri gerektikçe üreten (ör. uzak bölgelerin göletleri) buradan bilgilenir.
 */
export class SpatialGrid {
  constructor(worldWidth, worldHeight, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldWidth / cellSize);
    this.rows = Math.ceil(worldHeight / cellSize);
    this.cells = new Map(); // seyrek: yalnızca dolu hücreler tutulur
    this.onQuery = null;
  }

  #col(x) {
    return Math.min(this.cols - 1, Math.floor(wrapX(x) / this.cellSize));
  }

  #row(y) {
    return Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellSize)));
  }

  #key(cx, cy) {
    return cy * this.cols + cx;
  }

  #cellOf(item) {
    return this.#key(this.#col(item.position.x), this.#row(item.position.y));
  }

  insert(item) {
    const key = this.#cellOf(item);
    let cell = this.cells.get(key);
    if (!cell) this.cells.set(key, (cell = []));
    cell.push(item);
  }

  remove(item) {
    const key = this.#cellOf(item);
    const cell = this.cells.get(key);
    if (!cell) return;
    const index = cell.indexOf(item);
    if (index >= 0) cell.splice(index, 1);
    if (cell.length === 0) this.cells.delete(key);
  }

  forEachInRect(minX, minY, maxX, maxY, callback) {
    this.onQuery?.(minX, minY, maxX, maxY);
    const x0 = Math.floor(minX / this.cellSize);
    const x1 = Math.min(Math.floor(maxX / this.cellSize), x0 + this.cols - 1);
    const y0 = this.#row(minY);
    const y1 = this.#row(maxY);
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const cell = this.cells.get(this.#key(((gx % this.cols) + this.cols) % this.cols, gy));
        if (cell) for (const item of cell) callback(item);
      }
    }
  }

  queryRadius(position, radius, predicate = () => true) {
    const result = [];
    const radiusSq = radius * radius;
    this.forEachInRect(position.x - radius, position.y - radius, position.x + radius, position.y + radius, (item) => {
      if (position.distanceSqTo(item.position) <= radiusSq && predicate(item)) result.push(item);
    });
    return result;
  }

  /** Halka halka dışa doğru arayarak koşulu sağlayan en yakın nesneyi bulur. */
  findNearest(position, maxRadius, predicate = () => true, distanceOf = (item) => position.distanceTo(item.position)) {
    const cx = this.#col(position.x);
    const cy = this.#row(position.y);
    const maxRing = Math.ceil(maxRadius / this.cellSize);
    this.onQuery?.(position.x - maxRadius, position.y - maxRadius, position.x + maxRadius, position.y + maxRadius);
    let best = null;
    let bestDistance = maxRadius;

    for (let ring = 0; ring <= maxRing; ring++) {
      if (best && (ring - 1) * this.cellSize > bestDistance) break;
      for (let gy = cy - ring; gy <= cy + ring; gy++) {
        if (gy < 0 || gy >= this.rows) continue;
        for (let gx = cx - ring; gx <= cx + ring; gx++) {
          if (Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) !== ring) continue;
          const cell = this.cells.get(this.#key((gx + this.cols) % this.cols, gy));
          if (!cell) continue;
          for (const item of cell) {
            const distance = distanceOf(item);
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
}
