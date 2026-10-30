import { HOUR } from '../../config.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { ActionFactory } from '../ActionFactory.js';
import { MaterialSource } from './MaterialSource.js';
import { MaterialSources } from './MaterialSources.js';

/** Doğadan değil, başka malzemeden yapılan ara ürün (ip, deri, sırım): önce girdiler, sonra iş. */
export class RecipeSource extends MaterialSource {
  constructor(recipe) {
    super(recipe.output);
    this.recipe = recipe;
  }

  canGather(person, world) {
    if (!person.knowledge.knows(this.recipe.technology)) return false;
    return this.recipe.inputs.every(([type, amount]) => person.inventory.count(type) + person.home.storage.count(type) >= amount || MaterialSources.canGather(person, world, type));
  }

  createAction(person, world) {
    const { recipe } = this;
    const missing = recipe.firstMissing(person.inventory);
    if (missing) return ActionFactory.obtainMaterial(person, world, missing.type, person.inventory.count(missing.type) + missing.amount);
    return new PerformAction(`${recipe.output.name} yapıyor`, recipe.time / person.workSpeed('crafting', 'intelligence'), {
      onComplete: (p, w) => {
        if (!recipe.canCraftFrom(p.inventory)) return;
        recipe.consumeFrom(p.inventory);
        p.inventory.add(recipe.output, recipe.yields);
        p.improveSkill('crafting', recipe.time / HOUR, w);
      },
    });
  }
}
