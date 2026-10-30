import { MoveToAction } from '../../actions/MoveToAction.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const SENSE_DISTANCE = 40;
const SAFE_MARGIN = 80;

export class DisgustDrive extends Drive {
  static ID = 'disgust';
  static NAME = 'Tiksinme';
  static CATEGORY = DriveCategory.PHYSIOLOGICAL;
  static DESCRIPTION = 'Kirletici maddelere veya patojenlere maruz kalmaktan kaçınmayı amaçlamak.';

  constructor(weight) {
    super(weight);
    this.zone = null;
  }

  /** Tiksinme duyarlılığı yüksek kişiler kirli suyu içmez. */
  get avoidsDirtyWater() {
    return this.weight >= 0.7;
  }

  computeRaw(person, world) {
    const { zone, distance } = world.nearestContamination(person.position);
    this.zone = zone;
    if (!zone || distance > SENSE_DISTANCE) return 0;
    return (1 - distance / SENSE_DISTANCE) * 1.2;
  }

  createAction(person, world) {
    const zone = this.zone;
    if (!zone) return null;
    const away = person.position.clone().sub(zone.position).normalize();
    if (away.x === 0 && away.y === 0) away.set(1, 0);
    const target = away.scale(zone.radius + SAFE_MARGIN).add(zone.position);
    world.clampPosition(target);
    return new MoveToAction('Leşten uzaklaşıyor', target, { arriveDistance: 3 });
  }
}
