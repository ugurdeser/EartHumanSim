import { DAY } from '../config.js';
import { fitCanvas } from './fitCanvas.js';

const SUN_STEPS = 720; // gün bu kadar adıma bölünür: güneş ilerledikçe gölgeler yenilenir

/**
 * Dağların gölgesi ve karı: görünen alan için boyanır, bitkiler üstünde kalır.
 * Boyamayı `painter` yapar (ekran kartı ya da işlemci); katman yalnızca ne zaman yenileneceğini bilir.
 */
export class ReliefLayer {
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
    const step = Math.round((this.world.now / DAY) * SUN_STEPS);
    const view = `${camera.x}|${camera.y}|${camera.zoom}|${width}|${height}|${step}`;
    if (view !== this.painted) {
      this.painter.paint(fitCanvas(this.canvas, width, height), { bounds });
      this.painted = view;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  }
}
