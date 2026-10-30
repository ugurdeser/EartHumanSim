/** Haritanın kare bir parçası ve içindeki bitkiler. */
export class Chunk {
  constructor(cx, cy, size, key) {
    this.cx = cx;
    this.cy = cy;
    this.key = key;
    this.minX = cx * size;
    this.minY = cy * size;
    this.maxX = this.minX + size;
    this.maxY = this.minY + size;
    this.trees = [];
    this.bushes = [];
    this.grass = [];
    this.ecology = null; // bitkiler büyümeye başlayınca (PlantEcology)
    this.version = 0; // görünüm değiştikçe artar (önbellek geçersizleşir)
    this.cache = null;
    this.lastUsed = 0;
  }

  get centerX() {
    return (this.minX + this.maxX) / 2;
  }

  get centerY() {
    return (this.minY + this.maxY) / 2;
  }

  #lists() {
    if (!this.cache) {
      const standing = this.trees.filter((t) => t.alive);
      this.cache = {
        standing,
        mature: standing.filter((t) => t.isMature),
        food: [...this.bushes.filter((b) => b.alive), ...standing.filter((t) => t.fruitful)],
      };
    }
    return this.cache;
  }

  get standingTrees() {
    return this.#lists().standing;
  }

  /** Kesilebilecek / gölgesinde dinlenilebilecek yetişkin ağaçlar. */
  get matureTrees() {
    return this.#lists().mature;
  }

  get foodSources() {
    return this.#lists().food;
  }

  /** İçindeki bir şey değiştiyse ya da bitkileri yaşıyorsa bellekten atılmamalı. */
  get isModified() {
    return this.ecology !== null || this.bushes.some((b) => b.touched) || this.trees.some((t) => t.touched);
  }

  markChanged() {
    this.version++;
    this.cache = null;
  }

  distanceTo(position) {
    const dx = Math.max(this.minX - position.x, 0, position.x - this.maxX);
    const dy = Math.max(this.minY - position.y, 0, position.y - this.maxY);
    return Math.hypot(dx, dy);
  }
}
