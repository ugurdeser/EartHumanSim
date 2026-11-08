import { ATMOSPHERE } from '../config.js';
import { clamp01, lerp } from '../core/MathUtils.js';
import { saturation } from '../weather/atmosphere/AtmosphereState.js';
import { ElevationMap, LAND_COLORS } from './ElevationMap.js';

const PROGRESS_STEPS = 12; // iki model adımı arasında bulutlar bu kadar ara kareyle kayar
const CLOUD_WHITE = 248;
const RAIN_GREY = 96; // yağış yoğunlaştıkça bulutun altı koyulaşır
const DARK_RAIN = 5; // mm/saat: en koyu bulut
const SNOW_ALPHA = 0.55;
const OVERLAY_ALPHA = 0.62;

/** Haritanın üstüne açılabilen katmanlar (yükselti hariç hepsi atmosfer modelinden). */
export const Overlay = Object.freeze({
  NONE: Object.freeze({ id: 'none', label: 'Yok' }),
  TEMPERATURE: Object.freeze({ id: 'temperature', label: 'Sıcaklık', unit: '°C', range: [-40, 45] }),
  RAIN: Object.freeze({ id: 'rain', label: 'Yağış', unit: 'mm/sa', range: [0, 8] }),
  WIND: Object.freeze({ id: 'wind', label: 'Rüzgâr', unit: 'm/s', range: [0, 30] }),
  PRESSURE: Object.freeze({ id: 'pressure', label: 'Basınç', unit: 'hPa', range: [975, 1040] }),
  HUMIDITY: Object.freeze({ id: 'humidity', label: 'Bağıl nem', unit: '%', range: [0, 100] }),
  CLOUDS: Object.freeze({ id: 'clouds', label: 'Bulut örtüsü', unit: '%', range: [0, 100] }),
  ELEVATION: Object.freeze({ id: 'elevation', label: 'Yükseklik', unit: 'm', range: null }), // aralık gezegenin en yüksek dağına göre
});

/** [t, r, g, b] durakları arasında renk. */
const ramp = (stops) => (t) => {
  const x = clamp01(t);
  for (let i = 1; i < stops.length; i++) {
    const [t1, ...c1] = stops[i];
    if (x > t1) continue;
    const [t0, ...c0] = stops[i - 1];
    const f = (x - t0) / (t1 - t0 || 1);
    return c0.map((c, n) => c + (c1[n] - c) * f);
  }
  return stops[stops.length - 1].slice(1);
};

const PALETTES = {
  temperature: ramp([[0, 70, 20, 140], [0.25, 40, 90, 220], [0.42, 80, 200, 230], [0.5, 120, 220, 140], [0.62, 240, 230, 90], [0.78, 245, 140, 50], [0.9, 215, 40, 40], [1, 130, 0, 60]]),
  rain: ramp([[0, 120, 170, 230], [0.3, 40, 110, 230], [0.6, 120, 60, 210], [1, 230, 60, 200]]),
  wind: ramp([[0, 90, 160, 200], [0.3, 110, 210, 150], [0.55, 240, 220, 90], [0.8, 240, 120, 50], [1, 200, 40, 120]]),
  pressure: ramp([[0, 60, 40, 170], [0.35, 100, 150, 235], [0.55, 235, 235, 235], [0.75, 240, 170, 90], [1, 200, 50, 40]]),
  humidity: ramp([[0, 170, 120, 60], [0.4, 220, 200, 120], [0.7, 110, 190, 120], [1, 40, 110, 210]]),
  clouds: ramp([[0, 40, 40, 50], [1, 245, 245, 250]]),
  elevation: LAND_COLORS,
};

/**
 * Atmosfer modelinden çizime hazır ızgaralar: bulut eşiği ve rengi, kar örtüsü, açılan hava katmanı.
 * Model saatte bir ilerler; bulutlar iki adım arasında harmanlanarak kayar.
 */
export class WeatherMaps {
  constructor(world, clouds, settings) {
    this.world = world;
    this.clouds = clouds;
    this.settings = settings;
    const { grid } = world.weather;
    this.grid = grid;
    this.cover = new Float32Array(grid.size); // iki adım arası harmanlanmış, komşularla yumuşatılmış örtü
    this.threshold = new Float32Array(grid.size); // bulut deseninin eşiği: örtü arttıkça düşer
    this.shade = new Float32Array(grid.size); // bulutun rengi (0..1)
    this.snow = new Float32Array(grid.size); // karadaki kar örtüsü (0..1)
    this.snowCanvas = WeatherMaps.#canvas(grid);
    this.overlayCanvas = WeatherMaps.#canvas(grid);
    this.overlayPixels = new Uint8ClampedArray(grid.size * 4);
    this.elevation = new ElevationMap(world.terrain);
    this.key = '';
    this.version = 0;
  }

