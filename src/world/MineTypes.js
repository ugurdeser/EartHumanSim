import { COLORS, FEATURES } from '../config.js';
import { Items } from '../items/Items.js';

/** Maden türleri. İleride obsidyen vb. eklemek için buraya bir kayıt yeterli. */
export const MineTypes = Object.freeze({
  STONE: Object.freeze({ resource: Items.STONE, name: 'Taş ocağı', color: COLORS.STONE_MINE, density: FEATURES.STONE_MINE_DENSITY }),
  FLINT: Object.freeze({ resource: Items.FLINT, name: 'Çakmaktaşı yatağı', color: COLORS.FLINT_MINE, density: FEATURES.FLINT_MINE_DENSITY }),
  CLAY: Object.freeze({ resource: Items.CLAY, name: 'Kil yatağı', color: COLORS.CLAY_MINE, density: FEATURES.CLAY_MINE_DENSITY }),
});

export const ALL_MINE_TYPES = Object.freeze(Object.values(MineTypes));
