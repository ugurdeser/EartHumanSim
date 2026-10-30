import { Items } from '../../items/Items.js';
import { ALL_RECIPES } from '../../tech/Recipes.js';
import { BranchSource } from './BranchSource.js';
import { HideSource } from './HideSource.js';
import { MineSource } from './MineSource.js';
import { RecipeSource } from './RecipeSource.js';
import { ShearingSource } from './ShearingSource.js';
import { WoodSource } from './WoodSource.js';

/** Malzeme türü → doğadan elde etme stratejisi. */
const SOURCES = new Map([
  [Items.BRANCH, new BranchSource()],
  [Items.WOOD, new WoodSource()],
  [Items.STONE, new MineSource(Items.STONE)],
  [Items.FLINT, new MineSource(Items.FLINT, { yieldScale: 0.6 })],
  [Items.CLAY, new MineSource(Items.CLAY)],
  [Items.WOOL, new ShearingSource()],
  [Items.HIDE, new HideSource()],
  ...ALL_RECIPES.filter((recipe) => !recipe.output.isTool).map((recipe) => [recipe.output, new RecipeSource(recipe)]),
]);

export class MaterialSources {
  static for(type) {
    return SOURCES.get(type) ?? null;
  }

  static canGather(person, world, type) {
    return Boolean(MaterialSources.for(type)?.canGather(person, world));
  }

  static gather(person, world, type) {
    return MaterialSources.for(type)?.createAction(person, world) ?? null;
  }
}
