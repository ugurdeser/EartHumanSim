import { PLANTS } from '../../config.js';
import { Random } from '../../core/Random.js';
import { Bush } from '../Bush.js';
import { Grass } from '../Grass.js';
import { Tree } from '../Tree.js';

/**
 * Bir parçanın bitkilerini biyom haritasına göre üretir.
 * Parça anahtarından türetilen tohum sayesinde aynı parça her seferinde aynı çıkar.
 */
export class ChunkGenerator {
  constructor({ seed, biomes, isWater }) {
    this.seed = seed;
    this.biomes = biomes;
    this.isWater = isWater;
  }

  populate(chunk) {
    const rng = Random.derive(this.seed, chunk.key);
    const area = (chunk.maxX - chunk.minX) * (chunk.maxY - chunk.minY);
    const point = () => ({ x: rng.range(chunk.minX, chunk.maxX), y: rng.range(chunk.minY, chunk.maxY) });

    this.#scatter(rng, area * PLANTS.TREE_ATTEMPTS, point, (x, y) => this.biomes.treeChance(x, y), 3, (x, y) =>
      chunk.trees.push(new Tree(x, y, { radius: rng.range(2.5, 4.5), fruitful: rng.chance(PLANTS.FRUIT_TREE_RATIO) })),
    );
    this.#scatter(rng, area * PLANTS.BUSH_ATTEMPTS, point, (x, y) => this.biomes.bushChance(x, y), 2, (x, y) =>
      chunk.bushes.push(new Bush(x, y, { radius: rng.range(1.2, 2.2) })),
    );
    this.#scatter(rng, area * PLANTS.GRASS_ATTEMPTS, point, (x, y) => this.biomes.grassChance(x, y), 1, (x, y) =>
      chunk.grass.push(new Grass(x, y, { radius: rng.range(0.8, 1.5) })),
    );
  }

  #scatter(rng, attempts, point, chanceAt, waterMargin, create) {
    for (let i = 0; i < attempts; i++) {
      const { x, y } = point();
      if (rng.chance(chanceAt(x, y)) && !this.isWater(x, y, waterMargin)) create(x, y);
    }
  }
}
