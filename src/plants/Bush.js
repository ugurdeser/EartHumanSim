import { Plant } from './Plant.js';
import { plantGenes, speciesProfile } from './PlantGenes.js';

const GENES = plantGenes({ id: 'yield', name: 'Yemiş verimi' });

/** Yemiş çalısı profili: ortak bitki profiline verdiği yemiş bilgilerini ekler. */
export const bushProfile = (config, { name, food, fruitColor, seedSeasons, germination }) =>
  Object.freeze({
    ...speciesProfile(config, { name, layer: 'bushes', genes: GENES, seedSeasons, germination }),
    food,
    fruitColor,
    capacity: config.CAPACITY,
    regrowTime: config.REGROW,
  });

/**
 * Yemiş çalısı (soyut): tohumlarını yemişi yiyen kuşlar taşır.
 * Her çalı türü bu sınıftan türer ve yalnızca kendi SPECIES profilini yazar.
 */
export class Bush extends Plant {
  constructor(x, y, options) {
    const { food, regrowTime } = new.target.SPECIES;
    super(x, y, { ...options, food, regrowTime });
  }

  yieldCapacity() {
    return this.species.capacity * this.genome.scale('yield', 0.6, 1.4);
  }
}
