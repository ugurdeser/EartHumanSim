import { PLANTS } from '../../config.js';
import { Random } from '../../core/Random.js';
import { BERRY_BUSHES } from '../../plants/BerryBushes.js';
import { Grass } from '../../plants/Grass.js';
import { Tree } from '../../plants/Tree.js';

const MIXED_BUSH_SHARE = 0.15;

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

    this.#scatter(rng, area * PLANTS.TREE_ATTEMPTS, point, (x, y) => this.biomes.treeChance(x, y), PLANTS.TREE.WATER_MARGIN, (x, y) =>
      chunk.trees.push(Tree.createWild(x, y, rng, { fruitful: rng.chance(PLANTS.FRUIT_TREE_RATIO) })),
    );
    this.#scatter(rng, area * PLANTS.BUSH_ATTEMPTS, point, (x, y) => this.biomes.bushChance(x, y), PLANTS.BUSH.WATER_MARGIN, (x, y) =>
      chunk.bushes.push(this.#bushAt(x, y, rng).createWild(x, y, rng)),
    );
    this.#scatter(rng, area * PLANTS.GRASS_ATTEMPTS, point, (x, y) => this.biomes.grassChance(x, y), PLANTS.GRASS.WATER_MARGIN, (x, y) =>
      chunk.grass.push(Grass.createWild(x, y, rng)),
    );
  }

  /** Çalılar türlerine göre öbekler oluşturur; aralara başka türler de karışır. */
  #bushAt(x, y, rng) {
    if (rng.chance(MIXED_BUSH_SHARE)) return rng.pick(BERRY_BUSHES);
    const variety = this.biomes.bushVariety(x, y);
    return BERRY_BUSHES[Math.min(BERRY_BUSHES.length - 1, Math.floor(variety * BERRY_BUSHES.length))];
  }

  #scatter(rng, attempts, point, chanceAt, waterMargin, create) {
    for (let i = 0; i < attempts; i++) {
      const { x, y } = point();
      if (rng.chance(chanceAt(x, y)) && !this.isWater(x, y, waterMargin)) create(x, y);
    }
  }
}
