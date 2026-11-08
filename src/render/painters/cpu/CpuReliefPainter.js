import { HILLSHADE } from '../../Hillshade.js';

const PIXEL = 3; // ekran pikseli başına örnek: yumuşatılarak büyütülür

/** Dağ gölgesi ve karı işlemcide, piksel piksel boyar (WebGL yoksa). */
export class CpuReliefPainter {
  constructor(hillshade, settings) {
    this.hillshade = hillshade;
    this.settings = settings;
  }

  get sampleSize() {
    return this.settings.sampleSize(PIXEL);
  }

  paint(target, { bounds }) {
    const { width, height } = target;
    const ctx = target.getContext('2d');
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
        const color = light < 0 ? HILLSHADE.SNOW_BRIGHTNESS * snow * (1 + light) : 255;
        const i = (py * width + px) * 4;
        image.data[i] = color;
        image.data[i + 1] = color;
        image.data[i + 2] = color + (255 - color) * 0.12; // gölgeler hafif mavidir
        image.data[i + 3] = Math.max(snow, Math.abs(light)) * 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }
}
