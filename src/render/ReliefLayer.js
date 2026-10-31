import { DAY } from '../config.js';

const PIXEL = 3; // ekran pikseli başına örnek: yumuşatılarak büyütülür
const SUN_STEPS = 720; // gün bu kadar adıma bölünür: güneş ilerledikçe gölgeler yenilenir
const SNOW = 244;

/** Dağların gölgesi ve karı: görünen alan için boyanır, bitkiler üstünde kalır. */
export class ReliefLayer {
  constructor(world, hillshade) {
    this.world = world;
    this.hillshade = hillshade;
    this.canvas = document.createElement('canvas');
    this.painted = '';
  }

  #paint(bounds, width, height) {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const ctx = this.canvas.getContext('2d');
    const image = ctx.createImageData(width, height);
    const { hillshade } = this;
    const stepX = (bounds.maxX - bounds.minX) / width;
    const stepY = (bounds.maxY - bounds.minY) / height;
    for (let py = 0; py < height; py++) {
      const y = bounds.minY + (py + 0.5) * stepY;
      for (let px = 0; px < width; px++) {
        const x = bounds.minX + (px + 0.5) * stepX;
        const light = hillshade.lightAt(x, y);
        const snow = hillshade.snowAt(x, y);
        const color = light < 0 ? SNOW * snow * (1 + light) : 255;
        const i = (py * width + px) * 4;
        image.data[i] = color;
        image.data[i + 1] = color;
        image.data[i + 2] = color + (255 - color) * 0.12; // gölgeler hafif mavidir
        image.data[i + 3] = Math.max(snow, Math.abs(light)) * 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  draw(ctx, camera) {
    const bounds = camera.visibleBounds;
    const width = Math.ceil(camera.width / PIXEL);
    const height = Math.ceil(camera.height / PIXEL);
    const step = Math.round((this.world.now / DAY) * SUN_STEPS);
    const view = `${camera.x}|${camera.y}|${camera.zoom}|${width}|${height}|${step}`;
    if (view !== this.painted) {
      this.#paint(bounds, width, height);
      this.painted = view;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
  }
}
