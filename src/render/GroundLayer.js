import { Calendar } from '../core/Calendar.js';
import { fitCanvas } from './fitCanvas.js';

/**
 * Düz ve kavisli görünümün zemini: görünen alan her yakınlıkta ekran çözünürlüğünde boyanır
 * (uzak haritanın büyütülmüş, bulanık resmi yerine). Kamera, mevsim ya da ayrıntı düzeyi
 * değişince yenilenir. Boyamayı `painter` yapar (ekran kartı).
 */
export class GroundLayer {
  constructor(world, painter, settings) {
    this.world = world;
    this.painter = painter;
    this.settings = settings;
    this.canvas = document.createElement('canvas');
    this.painted = '';
  }

  draw(ctx, camera) {
    const bounds = camera.visibleBounds;
    const pixel = this.painter.sampleSize;
    const width = Math.ceil(camera.width / pixel);
    const height = Math.ceil(camera.height / pixel);
    const north = Calendar.seasonAt(this.world.now, 0);
    const south = Calendar.seasonAt(this.world.now, this.world.height);
    const view = `${camera.x}|${camera.y}|${camera.zoom}|${camera.sceneStretch}|${width}|${height}|${north.name}|${south.name}|${this.settings.lod.id}`;
    if (view !== this.painted) {
      this.painter.paint(fitCanvas(this.canvas, width, height), { bounds, north, south });
      this.painted = view;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  }
}
