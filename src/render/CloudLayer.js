import { CLOUDS, CLOUD_ALTITUDE, DAY } from '../config.js';
import { clamp, lerp, smoothstep } from '../core/MathUtils.js';
import { latitudeOf, wrapX } from '../core/Planet.js';

const PIXEL = 3; // ekran pikseli başına örnek: kenarlar yumuşatılarak büyütülür
const MAX_SLOPE = 3; // alçak güneşte gölge yüksekliğin en çok bu katı
const TIME_STEPS = 2000; // gün bu kadar adıma bölünür: rüzgâr ilerledikçe resim yenilenir
const WHITE = 248;
const RAIN_GREY = 96; // sağanakta bulutun altı bu kadar koyulaşır

/** Yukarıdan bakınca görünen bulutlar: küredekiyle aynı desenin, baktığın yerdeki parçası. */
export class CloudLayer {
  constructor(world, clouds) {
    this.world = world;
    this.clouds = clouds;
    this.canvas = document.createElement('canvas');
    this.shadow = document.createElement('canvas');
    this.painted = '';
  }

  /** Yukarıdan bakınca 1, yere yaklaştıkça 0. */
  #altitudeAlpha(camera) {
    const [high, low] = CLOUDS.FADE_ZOOM;
    return 1 - smoothstep(Math.log(high), Math.log(low), Math.log(camera.zoom));
  }

  /** Gölgenin yüksekliğe oranı: güneş alçaldıkça uzar, sabah batıya, akşam doğuya düşer. */
  #shadowOffset() {
    const height = (CLOUD_ALTITUDE[0] + CLOUD_ALTITUDE[1]) / 2;
    const hourAngle = ((this.world.now % DAY) / DAY - 0.5) * Math.PI * 2;
    const day = Math.abs(hourAngle) < Math.PI / 2;
    return { x: day ? height * clamp(Math.tan(hourAngle), -MAX_SLOPE, MAX_SLOPE) : 0, y: -height * Math.tan(Math.abs(latitudeOf(this.world.start.y))) };
  }

  #resize(canvas, width, height) {
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
  }

  #paint(bounds, width, height, threshold, days) {
    this.#resize(this.canvas, width, height);
    this.#resize(this.shadow, width, height);
    const cloudCtx = this.canvas.getContext('2d');
    const shadowCtx = this.shadow.getContext('2d');
    const cloud = cloudCtx.createImageData(width, height);
    const shadow = shadowCtx.createImageData(width, height);
    const { world } = this;
    const offset = this.#shadowOffset();
    const brightness = lerp(WHITE, RAIN_GREY, world.weather.precipitation);
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
        shadow.data[i + 3] = this.clouds.opacity(wrapX(x - offset.x) / world.width, shadowV, days, threshold) * 255;
        const opacity = this.clouds.opacity(wrapX(x) / world.width, v, days, threshold);
        if (opacity <= 0) continue;
        cloud.data[i] = brightness;
        cloud.data[i + 1] = brightness;
        cloud.data[i + 2] = brightness + 4;
        cloud.data[i + 3] = opacity * 255;
      }
    }
    cloudCtx.putImageData(cloud, 0, 0);
    shadowCtx.putImageData(shadow, 0, 0);
  }

  draw(ctx, camera) {
    const altitude = this.#altitudeAlpha(camera);
    if (altitude <= 0.01) return;
    const bounds = camera.visibleBounds;
    const width = Math.ceil(camera.width / PIXEL);
    const height = Math.ceil(camera.height / PIXEL);
    const { weather } = this.world;
    const threshold = this.clouds.threshold(this.clouds.coverage(weather));
    const step = Math.round((this.world.now / DAY) * TIME_STEPS);
    const view = `${camera.x}|${camera.y}|${camera.zoom}|${width}|${height}|${threshold}|${step}|${Math.round(weather.precipitation * 20)}`;
    if (view !== this.painted) {
      this.#paint(bounds, width, height, threshold, step / TIME_STEPS);
      this.painted = view;
    }
    const spanX = bounds.maxX - bounds.minX;
    const spanY = bounds.maxY - bounds.minY;
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = CLOUDS.SHADOW_ALPHA * altitude;
    ctx.drawImage(this.shadow, bounds.minX, bounds.minY, spanX, spanY);
    ctx.globalAlpha = altitude;
    ctx.drawImage(this.canvas, bounds.minX, bounds.minY, spanX, spanY);
    ctx.globalAlpha = 1;
  }
}
