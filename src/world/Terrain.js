import { PLANET, WORLD } from '../config.js';
import { clamp01, lerp, smoothstep } from '../core/MathUtils.js';
import { seamless, wrapDelta, wrapX } from '../core/Planet.js';
import { ValueNoise } from '../core/ValueNoise.js';
import { Vector2 } from '../core/Vector2.js';
import { PlanetSettings } from './PlanetSettings.js';

const CELL = 200; // m: yükselti alanının çözünürlüğü (arası yumuşatılır; önizleme daha kabasını kullanır)
const START_STEP = 2000; // m: başlangıç yeri arama aralığı
const START_RING = 12; // kıyı kontrolünde çevredeki örnek sayısı
const LAND_RISE = 0.2; // kıyıdan bu kadar yükselince tam iç kesim sayılır
const BELT_SCALE = 30000; // m: dağ kuşaklarının genişliği
const RIDGE_SCALE = 6000; // m: sırtlar arası uzaklık
const HILL_SCALE = 2500; // m: tepeler arası uzaklık
const HILL_SHARE = 0.14; // tepelerin en yüksek dağa oranı
const SLOPE_SPREAD = 320; // m: eğim bu kadar ötedeki yüksekliklerden ölçülür

export const Surface = Object.freeze({ LAND: 0, SEA: 1, ICE: 2 });

/**
 * Gezegenin yüzeyi: kara, deniz ve kutup buzulları; gezegen ayarlarına göre (deniz oranı, kıtaların
 * boyu, dağlık, buzullar). Yükselti bir kez hesaplanır; her adımda hızlıca sorgulanabilir.
 * Başlangıç yeri ayarlarda seçilmişse (ve karaysa) orasıdır, değilse ılıman kuşakta bulunur.
 */
export class Terrain {
  /** `cell`: ızgara aralığı (m); başlangıç ekranının önizlemesi kabasıyla hızlı üretir. */
  constructor(rng, planet = new PlanetSettings({ seed: rng.seed }), { cell = CELL } = {}) {
    this.planet = planet;
    this.cell = cell;
    this.cols = Math.ceil(WORLD.WIDTH / cell);
    this.rows = Math.ceil(WORLD.HEIGHT / cell) + 1;
    this.heights = new Float32Array(this.cols * this.rows);
    this.elevations = new Float32Array(this.cols * this.rows);
    this.icePhase = [rng.angle(), rng.angle()];
    this.#build(rng);
    this.start = this.#chosenStart() ?? this.#findStart();
    this.#raiseMountains(rng);
  }

