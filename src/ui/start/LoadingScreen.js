import { overallProgress } from '../../core/LoadStage.js';
import { el } from '../dom.js';
import { Starfield } from './Starfield.js';

const GLOBE_SIZE = 280; // px
const TURN_SECONDS = 24; // bir tam dönüş
const LIGHT = { x: -0.55, y: 0.35, z: 0.76 }; // sol üstten gelen ışık

/**
 * Gezegen kurulurken: dönen gezegen (önizlemenin yükselti haritasından), ilerleme çubuğu ve
 * o anki aşamanın adı. Kurulum aralarda ekrana nefes aldırdıkça gezegen döner.
 */
export class LoadingScreen {
  /** `elevation`: başlangıç ekranının yükselti haritası (yoksa gezegen çizilmez). */
  constructor(container, elevation = null) {
    this.elevation = elevation;
    this.globe = el('canvas', { class: 'loading-globe' });
    Object.assign(this.globe, { width: GLOBE_SIZE, height: GLOBE_SIZE });
    this.bar = el('div', { class: 'loading-fill' });
    this.stage = el('div', { class: 'loading-stage', text: 'Hazırlanıyor…' });
    this.percent = el('div', { class: 'loading-percent', text: '%0' });
    this.root = el(
      'div',
      { class: 'loading-screen' },
      new Starfield().canvas,
      el(
        'div',
        { class: 'loading-box' },
        elevation ? this.globe : null,
        el('h2', { text: 'Gezegen oluşturuluyor' }),
        el('div', { class: 'loading-bar' }, this.bar),
        el('div', { class: 'loading-row' }, this.stage, this.percent),
      ),
    );
    container.append(this.root);
    this.started = performance.now();
    this.frame = requestAnimationFrame(() => this.#spin());
  }

  update(stage, progress) {
    const overall = overallProgress(stage, progress);
    this.bar.style.width = `${(overall * 100).toFixed(1)}%`;
    this.stage.textContent = stage.label;
    this.percent.textContent = `%${Math.floor(overall * 100)}`;
  }

  /** Kurulum başarısız olursa nedenini gösterir. */
  fail(error) {
    this.stage.textContent = `Gezegen oluşturulamadı: ${error.message}`;
    this.root.classList.add('failed');
    cancelAnimationFrame(this.frame);
  }

  close() {
    cancelAnimationFrame(this.frame);
    this.root.classList.add('closing');
    setTimeout(() => this.root.remove(), 400);
  }

  /** Yükselti haritasını küreye sarıp döndürür (dik izdüşüm, basit ışık). */
  #spin() {
    this.frame = requestAnimationFrame(() => this.#spin());
    if (!this.elevation) return;
    const { pixels, width, height } = this.elevation;
    const ctx = this.globe.getContext('2d');
    const image = ctx.createImageData(GLOBE_SIZE, GLOBE_SIZE);
    const turn = ((performance.now() - this.started) / 1000 / TURN_SECONDS) % 1;
    const radius = GLOBE_SIZE / 2 - 2;
    for (let py = 0; py < GLOBE_SIZE; py++) {
      const ny = (GLOBE_SIZE / 2 - py - 0.5) / radius;
      for (let px = 0; px < GLOBE_SIZE; px++) {
        const nx = (px + 0.5 - GLOBE_SIZE / 2) / radius;
        const rest = 1 - nx * nx - ny * ny;
        if (rest <= 0) continue;
        const nz = Math.sqrt(rest);
        const u = (((Math.atan2(nx, nz) / (Math.PI * 2) + turn) % 1) + 1) % 1;
        const v = 0.5 - Math.asin(ny) / Math.PI;
        const from = (Math.min(height - 1, Math.floor(v * height)) * width + Math.floor(u * width)) * 4;
        const light = 0.25 + 0.85 * Math.max(0, nx * LIGHT.x + ny * LIGHT.y + nz * LIGHT.z);
        const to = (py * GLOBE_SIZE + px) * 4;
        image.data[to] = pixels[from] * light;
        image.data[to + 1] = pixels[from + 1] * light;
        image.data[to + 2] = pixels[from + 2] * light;
        image.data[to + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }
}
