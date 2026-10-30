import { ActionFactory } from '../../ai/ActionFactory.js';
import { ProjectPlanner } from '../../ai/projects/ProjectPlanner.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const MIN_FREE_WEIGHT = 4;

/** Alet yapmak, barınak geliştirmek, yol döşemek, yeni şeyler denemek. */
export class CreatingDrive extends Drive {
  static ID = 'creating';
  static NAME = 'Yaratmak';
  static CATEGORY = DriveCategory.ENVIRONMENTAL;
  static DESCRIPTION = 'Kişinin fiziksel çevresini geliştirmek için çabalaması.';

  isApplicable(person) {
    return person.isAdult;
  }

  computeRaw(_person, _world, dt) {
    this.accumulate(dt, 16);
    return this.pressure * 0.7; // temel ihtiyaçların önüne geçmesin
  }

  createAction(person, world) {
    if (person.inventory.freeWeight < MIN_FREE_WEIGHT) {
      return ActionFactory.depositAtHome(person, 'Yükünü yuvasına bırakıyor', (t) => !t.isTool);
    }
    const project = ProjectPlanner.choose(person, world);
    return project?.createAction(person, world, () => this.relieve(0.6)) ?? null;
  }
}
