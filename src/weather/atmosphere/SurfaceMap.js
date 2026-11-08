import { Surface } from '../../world/Terrain.js';

const SAMPLES = 4; // hücre başına 4×4 örnek

/**
 * Her hücrenin değişmeyen yüzeyi: kara payı, kalıcı buzul payı, ortalama yükselti ve eğimi.
 * Arazi bir kez okunur; model her adımda buradan bakar.
 */
export class SurfaceMap {
  /** `peakAltitude`: arazinin 0..1 yükseltisinin karşılığı olan en yüksek doruk (m). */
  constructor(grid, terrain, peakAltitude) {
    const { size, cols, rows, cellWidth, cellHeight } = grid;
    this.land = new Float32Array(size);
    this.ice = new Float32Array(size);
    this.altitude = new Float32Array(size); // m (Dünya ölçeği)
    this.slopeEast = new Float32Array(size); // m/m
    this.slopeNorth = new Float32Array(size);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        let land = 0;
        let ice = 0;
        let elevation = 0;
        for (let sy = 0; sy < SAMPLES; sy++) {
          for (let sx = 0; sx < SAMPLES; sx++) {
            const x = (i + (sx + 0.5) / SAMPLES) * cellWidth;
            const y = (j + (sy + 0.5) / SAMPLES) * cellHeight;
            const surface = terrain.surfaceAt(x, y);
            if (surface === Surface.ICE) ice++;
            else if (surface === Surface.LAND) {
              land++;
              elevation += terrain.elevationAt(x, y);
            }
          }
        }
        const k = j * cols + i;
        const count = SAMPLES * SAMPLES;
        this.land[k] = land / count;
        this.ice[k] = ice / count;
        this.altitude[k] = (elevation / count) * peakAltitude;
      }
    }
    this.#slopes(grid);
  }

  #slopes(grid) {
    const { cols, rows } = grid;
    for (let j = 0; j < rows; j++) {
      const north = Math.max(0, j - 1);
      const south = Math.min(rows - 1, j + 1);
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        const east = j * cols + ((i + 1) % cols);
        const west = j * cols + ((i - 1 + cols) % cols);
        this.slopeEast[k] = (this.altitude[east] - this.altitude[west]) / (2 * grid.dx[j]);
        this.slopeNorth[k] = (this.altitude[north * cols + i] - this.altitude[south * cols + i]) / ((south - north) * grid.dy);
      }
    }
  }
}
