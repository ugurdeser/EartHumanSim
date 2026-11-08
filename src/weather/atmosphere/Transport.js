/**
 * Rüzgârın taşıması ve girdapların yayması.
 *
 * Isıda her hücrenin bir "alışveriş sığası" vardır: kara üstündeki havayla tümüyle ısınır, deniz ise
 * kütlesine göre çok az (E = min(hücre sığası, hava sığası)). Toplam ısı ve toplam su korunur:
 * yayılma akı biçimindedir (bir hücreden çıkan komşuya girer); yarı-Lagrange taşınımın küçük
 * sapmaları her adımda geri dağıtılır (iklim modellerindeki koruma düzeltmesi).
 */
export class Transport {
  constructor(grid) {
    this.grid = grid;
    this.scratch = new Float32Array(grid.size);
    this.weight = new Float32Array(grid.size); // hücrenin alanı (enlemle daralır)
    for (let j = 0; j < grid.rows; j++) this.weight.fill(grid.cosLat[j], j * grid.cols, (j + 1) * grid.cols);
  }

  /** Rüzgârın geldiği noktadaki değer: yarı-Lagrange, adım ne kadar büyük olursa olsun kararlı. */
  #advect(field, windEast, windNorth, dt) {
    const { grid, scratch } = this;
    const { cols, rows } = grid;
    for (let j = 0; j < rows; j++) {
      const cellsPerEast = dt / grid.dx[j];
      const cellsPerNorth = dt / grid.dy;
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i;
        // geldiği yer: rüzgârın tersine; kuzey, satır numarasının azaldığı yöndür
        scratch[k] = grid.sampleGrid(field, i - windEast[k] * cellsPerEast, j + windNorth[k] * cellsPerNorth);
      }
    }
  }

  /** Su gibi korunan bir miktarı taşır (toplamı değişmez). */
  advectAmount(field, windEast, windNorth, dt) {
    const before = this.#total(field);
    this.#advect(field, windEast, windNorth, dt);
    field.set(this.scratch);
    this.#rescale(field, before);
  }

  /**
   * Sıcaklığı taşır: hücre değişimin `share` (E/C) payını alır, en çok `limit` kadar
   * (havayla yüzey arasındaki ısı akışının sınırı); toplam ısı korunur.
   */
  advectHeat(theta, windEast, windNorth, dt, capacity, share, limit) {
    const before = this.#heat(theta, capacity);
    this.#advect(theta, windEast, windNorth, dt);
    const { scratch } = this;
    for (let k = 0; k < theta.length; k++) {
      const change = (scratch[k] - theta[k]) * share[k];
      theta[k] += change > limit[k] ? limit[k] : change < -limit[k] ? -limit[k] : change;
    }
    this.#restoreHeat(theta, capacity, share, before);
  }

  /** Isının girdaplarla yayılması (m²/s): komşular arası akı; kararlı kalsın diye gerekirse adım bölünür. */
  diffuseHeat(theta, coefficient, dt, capacity, share) {
    this.#diffuse(theta, coefficient, dt, (k) => capacity[k] * share[k], capacity);
  }

  /** Nemi yayar (toplamı korunur). */
  diffuseAmount(field, coefficient, dt) {
    this.#diffuse(field, coefficient, dt, null, null);
  }

  /** Akı biçiminde yayılma: iki hücre arasındaki iletkenlik, küçük alışveriş sığasınındır. */
  #diffuse(field, coefficient, dt, exchangeOf, capacity) {
    const { grid, scratch, weight } = this;
    const { cols, rows } = grid;
    const ax = 1 / (grid.dxUniform * grid.dxUniform);
    const ay = 1 / (grid.dy * grid.dy);
    const substeps = Math.ceil(dt / (0.45 / (coefficient * (ax + ay))));
    const step = (dt / substeps) * coefficient;
    for (let n = 0; n < substeps; n++) {
      for (let j = 0; j < rows; j++) {
        const north = Math.max(0, j - 1) * cols + 0;
        const south = Math.min(rows - 1, j + 1) * cols;
        for (let i = 0; i < cols; i++) {
          const k = j * cols + i;
          const east = j * cols + (i + 1 === cols ? 0 : i + 1);
          const west = j * cols + (i === 0 ? cols - 1 : i - 1);
          const up = north + i;
          const down = south + i;
          const center = field[k];
          if (!exchangeOf) {
            scratch[k] = center + step * ((field[east] + field[west] - 2 * center) * ax + (field[up] + field[down] - 2 * center) * ay);
            continue;
          }
          // kuzey-güney yüzlerinin boyu iki satırın ortalamasıdır (kutba doğru daralır)
          const toUp = (weight[k] + weight[up]) / (2 * weight[k]);
          const toDown = (weight[k] + weight[down]) / (2 * weight[k]);
          const own = exchangeOf(k);
          const flux =
            (Math.min(own, exchangeOf(east)) * (field[east] - center) + Math.min(own, exchangeOf(west)) * (field[west] - center)) * ax +
            (toUp * Math.min(own, exchangeOf(up)) * (field[up] - center) + toDown * Math.min(own, exchangeOf(down)) * (field[down] - center)) * ay;
          scratch[k] = center + (step * flux) / capacity[k];
        }
      }
      field.set(scratch);
    }
  }

  #total(field) {
    let sum = 0;
    for (let k = 0; k < field.length; k++) sum += field[k] * this.weight[k];
    return sum;
  }

  #rescale(field, before) {
    const after = this.#total(field);
    if (after <= 0) return;
    const scale = before / after;
    for (let k = 0; k < field.length; k++) field[k] *= scale;
  }

  #heat(theta, capacity) {
    let sum = 0;
    for (let k = 0; k < theta.length; k++) sum += theta[k] * capacity[k] * this.weight[k];
    return sum;
  }

  /** Sapan ısıyı hücrelere alışveriş sığaları oranında geri dağıtır. */
  #restoreHeat(theta, capacity, share, before) {
    const missing = before - this.#heat(theta, capacity);
    let exchange = 0;
    for (let k = 0; k < theta.length; k++) exchange += capacity[k] * share[k] * this.weight[k];
    const correction = missing / exchange;
    for (let k = 0; k < theta.length; k++) theta[k] += correction * share[k];
  }
}
