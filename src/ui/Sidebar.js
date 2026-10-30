import { EventLogView } from './EventLogView.js';
import { FamilyPanel } from './FamilyPanel.js';
import { PopulationList } from './PopulationList.js';
import { TimeControls } from './TimeControls.js';

/** Sağ panel: yalnızca genel bilgiler (zaman, nüfus, aileler, genel olaylar). */
export class Sidebar {
  constructor(container, game) {
    this.timeControls = new TimeControls(game);
    this.population = new PopulationList(game.world, game.selection);
    this.families = new FamilyPanel(game.world, game.selection);
    this.eventLog = new EventLogView(game.log);
    container.append(this.timeControls.root, this.population.root, this.families.root, this.eventLog.root);
  }

  update() {
    this.timeControls.update();
    this.population.update();
    this.families.update();
  }
}
