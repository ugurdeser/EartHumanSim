import { clamp } from '../core/MathUtils.js';

const POINTS = 24; // sınır bu kadar yönde ölçülür
const MIN_SHARE = 0.55; // yarıçapın en az ve en çok bu katı
const MAX_SHARE = 1.45;
const WATER_SEARCH = 3; // su, yarıçapın bu katı ötedeki araziye göre yayılır
const WATER_RISE = 0.02; // bu kadar yükselen (ya da alçalan) yöne tam tepki verir
const WATER_SPREAD = 0.45;

/** Arazinin belirlediği düzensiz sınır: merkezden her yöne farklı uzaklık. */
export class Outline {
  constructor(radii) {
    this.radii = Outline.#smooth(radii);
    this.inner = Math.min(...this.radii);
  }

  static #smooth(radii) {
    return radii.map((r, i) => (radii[(i + POINTS - 1) % POINTS] + r * 2 + radii[(i + 1) % POINTS]) / 4);
  }

  /** Doğal düzensizlik: birbirine binen iki dalga. */
  static #wobble(rng) {
    const [a, b] = [rng.angle(), rng.angle()];
    const [low, high] = [rng.range(0.1, 0.2), rng.range(0.05, 0.12)];
    return (angle) => 1 + Math.sin(angle * 2 + a) * low + Math.sin(angle * 5 + b) * high;
  }

  static #around(radius, rng, shape) {
    const wobble = Outline.#wobble(rng);
    return new Outline(Array.from({ length: POINTS }, (_, i) => {
      const angle = (i / POINTS) * Math.PI * 2;
      return radius * clamp(shape(angle) * wobble(angle), MIN_SHARE, MAX_SHARE);
    }));
  }

  /** Su alçak yöne yayılır, yükselen yönde kısa kesilir. */
  static ofWater(terrain, x, y, radius, rng) {
    const level = terrain.elevationAt(x, y);
    const reach = radius * WATER_SEARCH;
    return Outline.#around(radius, rng, (angle) => {
      const rise = terrain.elevationAt(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach) - level;
      return 1 - clamp(rise / WATER_RISE, -1, 1) * WATER_SPREAD;
    });
  }

  /** Verilen yöndeki sınır uzaklığı. */
  radiusToward(angle) {
    const turn = (((angle / (Math.PI * 2)) % 1) + 1) % 1;
    const at = turn * POINTS;
    const index = Math.floor(at) % POINTS;
    const next = (index + 1) % POINTS;
    return this.radii[index] + (this.radii[next] - this.radii[index]) * (at - Math.floor(at));
  }

  /** Sınırı kapalı, yumuşak bir yol olarak çizer. */
  trace(ctx, x, y, scale = 1) {
    const point = (i) => {
      const angle = (i / POINTS) * Math.PI * 2;
      return [x + Math.cos(angle) * this.radii[i % POINTS] * scale, y + Math.sin(angle) * this.radii[i % POINTS] * scale];
    };
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    ctx.moveTo(...mid(point(0), point(1)));
    for (let i = 1; i <= POINTS; i++) ctx.quadraticCurveTo(...point(i), ...mid(point(i), point(i + 1)));
    ctx.closePath();
  }
}
