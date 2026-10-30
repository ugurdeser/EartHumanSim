import { ROAD } from '../config.js';
import { Vector2 } from '../core/Vector2.js';

/** Taş yol karoları: üzerinde yürüyenler daha hızlı ilerler. */
export class RoadNetwork {
  constructor(worldSize) {
    this.cols = Math.ceil(worldSize / ROAD.TILE);
    this.tiles = new Map(); // anahtar -> Vector2 (karo merkezi)
  }

  get size() {
    return this.tiles.size;
  }

  #key(gx, gy) {
    return gy * this.cols + gx;
  }

  #tileOf(position) {
    return [Math.floor(position.x / ROAD.TILE), Math.floor(position.y / ROAD.TILE)];
  }

  has(position) {
    const [gx, gy] = this.#tileOf(position);
    return this.tiles.has(this.#key(gx, gy));
  }

  add(position) {
    const [gx, gy] = this.#tileOf(position);
    const key = this.#key(gx, gy);
    if (this.tiles.has(key)) return false;
    this.tiles.set(key, new Vector2((gx + 0.5) * ROAD.TILE, (gy + 0.5) * ROAD.TILE));
    return true;
  }

  speedFactor(position) {
    return this.tiles.size > 0 && this.has(position) ? ROAD.SPEED_BONUS : 1;
  }

  /** İki nokta arasındaki düz hat üzerinde henüz yol olmayan karoların merkezleri. */
  missingTilesBetween(from, to) {
    const distance = from.distanceTo(to);
    const steps = Math.ceil(distance / (ROAD.TILE * 0.7));
    const missing = [];
    const seen = new Set();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = new Vector2(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
      const [gx, gy] = this.#tileOf(point);
      const key = this.#key(gx, gy);
      if (seen.has(key) || this.tiles.has(key)) continue;
      seen.add(key);
      missing.push(new Vector2((gx + 0.5) * ROAD.TILE, (gy + 0.5) * ROAD.TILE));
    }
    return missing;
  }

  forEachInRect(minX, minY, maxX, maxY, callback) {
    for (const tile of this.tiles.values()) {
      if (tile.x >= minX && tile.x <= maxX && tile.y >= minY && tile.y <= maxY) callback(tile);
    }
  }
}
