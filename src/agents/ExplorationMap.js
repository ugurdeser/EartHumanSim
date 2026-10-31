import { wrapX } from '../core/Planet.js';
import { Vector2 } from '../core/Vector2.js';

/** Kişinin dünyada gördüğü yerlerin hafızası (Merak güdüsü için). */
export class ExplorationMap {
  constructor(worldWidth, worldHeight, cellSize) {
    this.cellSize = cellSize;
    this.cols = Math.ceil(worldWidth / cellSize);
    this.rows = Math.ceil(worldHeight / cellSize);
    this.cells = new Set(); // seyrek: yalnızca görülen hücreler
    this.lastCell = -1;
  }

  get exploredFraction() {
    return this.cells.size / (this.cols * this.rows);
  }

  /** Doğu-batı sarar. */
  #index(gx, gy) {
    return gy * this.cols + ((gx % this.cols) + this.cols) % this.cols;
  }

  #inBounds(gy) {
    return gy >= 0 && gy < this.rows;
  }

  #gridX(x) {
    return Math.floor(wrapX(x) / this.cellSize);
  }

  /** Bulunulan hücreyi ve komşularını "görüldü" işaretler. */
  mark(position) {
    const gx = this.#gridX(position.x);
    const gy = Math.floor(position.y / this.cellSize);
    const cell = this.#index(gx, gy);
    if (cell === this.lastCell) return;
    this.lastCell = cell;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = gx + dx;
        const y = gy + dy;
        if (!this.#inBounds(y)) continue;
        this.cells.add(this.#index(x, y));
      }
    }
  }

  isExplored(position) {
    const gx = this.#gridX(position.x);
    const gy = Math.floor(position.y / this.cellSize);
    return this.#inBounds(gy) && this.cells.has(this.#index(gx, gy));
  }

  /** En yakın halkadan rastgele bir keşfedilmemiş (ve gidilebilir) hücrenin merkezini döndürür. */
  findUnexplored(position, rng, maxRing, isOpen = () => true) {
    const cx = this.#gridX(position.x);
    const cy = Math.floor(position.y / this.cellSize);
    for (let ring = 1; ring <= maxRing; ring++) {
      const candidates = [];
      for (let gy = cy - ring; gy <= cy + ring; gy++) {
        for (let gx = cx - ring; gx <= cx + ring; gx++) {
          if (Math.max(Math.abs(gx - cx), Math.abs(gy - cy)) !== ring) continue;
          if (!this.#inBounds(gy) || this.cells.has(this.#index(gx, gy))) continue;
          if (isOpen((gx + 0.5) * this.cellSize, (gy + 0.5) * this.cellSize)) candidates.push([gx, gy]);
        }
      }
      if (candidates.length > 0) {
        const [gx, gy] = rng.pick(candidates);
        return new Vector2(wrapX((gx + 0.5) * this.cellSize), (gy + 0.5) * this.cellSize);
      }
    }
    return null;
  }
}
