import { ALL_RECIPES } from '../../tech/Recipes.js';
import { PlantingProject } from '../farming/PlantingProject.js';
import { CaptureAnimalProject } from '../husbandry/CaptureAnimalProject.js';
import { PenProject } from '../husbandry/PenProject.js';
import { TendAnimalsProject } from '../husbandry/TendAnimalsProject.js';
import { CraftToolProject } from './CraftToolProject.js';
import { ExperimentProject } from './ExperimentProject.js';
import { HelpBuildProject } from './HelpBuildProject.js';
import { RoadProject } from './RoadProject.js';
import { ShelterProject } from './ShelterProject.js';

/** Yaratmak güdüsü için projeler; yeni proje türü eklemek için listeye eklemek yeterli. */
const PROJECTS = Object.freeze([
  ...ALL_RECIPES.filter((recipe) => recipe.output.isTool).map((recipe) => new CraftToolProject(recipe)),
  new ShelterProject(),
  new HelpBuildProject(),
  new RoadProject(),
  new PenProject(),
  new TendAnimalsProject(),
  new CaptureAnimalProject(),
  new PlantingProject(),
  new ExperimentProject(),
]);

export class ProjectPlanner {
  /** Öncelikleri hafif rastgelelikle tartıp en iyi projeyi seçer. */
  static choose(person, world) {
    let best = null;
    let bestScore = 0;
    for (const project of PROJECTS) {
      const priority = project.priority(person, world);
      if (priority <= 0) continue;
      const score = priority * world.rng.range(0.8, 1.2);
      if (score > bestScore) {
        best = project;
        bestScore = score;
      }
    }
    return best;
  }
}
