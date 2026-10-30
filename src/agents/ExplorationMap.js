import { Vector2 } from '../core/Vector2.js';

/** Kişinin dünyada gördüğü yerlerin hafızası (Merak güdüsü için). */
export class ExplorationMap {
  constructor(worldSize, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldSize / cellSize);
    this.cells = new Uint8Array(this.cols * this.cols);
    this.exploredCount = 0;
    this.lastCell = -1;
  }

  get exploredFraction() {
    return this.exploredCount / this.cells.length;
  }

  #index(gx, gy) {
    return gy * this.cols + gx;
  }

  #inBounds(gx, gy) {
    return gx >= 0 && gy >= 0 && gx < this.cols && gy < this.cols;
  }

  /** Bulunulan hücreyi ve komşularını "görüldü" işaretler. */
  mark(position) {
    const gx = Math.floor(position.x / this.cellSize);
    const gy = Math.floor(position.y / this.cellSize);
    const cell = this.#index(gx, gy);
    if (cell === this.lastCell) return;
    this.lastCell = cell;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx;
        const y = gy + dy;
        if (!this.#inBounds(x, y)) continue;
        const i = this.#index(x, y);
        if (this.cells[i]) continue;
        this.cells[i] = 1;
        this.exploredCount++;
      }
    }
  }

  isExplored(position) {
    const gx = Math.floor(position.x / this.cellSize);
    const gy = Math.floor(position.y / this.cellSize);
    return this.#inBounds(gx, gy) && this.cells[this.#index(gx, gy)] === 1;
  }

  /** En yakın halkadan rastgele bir keşfedilmemiş hücrenin merkezini döndürür. */
  findUnexplored(position, rng, maxRing) {
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    for (let ring = 1; ring <= maxRing; ring++) {
      const candidates = [];
      for (let gy = cy - ring; gy <= cy + ring; gy++) {
        for (let gx = cx - ring; gx <= cx + ring; gx++) {
          if (Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) !== ring) continue;
          if (this.#inBounds(gx, gy) && !this.cells[this.#index(gx, gy)]) candidates.push([gx, gy]);
        }
      }
      if (candidates.length > 0) {
        const [gx, gy] = rng.pick(candidates);
        return new Vector2((gx + 0.5) * this.cellSize, (gy + 0.5) * this.cellSize);
      }
    }
    return null;
  }
}
