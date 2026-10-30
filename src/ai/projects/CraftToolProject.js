import { LogType } from '../../core/EventLog.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { MaterialSources } from '../materials/MaterialSources.js';
import { ActionFactory } from '../ActionFactory.js';
import { Project } from './Project.js';

/** Bilinen bir tarifle alet yapmak (taş balta, olta, mızrak ...). */
export class CraftToolProject extends Project {
  constructor(recipe) {
    super(`${recipe.output.name} yapmak`);
    this.recipe = recipe;
  }

  priority(person, world) {
    if (!person.isAdult || !person.knowledge.knows(this.recipe.technology)) return 0;
    if (person.inventory.has(this.recipe.output) || person.home.storage.has(this.recipe.output)) return 0;
    const missing = this.recipe.firstMissing(person.inventory, person.home.storage);
    if (missing && !MaterialSources.canGather(person, world, missing.type)) return 0;
    return 0.9;
  }

  createAction(person, world, onWorkDone) {
    const missing = this.recipe.firstMissing(person.inventory);
    if (missing) {
      const needed = person.inventory.count(missing.type) + missing.amount;
      return ActionFactory.obtainMaterial(person, world, missing.type, needed);
    }
    const output = this.recipe.output;
    return new PerformAction(`${output.name} yapıyor`, this.recipe.time / person.workSpeed('crafting', 'intelligence'), {
      onComplete: (p, w) => {
        if (!this.recipe.canCraftFrom(p.inventory)) return;
        this.recipe.consumeFrom(p.inventory);
        p.inventory.add(output, 1);
        p.improveSkill('crafting', 0.04);
        w.log.personal([p], `🔨 ${output.name} yaptı`, LogType.BUILD);
        onWorkDone();
      },
    });
  }
}
