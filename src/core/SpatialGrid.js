/**
 * Konumu sabit nesneler için uzamsal ızgara (göletler, madenler, yuvalar ...).
 * Nesnelerin bir `position` (Vector2) alanı olmalı.
 */
export class SpatialGrid {
  constructor(worldSize, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldSize / cellSize);
    this.cells = new Map(); // seyrek: yalnızca dolu hücreler tutulur
  }

  #coord(value) {
    return Math.min(this.cols - 1, Math.max(0, Math.floor(value / this.cellSize)));
  }

  #key(cx, cy) {
    return cy * this.cols + cx;
  }

  #cellOf(item) {
    return this.#key(this.#coord(item.position.x), this.#coord(item.position.y));
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
    const x0 = this.#coord(minX);
    const y0 = this.#coord(minY);
    const x1 = this.#coord(maxX);
    const y1 = this.#coord(maxY);
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const cell = this.cells.get(this.#key(gx, gy));
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
    const cx = this.#coord(position.x);
    const cy = this.#coord(position.y);
    const maxRing = Math.ceil(maxRadius / this.cellSize);
    let best = null;
    let bestDistance = maxRadius;

    for (let ring = 0; ring <= maxRing; ring++) {
      if (best && (ring - 1) * this.cellSize > bestDistance) break;
      for (let gy = cy - ring; gy <= cy + ring; gy++) {
        if (gy < 0 || gy >= this.cols) continue;
        for (let gx = cx - ring; gx <= cx + ring; gx++) {
          if (gx < 0 || gx >= this.cols) continue;
          if (Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) !== ring) continue;
          const cell = this.cells.get(this.#key(gx, gy));
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
