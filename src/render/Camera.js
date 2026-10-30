import { clamp } from '../core/MathUtils.js';
import { Vector2 } from '../core/Vector2.js';

/** Kuş bakışı kamera: dünya (metre) ↔ ekran (piksel) dönüşümü, zoom ve kaydırma. */
export class Camera {
  constructor(worldSize) {
    this.worldSize = worldSize;
    this.x = worldSize / 2;
    this.y = worldSize / 2;
    this.zoom = 0.2; // piksel / metre
    this.minZoom = 0.05;
    this.maxZoom = 40;
    this.width = 1;
    this.height = 1;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  fitWorld() {
    this.zoom = (Math.min(this.width, this.height) / this.worldSize) * 0.95;
    this.minZoom = this.zoom * 0.5;
    this.x = this.worldSize / 2;
    this.y = this.worldSize / 2;
  }

  screenToWorld(sx, sy) {
    return new Vector2((sx - this.width / 2) / this.zoom + this.x, (sy - this.height / 2) / this.zoom + this.y);
  }

  zoomAt(sx, sy, factor) {
    const before = this.screenToWorld(sx, sy);
    this.zoom = clamp(this.zoom * factor, this.minZoom, this.maxZoom);
    const after = this.screenToWorld(sx, sy);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.#clampCenter();
  }

  panBy(dxPixels, dyPixels) {
    this.x -= dxPixels / this.zoom;
    this.y -= dyPixels / this.zoom;
    this.#clampCenter();
  }

  centerOn(position) {
    this.x = position.x;
    this.y = position.y;
    this.#clampCenter();
  }

  #clampCenter() {
    this.x = clamp(this.x, 0, this.worldSize);
    this.y = clamp(this.y, 0, this.worldSize);
  }

  get visibleBounds() {
    const halfW = this.width / 2 / this.zoom;
    const halfH = this.height / 2 / this.zoom;
    return { minX: this.x - halfW, minY: this.y - halfH, maxX: this.x + halfW, maxY: this.y + halfH };
  }

  /** Bir ekran piksel boyutunu dünya metresine çevirir (sabit piksel boyutlu noktalar için). */
  pixels(px) {
    return px / this.zoom;
  }

  applyTo(ctx, dpr) {
    const scale = this.zoom * dpr;
    ctx.setTransform(scale, 0, 0, scale, (this.width / 2 - this.x * this.zoom) * dpr, (this.height / 2 - this.y * this.zoom) * dpr);
  }
}
