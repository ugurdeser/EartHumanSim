import { MINUTE } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { Capability, Items } from '../../items/Items.js';
import { AnimalHandling } from '../husbandry/AnimalHandling.js';
import { MaterialSource } from './MaterialSource.js';

const SEARCH_RADIUS = 1500;
const MIN_WOOL = 2; // yapağı biraz uzamadan kırkmaya değmez
const WORK_TIME = 40 * MINUTE;

/** Bıçakla yün kırkmak: hayvan yaşar, yapağısı yeniden uzar (ama bir süre üşür). */
export class ShearingSource extends MaterialSource {
  constructor() {
    super(Items.WOOL);
  }

  canGather(person, world) {
    return person.inventory.hasCapability(Capability.CUT) && Boolean(AnimalHandling.findReady(person, world, Items.WOOL, SEARCH_RADIUS, MIN_WOOL));
  }

  createAction(person, world) {
    if (!person.inventory.hasCapability(Capability.CUT)) return null;
    const found = AnimalHandling.findReady(person, world, Items.WOOL, SEARCH_RADIUS, MIN_WOOL);
    if (!found) return null;
    return AnimalHandling.harvestAction(person, found.animal, Items.WOOL, {
      label: `${found.animal.displayName} kırkıyor`,
      duration: WORK_TIME,
      onHarvest: (p, w, amount) => {
        const broken = p.inventory.wearTool(Capability.CUT);
        if (broken) w.log.personal([p], `💥 ${broken.name} kırıldı`, LogType.INFO);
        w.log.personal([p], `🧶 ${amount} yün kırktı`, LogType.BUILD);
      },
    });
  }
}
