import { HOUR } from '../config.js';
import { Items } from '../items/Items.js';
import { Recipe } from './Recipe.js';
import { Technologies } from './Technologies.js';

/** Alet tarifleri: ilk insanlar gibi taş, dal ve çakmaktaşından. */
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
});

export const ALL_RECIPES = Object.freeze(Object.values(Recipes));