  static #canvas(grid) {
    const canvas = document.createElement('canvas');
    canvas.width = grid.cols;
    canvas.height = grid.rows;
    return canvas;
  }

  get overlay() {
    return Object.values(Overlay).find((o) => o.id === this.settings.overlay) ?? Overlay.NONE;
  }

  /** Katmanın resmi: yükselti arazinin çözünürlüğünde, hava katmanları atmosfer ızgarasında. */
  get overlaySource() {
    if (this.overlay === Overlay.ELEVATION) return this.elevation.ensure();
    return { canvas: this.overlayCanvas, pixels: this.overlayPixels, width: this.grid.cols, height: this.grid.rows };
  }

  #range(overlay) {
    return overlay.range ?? [0, this.world.weather.peakAltitude];
  }

  /** Model ilerlediyse ya da katman değiştiyse ızgaraları yeniler. */
  refresh() {
    const { atmosphere } = this.world.weather;
    const progress = Math.round(atmosphere.progress(this.world.now) * PROGRESS_STEPS) / PROGRESS_STEPS;
    const key = `${atmosphere.version}|${progress}|${this.overlay.id}`;
    if (key === this.key) return;
    this.key = key;
    this.#paintClouds(atmosphere, progress);
    this.#paintSnow(atmosphere);
    this.#paintOverlay(atmosphere);
    this.version++;
  }

  /** Hücre kenarları kare görünmesin diye örtü komşularıyla harmanlanır (1-2-1 süzgeci). */
  #smoothCover(atmosphere, progress) {
    const { state, previousCover } = atmosphere;
    const { cols, rows } = this.grid;
    const raw = this.threshold; // geçici olarak kullanılır, ardından eşikle dolar
    for (let k = 0; k < raw.length; k++) raw[k] = lerp(previousCover[k], state.cover[k], progress);
    for (let j = 0; j < rows; j++) {
      const up = Math.max(0, j - 1) * cols;
      const down = Math.min(rows - 1, j + 1) * cols;
      for (let i = 0; i < cols; i++) {
        const east = i + 1 === cols ? 0 : i + 1;
        const west = i === 0 ? cols - 1 : i - 1;
        const row = j * cols;
        const ring = raw[row + east] + raw[row + west] + raw[up + i] + raw[down + i];
        const corners = raw[up + east] + raw[up + west] + raw[down + east] + raw[down + west];
        this.cover[row + i] = (4 * raw[row + i] + 2 * ring + corners) / 16;
      }
    }
  }

  #paintClouds(atmosphere, progress) {
    const { state } = atmosphere;
    this.#smoothCover(atmosphere, progress);
    for (let k = 0; k < this.grid.size; k++) {
      this.threshold[k] = this.clouds.threshold(Math.min(0.999, Math.max(0.001, this.cover[k])));
      this.shade[k] = lerp(CLOUD_WHITE, RAIN_GREY, clamp01((state.rain[k] + state.snowfall[k]) / DARK_RAIN)) / 255;
    }
  }

  #paintSnow(atmosphere) {
    const { state, surface } = atmosphere;
    const ctx = this.snowCanvas.getContext('2d');
    const image = ctx.createImageData(this.grid.cols, this.grid.rows);
    for (let k = 0; k < this.grid.size; k++) {
      const cover = (1 - Math.exp(-state.snow[k] / ATMOSPHERE.SNOW_DEPTH_SCALE)) * clamp01(surface.land[k] * 2);
      this.snow[k] = cover;
      image.data.set([246, 249, 252, cover * SNOW_ALPHA * 255], k * 4);
    }
    ctx.putImageData(image, 0, 0);
  }

  /** Izgara hücresinin katman değeri ve aralıktaki yeri (0..1). */
  #overlayValue(atmosphere, k) {
    const { state, surface } = atmosphere;
    const overlay = this.overlay;
    const local = state.theta[k] - ATMOSPHERE.LAPSE_RATE * surface.altitude[k];
    const value = {
      temperature: () => local,
      rain: () => state.rain[k] + state.snowfall[k],
      wind: () => Math.hypot(state.windEast[k], state.windNorth[k]),
      pressure: () => state.pressure[k],
      humidity: () => 100 * Math.min(1, state.humidity[k] / saturation(local, surface.altitude[k])),
      clouds: () => 100 * state.cover[k],
    }[overlay.id]();
    const [min, max] = this.#range(overlay);
    return (value - min) / (max - min);
  }

  #paintOverlay(atmosphere) {
    const overlay = this.overlay;
    const pixels = this.overlayPixels;
    pixels.fill(0);
    if (overlay !== Overlay.NONE && overlay !== Overlay.ELEVATION) {
      const palette = PALETTES[overlay.id];
      for (let k = 0; k < this.grid.size; k++) {
        const t = this.#overlayValue(atmosphere, k);
        const [r, g, b] = palette(t);
        // yağış yokken saydam: yalnızca yağan yer boyanır
        const alpha = overlay === Overlay.RAIN ? clamp01(t * 6) : 1;
        pixels.set([r, g, b, alpha * OVERLAY_ALPHA * 255], k * 4);
      }
    }
    this.overlayCanvas.getContext('2d').putImageData(new ImageData(pixels, this.grid.cols, this.grid.rows), 0, 0);
  }

  thresholdAt(x, y) {
    return this.grid.sample(this.threshold, x, y);
  }

  shadeAt(x, y) {
    return this.grid.sample(this.shade, x, y);
  }

  snowAt(x, y) {
    return this.grid.sample(this.snow, x, y);
  }

  /** Göstergenin renkleri: [{ value, color }]. */
  legend(count = 6) {
    const overlay = this.overlay;
    if (overlay === Overlay.NONE) return [];
    const [min, max] = this.#range(overlay);
    return Array.from({ length: count }, (_, i) => {
      const t = i / (count - 1);
      const [r, g, b] = PALETTES[overlay.id](t);
      return { value: Math.round(min + (max - min) * t), color: `rgb(${r | 0}, ${g | 0}, ${b | 0})` };
    });
  }
}
