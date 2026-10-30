import { PLANTS } from '../config.js';
import { Season } from '../core/Season.js';
import { Plant } from './Plant.js';
import { plantGenes, speciesProfile } from './PlantGenes.js';

/** Ot öbeği: çabuk büyür, kısa yaşar; otlayan hayvanların besinidir. */
export class Grass extends Plant {
  static SPECIES = speciesProfile(PLANTS.GRASS, {
    name: 'Ot',
    layer: 'grass',
    genes: plantGenes({ id: 'nutrition', name: 'Besin değeri' }),
    seedSeasons: [Season.SPRING, Season.SUMMER],
    germination: (world, x, y) => world.biomes.grassChance(x, y),
  });

  /** Otlayan hayvan için değeri: öbeğin büyüklüğü × besin değeri. */
  get forage() {
    return this.growth * this.genome.scale('nutrition', 0.6, 1.4);
  }
}
