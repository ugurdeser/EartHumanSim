import { PLANET, WORLD } from '../config.js';
import { lerp } from '../core/MathUtils.js';
import { seamless, wrapX } from '../core/Planet.js';
import { ValueNoise } from '../core/ValueNoise.js';
import { Vector2 } from '../core/Vector2.js';

const CELL = 200; // m: yükselti alanının çözünürlüğü (arası yumuşatılır)
const START_STEP = 2000; // m: başlangıç yeri arama aralığı
const START_RING = 12; // kıyı kontrolünde çevredeki örnek sayısı

export const Surface = Object.freeze({ LAND: 0, SEA: 1, ICE: 2 });

/**
 * Gezegenin yüzeyi: kara, deniz ve kutup buzulları.
 * Yükselti bir kez hesaplanır; her adımda hızlıca sorgulanabilir.
 */
export class Terrain {
  constructor(rng) {
    this.cols = Math.ceil(WORLD.WIDTH / CELL);
    this.rows = Math.ceil(WORLD.HEIGHT / CELL) + 1;
    this.heights = new Float32Array(this.cols * this.rows);
    this.icePhase = [rng.angle(), rng.angle()];
    this.#build(rng);
    this.start = this.#findStart();
  }

  #build(rng) {
    const noise = new ValueNoise(rng);
    const scale = PLANET.CONTINENT_SCALE;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const y = row * CELL;
        this.heights[row * this.cols + col] = seamless(col * CELL, (x) => noise.fractal(x / scale, y / scale, 5));
      }
    }
    this.seaLevel = Float32Array.from(this.heights).sort()[Math.floor(this.heights.length * PLANET.SEA_SHARE)];
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

  #height(x, y) {
    const u = wrapX(x) / CELL;
    const v = Math.min(this.rows - 1.001, Math.max(0, y / CELL));
    const col = Math.floor(u);
    const row = Math.floor(v);
    const next = (col + 1) % this.cols;
    const top = lerp(this.heights[row * this.cols + col], this.heights[row * this.cols + next], u - col);
    const bottom = lerp(this.heights[(row + 1) * this.cols + col], this.heights[(row + 1) * this.cols + next], u - col);
    return lerp(top, bottom, v - row);
  }

  #isIce(x, y) {
    const angle = (x / WORLD.WIDTH) * Math.PI * 2;
    const [a, b] = this.icePhase;
    const wobble = (Math.sin(angle * 3 + a) + Math.sin(angle * 7 + b) * 0.5) * PLANET.ICE_WOBBLE;
    return Math.min(y, WORLD.HEIGHT - y) < PLANET.ICE_MARGIN + wobble;
  }

  surfaceAt(x, y) {
    if (this.#isIce(x, y)) return Surface.ICE;
    return this.#height(x, y) < this.seaLevel ? Surface.SEA : Surface.LAND;
  }

  isLand(x, y) {
    return this.surfaceAt(x, y) === Surface.LAND;
  }
}
