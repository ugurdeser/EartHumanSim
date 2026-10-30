import { WORLD } from '../config.js';

/**
 * İnsanların çevresindeki "etkin" parçalar. Hayvanlar yalnızca burada simüle edilir;
 * yeni etkinleşen parçalar dinleyicilere bildirilir (ör. hayvan üretimi için).
 */
export class ActiveRegion {
  constructor(chunks, radius = WORLD.ACTIVE_RADIUS) {
    this.chunks = chunks;
    this.radius = radius;
    this.keys = new Set();
    this.everActive = new Set();
    this.listeners = [];
    this.signature = '';
  }

  onFirstActivation(listener) {
    this.listeners.push(listener);
  }

  isActive(position) {
    return this.keys.has(this.chunks.keyAt(position));
  }

  /** Kimse başka parçaya geçmediyse hesaplama atlanır. */
  refresh(people) {
    const signature = people.map((p) => this.chunks.keyAt(p.position)).join(',');
    if (signature === this.signature) return;
    this.signature = signature;

    const size = this.chunks.chunkSize;
    const ring = Math.ceil(this.radius / size);
    const next = new Set();
    for (const person of people) {
      const cx = this.chunks.coord(person.position.x);
      const cy = this.chunks.coord(person.position.y);
      for (let dy = -ring; dy <= ring; dy++) {
        for (let dx = -ring; dx <= ring; dx++) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= this.chunks.cols || y >= this.chunks.cols) continue;
          if (Math.hypot(dx, dy) * size > this.radius + size) continue;
          next.add(this.chunks.keyOf(x, y));
        }
      }
    }
    this.keys = next;
    for (const key of next) {
      if (this.everActive.has(key)) continue;
      this.everActive.add(key);
      const cx = key % this.chunks.cols;
      const cy = Math.floor(key / this.chunks.cols);
      this.listeners.forEach((listener) => listener(cx, cy));
    }
  }
}
