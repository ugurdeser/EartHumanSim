import { ATMOSPHERE } from '../../config.js';
import { latitudeOf } from '../../core/Planet.js';

const MIN_COS = 0.25; // kutuplarda boylam aralığı daralır; sayısal kararlılık için bundan küçülmez

/**
 * Atmosferin ızgarası: hücre merkezleri, enlemleri ve Dünya ölçeğindeki aralıkları.
 * Doğu-batı sarar, kuzey-güney kutuplarda biter. Satır 0 kuzey kutbudur (harita y'si güneye artar).
 */
export class AtmosphereGrid {
  constructor(width, height, cols = ATMOSPHERE.COLS, rows = ATMOSPHERE.ROWS) {
    Object.assign(this, { width, height, cols, rows, size: cols * rows });
    this.cellWidth = width / cols;
    this.cellHeight = height / rows;
    this.scale = ATMOSPHERE.EARTH_CIRCUMFERENCE / width; // Dünya metresi / harita metresi
    this.dy = this.cellHeight * this.scale; // m (Dünya ölçeği)
    this.dxUniform = this.cellWidth * this.scale; // enlemden bağımsız aralık (yayılma için)
    this.latitude = new Float32Array(rows);
    this.sinLat = new Float32Array(rows);
    this.cosLat = new Float32Array(rows);
    this.dx = new Float32Array(rows); // m: o enlemde bir hücrenin doğu-batı genişliği
    for (let j = 0; j < rows; j++) {
      const latitude = latitudeOf(this.yOf(j));
      this.latitude[j] = latitude;
      this.sinLat[j] = Math.sin(latitude);
      this.cosLat[j] = Math.cos(latitude);
      this.dx[j] = this.dxUniform * Math.max(MIN_COS, this.cosLat[j]);
    }
  }

  xOf(i) {
    return (i + 0.5) * this.cellWidth;
  }

  yOf(j) {
    return (j + 0.5) * this.cellHeight;
  }

  /** Harita noktasının ızgara koordinatı (hücre merkezleri tam sayıda). */
  gridX(x) {
    const u = x / this.cellWidth - 0.5;
    return u - Math.floor(u / this.cols) * this.cols;
  }

  gridY(y) {
    return Math.min(this.rows - 1, Math.max(0, y / this.cellHeight - 0.5));
  }

  /** Noktanın düştüğü hücre. */
  cellAt(x, y) {
    const i = Math.floor((x - Math.floor(x / this.width) * this.width) / this.cellWidth) % this.cols;
    const j = Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellHeight)));
    return j * this.cols + i;
  }

  /** Izgara koordinatında komşu dört hücrenin harmanı. */
  sampleGrid(field, gx, gy) {
    const { cols, rows } = this;
    const left = Math.floor(gx);
    const fx = gx - left;
    const i0 = ((left % cols) + cols) % cols;
    const i1 = i0 + 1 === cols ? 0 : i0 + 1;
    const top = Math.min(rows - 1, Math.max(0, Math.floor(gy)));
    const j1 = Math.min(rows - 1, top + 1);
    const fy = Math.min(1, Math.max(0, gy - top));
    const a = field[top * cols + i0];
    const b = field[top * cols + i1];
    const c = field[j1 * cols + i0];
    const d = field[j1 * cols + i1];
    return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
  }

  /** Harita noktasındaki değer (komşu hücreler harmanlanır). */
  sample(field, x, y) {
    return this.sampleGrid(field, this.gridX(x), this.gridY(y));
  }

  /** Haritada doğu-batı mesafe (m) → Dünya metresi, o satırın enleminde. */
  eastMeters(dxMap, j) {
    return dxMap * this.scale * Math.max(MIN_COS, this.cosLat[j]);
  }
}
