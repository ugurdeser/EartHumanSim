import { PLANTS } from '../config.js';
import { Season } from '../core/Season.js';
import { Items } from '../items/Items.js';
import { Plant } from './Plant.js';
import { plantGenes, speciesProfile } from './PlantGenes.js';

/** Ağaç: yavaş yetişir, uzun yaşar; meyveli olanlar meyve verir, baltayla kesilince odun verir. */
export class Tree extends Plant {
  static SPECIES = speciesProfile(PLANTS.TREE, {
    name: 'Ağaç',
    layer: 'trees',
    genes: plantGenes({ id: 'yield', name: 'Meyve verimi' }),
    seed: Items.FRUIT_SEED,
    seedSeasons: [Season.AUTUMN],
    germination: (world, x, y) => world.biomes.treeChance(x, y),
  });

  constructor(x, y, { fruitful = false, ...options }) {
    super(x, y, { ...options, food: Items.FRUIT, regrowTime: PLANTS.TREE_REGROW });
    this.fruitful = fruitful;
  }

  /** Ekilen meyve çekirdeğinden meyveli ağaç çıkar. */
  static sownOptions() {
    return { fruitful: true };
  }

  /** Meyveli ağacın tohumundan meyveli ağaç çıkar. */
  static inheritedFrom(mother) {
    return { fruitful: mother.fruitful };
  }

  get displayName() {
    return this.fruitful ? 'Meyve ağacı' : this.species.name;
  }

  get felled() {
    return this.dead;
  }

  yieldCapacity() {
    return this.fruitful ? PLANTS.TREE_CAPACITY * this.genome.scale('yield', 0.6, 1.4) : 0;
  }

  /** Baltayla kesilir; boyuna göre odun verir ve haritadan kalkar. */
  fell() {
    const wood = Math.max(1, Math.round(PLANTS.WOOD_PER_TREE * this.growth * this.genome.scale('stature', 0.7, 1.3)));
    this.die();
    this.touched = true;
    return wood;
  }
}
