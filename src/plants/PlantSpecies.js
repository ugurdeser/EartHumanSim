import { BERRY_BUSHES } from './BerryBushes.js';
import { Grass } from './Grass.js';
import { Tree } from './Tree.js';

/** Haritadaki bitki türleri. Yeni tür: Plant'tan türet, SPECIES profili yaz, buraya ekle. */
export const PLANT_SPECIES = Object.freeze([Tree, ...BERRY_BUSHES, Grass]);

/** Parçadaki bitki listeleri: aynı listede birden çok tür yaşayabilir. */
export const PLANT_LAYERS = Object.freeze([...new Set(PLANT_SPECIES.map((Species) => Species.SPECIES.layer))]);
