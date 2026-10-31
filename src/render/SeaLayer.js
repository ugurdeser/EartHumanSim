import { COLORS } from '../config.js';
import { Surface } from '../world/Terrain.js';

const PIXEL = 3; // ekran pikseli başına örnek: kıyı yumuşatılarak büyütülür

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Deniz ve buzullar: görünen alan için bir kez boyanır, kamera oynayınca yenilenir. */
export class SeaLayer {
  constructor(world) {
    this.world = world;
    this.canvas = document.createElement('canvas');
    this.colors = { [Surface.SEA]: hexToRgb(COLORS.SEA), [Surface.ICE]: hexToRgb(COLORS.ICE) };
    this.painted = '';
  }

  #paint(camera, bounds, width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const ctx = this.canvas.getContext('2d');
    const image = ctx.createImageData(width, height);
    const { terrain } = this.world;
    const stepX = (bounds.maxX - bounds.minX) / width;
    const stepY = (bounds.maxY - bounds.minY) / height;
    for (let py = 0; py < height; py++) {
      const y = bounds.minY + (py + 0.5) * stepY;
      for (let px = 0; px < width; px++) {
        const surface = terrain.surfaceAt(bounds.minX + (px + 0.5) * stepX, y);
        if (surface === Surface.LAND) continue;
        const color = this.colors[surface];
        const i = (py * width + px) * 4;
        image.data[i] = color[0];
        image.data[i + 1] = color[1];
        image.data[i + 2] = color[2];
        image.data[i + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  draw(ctx, camera) {
    const bounds = camera.visibleBounds;
    const width = Math.ceil(camera.width / PIXEL);
    const height = Math.ceil(camera.height / PIXEL);
    const view = `${camera.x}|${camera.y}|${camera.zoom}|${width}|${height}`;
    if (view !== this.painted) {
      this.#paint(camera, bounds, width, height);
      this.painted = view;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  }
}
