import { wrapX } from '../../../core/Planet.js';
import { GLOBE_SHADING } from '../../GlobeLayer.js';
import { HILLSHADE } from '../../Hillshade.js';
import { OverviewLayer } from '../../OverviewLayer.js';

const PIXEL = 2; // ekran pikseli başına örnek
const { LIMB_SHADE, NIGHT_LIGHT, TWILIGHT } = GLOBE_SHADING;

/** Küre yüzeyini işlemcide, piksel piksel boyar (WebGL yoksa; hava katmanı bu yolda çizilmez). */
export class CpuGlobePainter {
  constructor(world, overview, clouds, hillshade, maps, settings) {
    this.world = world;
    this.maps = maps;
    this.overview = overview;
    this.clouds = clouds;
    this.hillshade = hillshade;
    this.settings = settings;
  }

  get sampleSize() {
    return this.settings.sampleSize(PIXEL);
  }

  paint(target, { unit, sinC, cosC, centerU, sun, days }) {
    const { maps } = this;
    maps.refresh();
    const { width, height } = target;
    const ctx = target.getContext('2d');
    const image = ctx.createImageData(width, height);
    const source = this.overview.pixels;
    const { width: texWidth, height: texHeight } = OverviewLayer;
    const worldWidth = this.world.width;
    for (let py = 0; py < height; py++) {
      const ny = (height / 2 - py - 0.5) / unit;
      for (let px = 0; px < width; px++) {
        const nx = (px + 0.5 - width / 2) / unit;
        const rest = 1 - nx * nx - ny * ny;
        if (rest <= 0) continue;
        const nz = Math.sqrt(rest);
        const up = ny * cosC + nz * sinC;
        const forward = nz * cosC - ny * sinC;
        const u = wrapX((centerU + Math.atan2(nx, forward) / (Math.PI * 2)) * worldWidth) / worldWidth;
        const v = 0.5 - Math.asin(up) / Math.PI;
        // komşu dört doku pikseli harmanlanır: kıyılar ve kenarlar dişli görünmez
        const tx = u * texWidth - 0.5;
        const ty = Math.max(0, Math.min(texHeight - 1.001, v * texHeight - 0.5));
        const x0 = (Math.floor(tx) + texWidth) % texWidth;
        const x1 = (x0 + 1) % texWidth;
        const y0 = Math.floor(ty);
        const fx = tx - Math.floor(tx);
        const fy = ty - y0;
        const a = (y0 * texWidth + x0) * 4;
        const b = (y0 * texWidth + x1) * 4;
        const c = a + texWidth * 4;
        const d = b + texWidth * 4;
        const wa = (1 - fx) * (1 - fy);
        const wb = fx * (1 - fy);
        const wc = (1 - fx) * fy;
        const wd = fx * fy;
        const facing = nx * sun.x + ny * sun.y + nz * sun.z;
        const daylight = Math.min(1, Math.max(0, (facing + TWILIGHT) / (TWILIGHT * 2)));
        const light = (NIGHT_LIGHT + (1 - NIGHT_LIGHT) * daylight) * (1 - LIMB_SHADE * (1 - nz));
        const to = (py * width + px) * 4;
        const worldX = u * worldWidth;
        const worldY = v * this.world.height;
        const cloud = this.clouds.opacity(u, v, days, maps.thresholdAt(worldX, worldY));
        const cloudColor = maps.shadeAt(worldX, worldY) * 255;
        const snow = Math.max(this.hillshade.snowAt(worldX, worldY), maps.snowAt(worldX, worldY));
        const relief = 1 + this.hillshade.lightAt(worldX, worldY);
        for (let channel = 0; channel < 3; channel++) {
          const texel = source[a + channel] * wa + source[b + channel] * wb + source[c + channel] * wc + source[d + channel] * wd;
          const ground = (texel + (HILLSHADE.SNOW_BRIGHTNESS - texel) * snow) * relief;
          image.data[to + channel] = (ground * (1 - cloud) + cloudColor * cloud) * light;
        }
        image.data[to + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }
}
