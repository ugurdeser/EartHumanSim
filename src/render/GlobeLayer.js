import { DAY } from '../config.js';
import { latitudeOf } from '../core/Planet.js';
import { fitCanvas } from './fitCanvas.js';

const ATMOSPHERE = 1.07;
const SPIN_STEPS = 3000; // ekvator bu kadar adıma bölünür: dönüş bir adım ilerleyince resim yenilenir
const PERSON_PX = 3;

/** Kürenin ışığı ve renkleri: işlemci ve ekran kartı aynı değerlerle boyar. */
export const GLOBE_SHADING = Object.freeze({
  LIMB_SHADE: 0.25, // kenara doğru kararma
  NIGHT_LIGHT: 0.1, // gece yüzünün aydınlığı
  TWILIGHT: 0.07, // atmosferin yaydığı alacakaranlık şeridi
  OVERLAY_LIGHT: 0.6, // hava katmanı gece yüzünde de bu kadar aydınlık görünür
});

/**
 * Uzaktan görünüm: uzak harita resmi küreye sarılır, baktığın boylam ortada durur.
 * Küre yüzeyini `painter` boyar (ekran kartı ya da işlemci).
 */
export class GlobeLayer {
  constructor(world, overview, maps, painter) {
    this.world = world;
    this.overview = overview;
    this.maps = maps;
    this.painter = painter;
    this.canvas = document.createElement('canvas');
    this.painted = '';
  }

  /** Bu karede kürenin nasıl göründüğü: boyayıcının ihtiyacı olan her şey. */
  #frame(camera, pixel) {
    const center = latitudeOf(camera.y);
    return {
      unit: camera.globeRadius / pixel, // yarıçap, resim pikseliyle
      sinC: Math.sin(center),
      cosC: Math.cos(center),
      centerU: camera.x / camera.worldWidth,
      sun: camera.viewDirection(this.world.weather.declination, camera.eastOf(this.world.sunX)), // güneş mevsimle kuzeye-güneye kayar
      days: this.world.now / DAY,
    };
  }

  /** Yalnızca yüzey: kavisli görünümün taban resmi olarak da kullanılır. */
  #drawSurface(ctx, camera) {
    this.overview.refresh();
    this.maps.refresh();
    const pixel = this.painter.sampleSize;
    const width = Math.ceil(camera.width / pixel);
    const height = Math.ceil(camera.height / pixel);
    const view = `${Math.round((camera.x / camera.worldWidth) * SPIN_STEPS)}|${camera.y}|${camera.zoom}|${width}|${height}|${this.overview.version}|${this.maps.version}|${Math.round((this.world.now / DAY) * 200)}`;
    if (view !== this.painted) {
      this.painter.paint(fitCanvas(this.canvas, width, height), this.#frame(camera, pixel));
      this.painted = view;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, 0, 0, camera.width, camera.height);
  }

  drawBase(ctx, camera) {
    this.#drawSurface(ctx, camera);
  }

  draw(ctx, camera) {
    const radius = camera.globeRadius;
    const cx = camera.width / 2;
    const cy = camera.height / 2;
    const glow = ctx.createRadialGradient(cx, cy, radius * 0.96, cx, cy, radius * ATMOSPHERE);
    glow.addColorStop(0, 'rgba(120, 180, 255, 0.55)');
    glow.addColorStop(1, 'rgba(120, 180, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * ATMOSPHERE, 0, Math.PI * 2);
    ctx.fill();
    this.#drawSurface(ctx, camera);

    ctx.fillStyle = '#ffd166';
    for (const person of this.world.people) {
      const point = camera.projectToGlobe(person.position);
      if (point) ctx.fillRect(point.x - PERSON_PX / 2, point.y - PERSON_PX / 2, PERSON_PX, PERSON_PX);
    }
  }
}
