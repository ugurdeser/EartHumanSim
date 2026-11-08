import { DAY, HOUR } from './time.js';

const BUSH_DEFAULTS = Object.freeze({
  RADIUS: [1.2, 2.2],
  MATURITY: 2,
  LIFESPAN: [15, 40],
  SEEDS_PER_YEAR: 2,
  SEED_RADIUS: 15, // kuşlar yemişi taşır
  POLLEN_RADIUS: 40,
  SPACING: 2,
  WATER_MARGIN: 2,
  MORTALITY: { SEEDLING: 0.3, ADULT: 0.03, OLD: 0.5 },
  CAPACITY: 3,
  REGROW: 10 * HOUR,
});

export const PLANTS = Object.freeze({
  // m² başına deneme sayısı; kabul olasılığı biyom gürültüsünden gelir
  TREE_ATTEMPTS: 2.8e-3,
  BUSH_ATTEMPTS: 1.9e-3,
  GRASS_ATTEMPTS: 2.5e-3,
  TREE_CAPACITY: 5,
  TREE_REGROW: 20 * HOUR,
  FRUIT_TREE_RATIO: 0.3,
  WOOD_PER_TREE: 4,
  TICK: 30 * DAY, // her etkin parçanın bitkileri ayda bir topluca hesaplanır
  MAX_CATCH_UP: 1, // yıl: uzun süre etkin olmayan parçada en fazla bu kadarlık çoğalma
  CAPACITY_HEADROOM: 1.25, // parça, ilk bitki sayısının bu katına kadar dolabilir
  MIN_CAPACITY: 2,
  // Türler: yetişme süresi ve ömür yıl cinsinden; tohum/yıl tutma şansı ayrıca biyoma bağlı
  TREE: {
    RADIUS: [2.5, 4.5],
    MATURITY: 12,
    LIFESPAN: [60, 200],
    SEEDS_PER_YEAR: 3,
    SEED_RADIUS: 25,
    POLLEN_RADIUS: 80,
    SPACING: 3,
    WATER_MARGIN: 3,
    MORTALITY: { SEEDLING: 0.3, ADULT: 0.01, OLD: 0.5 }, // yıllık ölüm olasılığı
  },
  BUSH: BUSH_DEFAULTS,
  BUSHES: {
    BLUEBERRY: { ...BUSH_DEFAULTS, RADIUS: [1, 1.6], MATURITY: 3, LIFESPAN: [25, 50], CAPACITY: 3 },
    STRAWBERRY: {
      ...BUSH_DEFAULTS,
      RADIUS: [0.6, 1],
      MATURITY: 1,
      LIFESPAN: [4, 8],
      SEEDS_PER_YEAR: 4,
      SEED_RADIUS: 8, // sürgünleriyle yakına yayılır
      SPACING: 1,
      MORTALITY: { SEEDLING: 0.3, ADULT: 0.08, OLD: 0.5 },
      CAPACITY: 2,
      REGROW: 8 * HOUR,
    },
    BLACKBERRY: { ...BUSH_DEFAULTS, RADIUS: [1.6, 2.4], MATURITY: 2, LIFESPAN: [10, 25], SEEDS_PER_YEAR: 3, CAPACITY: 4 },
    RASPBERRY: { ...BUSH_DEFAULTS, RADIUS: [1.2, 1.8], MATURITY: 2, LIFESPAN: [8, 15], CAPACITY: 3, REGROW: 8 * HOUR },
  },
  GRASS: {
    RADIUS: [0.8, 1.5],
    MATURITY: 0.1,
    LIFESPAN: [3, 8],
    SEEDS_PER_YEAR: 4,
    SEED_RADIUS: 10,
    POLLEN_RADIUS: 30,
    SPACING: 1,
    WATER_MARGIN: 1,
    MORTALITY: { SEEDLING: 0.4, ADULT: 0.05, OLD: 0.6 },
    GRAZE_PER_FOOD: 1, // hayvanın 1 birim tokluğu kaç öbek-büyüklüğü ot yer
    GRAZE_REACH: 8, // m: hayvanın yediği öbekler
    MIN_GROWTH: 0.05, // yenen ot kökünden yeniden büyür
  },
});

export const FEATURES = Object.freeze({
  // km² başına adet
  POND_DENSITY: 0.4,
  STONE_MINE_DENSITY: 0.25,
  FLINT_MINE_DENSITY: 0.1,
  CLAY_MINE_DENSITY: 0.2,
});
