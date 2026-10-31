import { WORLD } from '../config.js';

const CENTER_CELL = 4; // insanlar 4x4 parçalık (1 km) hücrelere yuvarlanır: küçük yer değişimleri yeniden hesap gerektirmez

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
    this.offsets = this.#ringOffsets();
  }

  /** Bir parçanın çevresinde etkin sayılan parçaların göreli konumları (bir kez hesaplanır). */
  #ringOffsets() {
    const size = this.chunks.chunkSize;
    const ring = Math.ceil(this.radius / size) + Math.ceil(CENTER_CELL / 2);
    const offsets = [];
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.hypot(dx, dy) * size <= this.radius + size * (1 + CENTER_CELL / 2)) offsets.push([dx, dy]);
      }
    }
    return offsets;
  }

  /** Kişinin bulunduğu hücrenin orta parçası. */
  #centerOf(position) {
    const { cols, rows } = this.chunks;
    const snap = (index) => Math.floor(index / CENTER_CELL) * CENTER_CELL + CENTER_CELL / 2;
    return this.chunks.keyOf(snap(this.chunks.coordX(position.x)) % cols, Math.min(rows - 1, snap(this.chunks.coordY(position.y))));
  }

  onFirstActivation(listener) {
    this.listeners.push(listener);
  }

  isActive(position) {
    return this.keys.has(this.chunks.keyAt(position));
  }

  /**
   * Aynı hücredeki insanlar tek merkez sayılır; merkezler değişmediyse hesaplama atlanır.
   */
  refresh(people) {
    const centers = [...new Set(people.map((p) => this.#centerOf(p.position)))].sort((a, b) => a - b);
    const signature = centers.join(',');
    if (signature === this.signature) return;
    this.signature = signature;

    const { cols, rows } = this.chunks;
    const next = new Set();
    for (const center of centers) {
      const cx = center % cols;
      const cy = Math.floor(center / cols);
      for (const [dx, dy] of this.offsets) {
        const y = cy + dy;
        if (y >= 0 && y < rows) next.add(this.chunks.keyOf((cx + dx + cols) % cols, y));
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
