import { FleeAction } from '../../actions/FleeAction.js';
import { Capability } from '../../items/Items.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const DANGER_RADIUS = 200;

export class FearDrive extends Drive {
  static ID = 'fear';
  static NAME = 'Korku';
  static CATEGORY = DriveCategory.PHYSIOLOGICAL;
  static DESCRIPTION = 'Fiziksel zarar veya kazaları önlemeyi amaçlamak.';
  static WEIGHT_RANGE = [0.85, 1.25];

  constructor(weight) {
    super(weight);
    this.threat = null;
  }

  computeRaw(person, world) {
    const nearest = world.nearestDanger(person.position, DANGER_RADIUS);
    this.threat = nearest?.animal ?? null;
    if (!nearest) return 0;
    const proximity = 1 - nearest.distance / DANGER_RADIUS;
    const vulnerability = person.isChild ? 1.3 : 1 + (1 - person.needs.health) * 0.5;
    const courage = person.inventory.hasCapability(Capability.DEFEND) ? 0.6 : 1; // silahlı olan daha az korkar
    return proximity * 1.8 * vulnerability * courage;
  }

  createAction(person) {
    const threat = this.threat;
    if (!threat) return null;
    return new FleeAction('Yırtıcıdan kaçıyor!', () => (threat.alive && threat.position.distanceTo(person.position) < DANGER_RADIUS ? threat.position : null), 90);
  }
}
