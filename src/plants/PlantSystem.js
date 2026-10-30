import { PLANTS } from '../config.js';
import { PlantEcology } from './PlantEcology.js';

/**
 * Etkin bölgedeki parçaların bitkilerini sırayla işler: her parça PLANTS.TICK'te bir.
 * Yük adımlara yayılır; uzaktaki (etkin olmayan) parçalar beklemede kalır,
 * yeniden etkinleşince aradaki büyüme bir kerede hesaplanır.
 */
export class PlantSystem {
  constructor(world) {
    this.queue = [];
    this.budget = 0;
    // yeni etkinleşen parça hemen izlenmeye başlar (komşudan gelen tohumlar tutabilsin)
    world.activeRegion.onFirstActivation((cx, cy) => {
      const chunk = world.chunks.get(cx, cy);
      chunk.ecology ??= new PlantEcology(chunk, world.now);
    });
  }

  update(world, dt) {
    const active = world.activeRegion.keys;
    if (active.size === 0) return;
    this.budget = Math.min(active.size, this.budget + (active.size * dt) / PLANTS.TICK);
    const chunks = world.chunks;
    while (this.budget >= 1) {
      if (this.queue.length === 0) this.queue = [...active];
      const key = this.queue.pop();
      if (!active.has(key)) continue;
      this.budget--;
      const chunk = chunks.get(key % chunks.cols, Math.floor(key / chunks.cols));
      if (chunk.ecology) chunk.ecology.update(chunk, world);
      else chunk.ecology = new PlantEcology(chunk, world.now);
    }
  }
}
