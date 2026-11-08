import { fitCanvas } from './fitCanvas.js';

/**
 * Deniz ve buzullar: görünen alan için bir kez boyanır, kamera oynayınca yenilenir.
 * Boyamayı `painter` yapar (ekran kartı ya da işlemci).
 */
export class SeaLayer {
  constructor(world, painter) {
    this.world = world;
    this.painter = painter;
    this.canvas = document.createElement('canvas');
    this.painted = '';
  }

  draw(ctx, camera) {
    const bounds = camera.visibleBounds;
    const pixel = this.painter.sampleSize;
    const width = Math.ceil(camera.width / pixel);
    const height = Math.ceil(camera.height / pixel);
    const view = `${camera.x}|${camera.y}|${camera.zoom}|${width}|${height}`;
    if (view !== this.painted) {
      this.painter.paint(fitCanvas(this.canvas, width, height), { bounds });
      this.painted = view;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  }
}
