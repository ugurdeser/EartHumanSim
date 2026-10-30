import { HOUR, MINUTE, ROAD } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Items } from '../../items/Items.js';
import { Technologies } from '../../tech/Technologies.js';
import { MaterialSources } from '../materials/MaterialSources.js';
import { ActionFactory } from '../ActionFactory.js';
import { Project } from './Project.js';

const TIME_PER_TILE = 30 * MINUTE;

/** Yuvadan sık gidilen bir yere (komşu yuva, su, taş ocağı) taş yol döşemek. */
export class RoadProject extends Project {
  constructor() {
    super('Taş yol döşemek');
  }

  /** Yolun gideceği yer: en yakın komşu yuva, yoksa su ya da taş ocağı. */
  #destination(person, world) {
    const from = person.home.position;
    const neighbor = world.homeGrid.findNearest(from, ROAD.MAX_LENGTH, (h) => h !== person.home);
    if (neighbor) return neighbor.position;
    const pond = world.findNearestPond(from, { maxRadius: ROAD.MAX_LENGTH });
    if (pond) return pond.shorePointFrom(from);
    return world.findNearestMine(from, Items.STONE, ROAD.MAX_LENGTH)?.position ?? null;
  }

  #missingTiles(person, world) {
    const to = this.#destination(person, world);
    return to ? world.roads.missingTilesBetween(person.home.position, to) : [];
  }

  priority(person, world) {
    if (!person.isAdult || !person.knowledge.knows(Technologies.STONE_ROAD)) return 0;
    if (this.#missingTiles(person, world).length === 0) return 0;
    if (!person.inventory.has(Items.STONE) && !person.home.storage.has(Items.STONE) && !MaterialSources.canGather(person, world, Items.STONE)) return 0;
    return 0.4;
  }

  createAction(person, world, onWorkDone) {
    const tiles = this.#missingTiles(person, world).slice(0, ROAD.TILES_PER_SESSION);
    if (tiles.length === 0) return null;
    if (person.inventory.count(Items.STONE) < tiles.length) {
      return ActionFactory.obtainMaterial(person, world, Items.STONE, tiles.length);
    }
    return new SequenceAction('Taş yol döşemeye gidiyor', [
      new MoveToAction('Yolun ucuna gidiyor', tiles[0], { arriveDistance: 3 }),
      new PerformAction('Taş yol döşüyor', (TIME_PER_TILE * tiles.length) / person.workSpeed('building'), {
        onComplete: (p, w) => {
          const firstRoad = w.roads.size === 0;
          for (const tile of tiles) {
            if (!p.inventory.has(Items.STONE)) break;
            if (w.roads.add(tile)) p.inventory.remove(Items.STONE, 1);
          }
          p.improveSkill('building', (TIME_PER_TILE * tiles.length) / HOUR, w);
          onWorkDone();
          if (firstRoad) w.log.add(`🛤 ${p.name} ilk taş yolu döşedi`, LogType.BUILD, [p]);
        },
      }),
    ]);
  }
}
