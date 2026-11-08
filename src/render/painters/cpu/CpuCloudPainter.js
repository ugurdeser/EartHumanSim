import { clamp } from '../../../core/MathUtils.js';
import { wrapX } from '../../../core/Planet.js';

const PIXEL = 3; // ekran pikseli başına örnek: kenarlar yumuşatılarak büyütülür

/** Bulutları ve yere düşen gölgelerini işlemcide, piksel piksel boyar (WebGL yoksa). */
export class CpuCloudPainter {
  constructor(world, clouds, maps, settings) {
    this.world = world;
    this.clouds = clouds;
    this.maps = maps;
    this.settings = settings;
  }

  get sampleSize() {
    return this.settings.sampleSize(PIXEL);
  }

  paint(targets, { bounds, days, offset }) {
    const { maps } = this;
    maps.refresh();
    const { width, height } = targets.cloud;
    const cloudCtx = targets.cloud.getContext('2d');
    const shadowCtx = targets.shadow.getContext('2d');
    const cloud = cloudCtx.createImageData(width, height);
    const shadow = shadowCtx.createImageData(width, height);
    const { world } = this;
    const stepX = (bounds.maxX - bounds.minX) / width;
    const stepY = (bounds.maxY - bounds.minY) / height;
    for (let py = 0; py < height; py++) {
      const y = bounds.minY + (py + 0.5) * stepY;
      const v = clamp(y / world.height, 0, 1);
      const shadowV = clamp((y - offset.y) / world.height, 0, 1);
      for (let px = 0; px < width; px++) {
        const x = bounds.minX + (px + 0.5) * stepX;
        const i = (py * width + px) * 4;
        // gölge, güneşin ters yönünde kaymış buluttur: görünen alanın her pikseli için ayrı okunur
        const shadowX = wrapX(x - offset.x);
        shadow.data[i + 3] = this.clouds.opacity(shadowX / world.width, shadowV, days, maps.thresholdAt(shadowX, y - offset.y)) * 255;
        const opacity = this.clouds.opacity(wrapX(x) / world.width, v, days, maps.thresholdAt(x, y));
        if (opacity <= 0) continue;
        const brightness = maps.shadeAt(x, y) * 255;
        cloud.data[i] = brightness;
        cloud.data[i + 1] = brightness;
        cloud.data[i + 2] = brightness + 4;
        cloud.data[i + 3] = opacity * 255;
      }
    }
    cloudCtx.putImageData(cloud, 0, 0);
    shadowCtx.putImageData(shadow, 0, 0);
  }
}
