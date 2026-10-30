import { HOUR } from '../config.js';
import { Items } from '../items/Items.js';
import { Recipe } from './Recipe.js';
import { Technologies } from './Technologies.js';

const { SPINNING, HIDE_WORKING, STITCHING } = Technologies;

/** Giysinin tarifi: aynı adlı buluşla açılır. */
const garment = (key, inputs, time) => new Recipe({ technology: Technologies[key], output: Items[key], inputs, time });

/** İşlenmiş deriyi sırımla dikmek. */
const stitched = (key, leather, thong, time) =>
  garment(
    key,
    [
      [Items.LEATHER, leather],
      [Items.THONG, thong],
    ],
    time,
  );

/** Alet ve giysi tarifleri: ilk insanlar gibi taş, dal, çakmaktaşı, post ve yünden. */
export const Recipes = Object.freeze({
  STONE_AXE: new Recipe({
    technology: Technologies.STONE_AXE,
    output: Items.STONE_AXE,
    inputs: [
      [Items.STONE, 1],
      [Items.BRANCH, 2],
    ],
    time: 1 * HOUR,
  }),
  FISHING_ROD: new Recipe({
    technology: Technologies.FISHING_ROD,
    output: Items.FISHING_ROD,
    inputs: [
      [Items.BRANCH, 2],
      [Items.FLINT, 1],
    ],
    time: 1 * HOUR,
  }),
  SPEAR: new Recipe({
    technology: Technologies.SPEAR,
    output: Items.SPEAR,
    inputs: [
      [Items.BRANCH, 2],
      [Items.FLINT, 2],
    ],
    time: 1.5 * HOUR,
  }),
  FLINT_KNIFE: new Recipe({
    technology: Technologies.FLINT_KNIFE,
    output: Items.FLINT_KNIFE,
    inputs: [
      [Items.FLINT, 1],
      [Items.BRANCH, 1],
    ],
    time: 0.5 * HOUR,
  }),
  HIDE_CLOAK: new Recipe({
    technology: Technologies.HIDE_CLOAK,
    output: Items.HIDE_CLOAK,
    inputs: [[Items.HIDE, 2]],
    time: 2 * HOUR,
  }),
  WATER_JAR: new Recipe({
    technology: Technologies.POTTERY,
    output: Items.WATER_JAR,
    inputs: [[Items.CLAY, 3]],
    time: 3 * HOUR,
    needsFire: true,
  }),

  // Ara ürünler: ip, deri, sırım
  THIN_YARN: new Recipe({ technology: SPINNING, output: Items.THIN_YARN, inputs: [[Items.WOOL, 1]], time: 1 * HOUR, yields: 2 }),
  THICK_YARN: new Recipe({ technology: SPINNING, output: Items.THICK_YARN, inputs: [[Items.WOOL, 1]], time: 0.5 * HOUR }),
  LEATHER: new Recipe({ technology: HIDE_WORKING, output: Items.LEATHER, inputs: [[Items.HIDE, 1]], time: 3 * HOUR }),
  THONG: new Recipe({ technology: STITCHING, output: Items.THONG, inputs: [[Items.LEATHER, 1]], time: 0.5 * HOUR, yields: 4 }),

  // Yün giysiler
  WOOL_SOCKS: garment('WOOL_SOCKS', [[Items.THICK_YARN, 2]], 2 * HOUR),
  WOOL_HAT: garment('WOOL_HAT', [[Items.THICK_YARN, 2]], 2 * HOUR),
  WOOL_GLOVES: garment('WOOL_GLOVES', [[Items.THICK_YARN, 2]], 2 * HOUR),
  WOOL_TSHIRT: garment('WOOL_TSHIRT', [[Items.THIN_YARN, 3]], 3 * HOUR),
  WOOL_SHIRT: garment('WOOL_SHIRT', [[Items.THIN_YARN, 4]], 4 * HOUR),
  WOOL_SWEATER: garment('WOOL_SWEATER', [[Items.THICK_YARN, 6]], 6 * HOUR),
  WOOL_PANTS: garment('WOOL_PANTS', [[Items.THIN_YARN, 5]], 5 * HOUR),
  WOOL_BAG: garment('WOOL_BAG', [[Items.THICK_YARN, 4]], 3 * HOUR),

  // Deri giysiler
  LEATHER_BOOTS: stitched('LEATHER_BOOTS', 1, 1, 2 * HOUR),
  LEATHER_HAT: stitched('LEATHER_HAT', 1, 1, 2 * HOUR),
  LEATHER_GLOVES: stitched('LEATHER_GLOVES', 1, 1, 2 * HOUR),
  LEATHER_VEST: stitched('LEATHER_VEST', 2, 1, 3 * HOUR),
  LEATHER_SHIRT: stitched('LEATHER_SHIRT', 2, 2, 4 * HOUR),
  LEATHER_JACKET: stitched('LEATHER_JACKET', 3, 2, 6 * HOUR),
  LEATHER_PANTS: stitched('LEATHER_PANTS', 3, 2, 5 * HOUR),
  LEATHER_BAG: stitched('LEATHER_BAG', 2, 2, 3 * HOUR),
});

export const ALL_RECIPES = Object.freeze(Object.values(Recipes));
