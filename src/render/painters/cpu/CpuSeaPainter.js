import { COLORS } from '../../../config.js';
import { Surface } from '../../../world/Terrain.js';

const PIXEL = 3; // ekran pikseli başına örnek: kıyı yumuşatılarak büyütülür

const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Deniz ve buzulları işlemcide, piksel piksel boyar (WebGL yoksa). */
export class CpuSeaPainter {
  constructor(world, settings) {
    this.world = world;
    this.settings = settings;
    this.colors = { [Surface.SEA]: hexToRgb(COLORS.SEA), [Surface.ICE]: hexToRgb(COLORS.ICE) };
  }

  get sampleSize() {
    return this.settings.sampleSize(PIXEL);
  }

  paint(target, { bounds }) {
    const { width, height } = target;
    const ctx = target.getContext('2d');
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
}
