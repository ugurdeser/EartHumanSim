import { ALL_RECIPES } from '../../tech/Recipes.js';
import { CraftToolProject } from './CraftToolProject.js';
import { ExperimentProject } from './ExperimentProject.js';
import { RoadProject } from './RoadProject.js';
import { ShelterProject } from './ShelterProject.js';

/** Yaratmak güdüsü için projeler; yeni proje türü eklemek için listeye eklemek yeterli. */
const PROJECTS = Object.freeze([
  ...ALL_RECIPES.map((recipe) => new CraftToolProject(recipe)),
  new ShelterProject(),
  new RoadProject(),
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
