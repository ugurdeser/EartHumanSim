import { latitudeOf, wrapX } from '../core/Planet.js';

const COUNT = 1600;
const LIFE = [2.5, 5]; // saniye
const PIXELS_PER_METER = 2.4; // ekranda: 1 m/s rüzgâr saniyede bu kadar piksel akar
const TAIL = 0.35; // saniye: kuyruk noktası bu kadar geriden gelir
const DOT_PX = 1.6;

/**
 * Rüzgâr katmanı açıkken havanın akışı: rüzgârla sürüklenen noktalar (ekran saniyesiyle akar,
 * hızları gerçek rüzgârla orantılı). Yalnızca görseldir; simülasyonun rastgele sayılarını kullanmaz.
 */
export class WindLayer {
  constructor(world, maps) {
    this.world = world;
    this.maps = maps;
    this.particles = [];
    this.lastTime = null;
    this.frame = 0;
  }

  get #active() {
    return this.maps.overlay.id === 'wind';
  }

  /** Kare başına bir kez: geçen gerçek süre. */
  #tick() {
    const now = performance.now();
    this.frame = this.lastTime === null ? 0 : Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
  }

  #wind(x, y) {
    const { grid, state } = this.world.weather.atmosphere;
    return { east: grid.sample(state.windEast, x, y), north: grid.sample(state.windNorth, x, y) };
  }

  #spawn(particle, pointAt) {
    const point = pointAt();
    Object.assign(particle, { x: point.x, y: point.y, age: 0, life: LIFE[0] + Math.random() * (LIFE[1] - LIFE[0]) });
  }

  /** Noktaları rüzgârla ilerletir; ömrü dolan ya da görünümden çıkan yeniden doğar. */
  #advance(camera, pointAt, visible) {
    const metersPerPixel = 1 / camera.zoom;
    while (this.particles.length < COUNT) {
      const particle = {};
      this.#spawn(particle, pointAt);
      this.particles.push(particle);
    }
    for (const p of this.particles) {
      p.age += this.frame;
      const { east, north } = this.#wind(p.x, p.y);
      const shrink = Math.max(0.25, Math.cos(latitudeOf(p.y)));
      p.vx = (east * PIXELS_PER_METER * metersPerPixel) / shrink;
      p.vy = -north * PIXELS_PER_METER * metersPerPixel;
      p.x = wrapX(p.x + p.vx * this.frame);
      p.y += p.vy * this.frame;
      if (p.age > p.life || !visible(p)) this.#spawn(p, pointAt);
    }
  }

  /** Düz ve kavisli görünüm: dünya koordinatlarında çizilir. */
  draw(ctx, camera) {
    if (!this.#active) return;
    this.#tick();
    const bounds = camera.visibleBounds;
    const pointAt = () => ({ x: wrapX(bounds.minX + Math.random() * (bounds.maxX - bounds.minX)), y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY) });
    this.#advance(camera, pointAt, (p) => p.y >= bounds.minY && p.y <= bounds.maxY);
    const size = camera.pixels(DOT_PX);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (const p of this.particles) ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (const p of this.particles) ctx.fillRect(p.x - p.vx * TAIL - size / 4, p.y - p.vy * TAIL - size / 4, size / 2, size / 2);
  }

  /** Uzaktan: küreye izdüşürülerek, ekran koordinatlarında. */
  drawGlobe(ctx, camera) {
    if (!this.#active) return;
    this.#tick();
    const pointAt = () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * camera.globeRadius * 0.98;
      return camera.screenToWorld(camera.width / 2 + Math.cos(angle) * r, camera.height / 2 + Math.sin(angle) * r);
    };
    this.#advance(camera, pointAt, (p) => camera.projectToGlobe(p) !== null);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (const p of this.particles) {
      const point = camera.projectToGlobe(p);
      if (point) ctx.fillRect(point.x - DOT_PX / 2, point.y - DOT_PX / 2, DOT_PX, DOT_PX);
    }
  }
}
