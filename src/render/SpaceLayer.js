import { STAR } from '../config.js';
import { Random } from '../core/Random.js';

const STAR_COUNT = 6000;
const STAR_SEED = 0x57a2;
const STAR_TINTS = ['#ffffff', '#ffffff', '#cfe0ff', '#ffe9c9', '#ffd6b0'];
const FOCAL = 0.6; // ekran yüksekliğinin katı: gökyüzünün görüş açısı
const SUN_ANGLE = Math.atan(STAR.DIAMETER / 2 / STAR.DISTANCE); // gökyüzündeki yarıçapı: ~0,27°
const GLARE = 45; // ışıltının güneş boyuna oranı

/**
 * Uzay: yıldız sisteminin gerçek geometrisi. Güneş ışığı gezegene paralel gelir ve gökyüzünde
 * ancak bakış yönündeyse görünür; boyu uzaklığından çıkar, yakınlaştırmayla değişmez.
 */
export class SpaceLayer {
  constructor(world) {
    this.world = world;
    const rng = new Random(STAR_SEED);
    this.stars = Array.from({ length: STAR_COUNT }, () => ({
      east: rng.angle(),
      latitude: Math.asin(rng.range(-1, 1)),
      size: rng.next() ** 4 * 1.6 + 0.6,
      alpha: rng.range(0.25, 1),
      color: rng.pick(STAR_TINTS),
    }));
  }

  /** Gökyüzündeki yönün ekran konumu; bakışın arkasındaysa null. */
  #skyPoint(camera, view) {
    if (view.z >= 0) return null;
    const focal = camera.height * FOCAL;
    return { x: camera.width / 2 - (view.x / view.z) * focal, y: camera.height / 2 + (view.y / view.z) * focal };
  }

  #drawStars(ctx, camera, sunEast) {
    for (const star of this.stars) {
      const point = this.#skyPoint(camera, camera.viewDirection(star.latitude, sunEast + star.east));
      if (!point) continue;
      ctx.globalAlpha = star.alpha;
      ctx.fillStyle = star.color;
      ctx.fillRect(point.x, point.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  /** Güneş ekranda nerede ve gezegenin arkasına düşmüyorsa boyuyla birlikte. */
  #sun(camera) {
    const point = this.#skyPoint(camera, camera.viewDirection(this.world.weather.declination, camera.eastOf(this.world.sunX)));
    if (!point) return null;
    if (Math.hypot(point.x - camera.width / 2, point.y - camera.height / 2) < camera.globeRadius) return null;
    return { ...point, radius: Math.max(1, Math.tan(SUN_ANGLE) * camera.height * FOCAL) };
  }

  /** Gezegenden önce: yıldızlar ve güneş diski. */
  draw(ctx, camera) {
    this.#drawStars(ctx, camera, camera.eastOf(this.world.sunX));
    const sun = this.#sun(camera);
    if (!sun) return;
    ctx.fillStyle = '#fffdf2';
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, sun.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Gezegenden sonra: göz kamaştıran ışıltı kenardan gezegenin üstüne de taşar. */
  drawGlare(ctx, camera) {
    const sun = this.#sun(camera);
    if (!sun) return;
    const reach = sun.radius * GLARE;
    const glow = ctx.createRadialGradient(sun.x, sun.y, sun.radius, sun.x, sun.y, reach);
    glow.addColorStop(0, 'rgba(255, 244, 214, 0.95)');
    glow.addColorStop(0.12, 'rgba(255, 226, 170, 0.28)');
    glow.addColorStop(1, 'rgba(255, 200, 130, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, reach, 0, Math.PI * 2);
    ctx.fill();
  }
}