  /** Ayarlarda seçilen yer, karaysa. */
  #chosenStart() {
    const start = this.planet.start;
    if (!start || this.surfaceAt(start.x, start.y) !== Surface.LAND) return null;
    return new Vector2(start.x, start.y);
  }

  /** Kutup buzulunun genişliği (m). */
  get iceMargin() {
    return this.planet.iceMargin;
  }

  #build(rng) {
    const noise = new ValueNoise(rng);
    const scale = this.planet.continentScale;
    const { cell } = this;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const y = row * cell;
        this.heights[row * this.cols + col] = seamless(col * cell, (x) => noise.fractal(x / scale, y / scale, 5));
      }
    }
    this.seaLevel = Float32Array.from(this.heights).sort()[Math.floor(this.heights.length * this.planet.seaShare)];
  }

  /** Karanın kabartması: geniş kuşaklar boyunca sırtlar, her yerde alçak tepeler. Deniz ve buzul düzdür. */
  #raiseMountains(rng) {
    const noise = new ValueNoise(rng);
    const [beltFrom, beltTo] = this.planet.mountainBelt;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const i = row * this.cols + col;
        const x = col * this.cell;
        const y = row * this.cell;
        const inland = clamp01((this.heights[i] - this.seaLevel) / LAND_RISE);
        if (inland <= 0 || this.#isIce(x, y)) continue;
        const fromStart = Math.hypot(wrapDelta(x - this.start.x), y - this.start.y);
        const open = smoothstep(PLANET.START_LAND * 0.6, PLANET.START_LAND * 1.2, fromStart); // ilk insanlar dağda başlamaz
        const belt = open * smoothstep(beltFrom, beltTo, seamless(x, (at) => noise.fractal(at / BELT_SCALE, y / BELT_SCALE, 2)));
        const ridge = 1 - Math.abs(2 * seamless(x, (at) => noise.fractal(at / RIDGE_SCALE, y / RIDGE_SCALE, 4)) - 1);
        const hills = seamless(x, (at) => noise.fractal(at / HILL_SCALE, y / HILL_SCALE, 3));
        this.elevations[i] = smoothstep(0, 0.5, inland) * (belt * ridge * ridge + hills * HILL_SHARE);
      }
    }
  }

  /** Ilıman enlemde, çevresi en geniş karayla çevrili kıta içi nokta. */
  #findStart() {
    const y = (0.5 - PLANET.START_LATITUDE / 180) * WORLD.HEIGHT;
    let best = 0;
    let bestScore = -Infinity;
    for (let x = 0; x < WORLD.WIDTH; x += START_STEP) {
      const score = this.#lowestAround(x, y);
      if (score > bestScore) {
        best = x;
        bestScore = score;
      }
    }
    return new Vector2(best, y);
  }

  #lowestAround(x, y) {
    let lowest = this.#height(x, y);
    for (let radius = PLANET.START_LAND / 2; radius <= PLANET.START_LAND; radius += PLANET.START_LAND / 2) {
      for (let i = 0; i < START_RING; i++) {
        const angle = (i / START_RING) * Math.PI * 2;
        lowest = Math.min(lowest, this.#height(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
      }
    }
    return lowest;
  }

  /** Yükselti ızgarasının hücre kenarı (m). */
  get cellSize() {
    return this.cell;
  }

  /** Eğimin ölçüldüğü uzaklık (m). */
  get slopeSpread() {
    return SLOPE_SPREAD;
  }

  #height(x, y) {
    return this.#sample(this.heights, x, y);
  }

  /** Karanın yüksekliği (0: kıyı, 1: en yüksek sırt). */
  elevationAt(x, y) {
    return this.#sample(this.elevations, x, y);
  }

  /** Yükselmenin doğuya ve güneye doğru hızı (yükselti/m). */
  gradientAt(x, y) {
    return {
      east: (this.elevationAt(x + SLOPE_SPREAD, y) - this.elevationAt(x - SLOPE_SPREAD, y)) / (SLOPE_SPREAD * 2),
      south: (this.elevationAt(x, y + SLOPE_SPREAD) - this.elevationAt(x, y - SLOPE_SPREAD)) / (SLOPE_SPREAD * 2),
    };
  }

  #sample(field, x, y) {
    const u = wrapX(x) / this.cell;
    const v = Math.min(this.rows - 1.001, Math.max(0, y / this.cell));
    const col = Math.floor(u);
    const row = Math.floor(v);
    const next = (col + 1) % this.cols;
    const top = lerp(field[row * this.cols + col], field[row * this.cols + next], u - col);
    const bottom = lerp(field[(row + 1) * this.cols + col], field[(row + 1) * this.cols + next], u - col);
    return lerp(top, bottom, v - row);
  }

  #isIce(x, y) {
    const angle = (x / WORLD.WIDTH) * Math.PI * 2;
    const [a, b] = this.icePhase;
    const wobble = (Math.sin(angle * 3 + a) + Math.sin(angle * 7 + b) * 0.5) * PLANET.ICE_WOBBLE;
    return Math.min(y, WORLD.HEIGHT - y) < this.iceMargin + wobble;
  }

  surfaceAt(x, y) {
    if (this.#isIce(x, y)) return Surface.ICE;
    return this.#height(x, y) < this.seaLevel ? Surface.SEA : Surface.LAND;
  }

  isLand(x, y) {
    return this.surfaceAt(x, y) === Surface.LAND;
  }
}
