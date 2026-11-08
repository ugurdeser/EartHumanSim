import { CLOUDS, DAY } from '../config.js';
import { clamp, smoothstep } from '../core/MathUtils.js';
import { latitudeOf, Planet } from '../core/Planet.js';
import { fitCanvas } from './fitCanvas.js';

const MAX_SLOPE = 3; // alçak güneşte gölge yüksekliğin en çok bu katı
const TIME_STEPS = 2000; // gün bu kadar adıma bölünür: rüzgâr ilerledikçe resim yenilenir

/**
 * Yukarıdan bakınca görünen bulutlar: atmosfer modelinin bulutları, küredekiyle aynı desenle.
 * Bulutu ve yere düşen gölgesini `painter` boyar (ekran kartı ya da işlemci).
 */
export class CloudLayer {
  constructor(world, maps, painter) {
    this.world = world;
    this.maps = maps;
    this.painter = painter;
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
    const [low, high] = Planet.cloudAltitude;
    const height = (low + high) / 2;
    const hourAngle = ((this.world.now % DAY) / DAY - 0.5) * Math.PI * 2;
    const day = Math.abs(hourAngle) < Math.PI / 2;
    return { x: day ? height * clamp(Math.tan(hourAngle), -MAX_SLOPE, MAX_SLOPE) : 0, y: -height * Math.tan(Math.abs(latitudeOf(this.world.start.y))) };
  }

  draw(ctx, camera) {
    const altitude = this.#altitudeAlpha(camera);
    if (altitude <= 0.01) return;
    const bounds = camera.visibleBounds;
    const pixel = this.painter.sampleSize;
    const width = Math.ceil(camera.width / pixel);
    const height = Math.ceil(camera.height / pixel);
    this.maps.refresh();
    const step = Math.round((this.world.now / DAY) * TIME_STEPS);
    const view = `${camera.x}|${camera.y}|${camera.zoom}|${width}|${height}|${this.maps.version}|${step}`;
    if (view !== this.painted) {
      this.painter.paint(
        { cloud: fitCanvas(this.canvas, width, height), shadow: fitCanvas(this.shadow, width, height) },
        { bounds, days: step / TIME_STEPS, offset: this.#shadowOffset() },
      );
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
