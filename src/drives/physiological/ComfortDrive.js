import { HOUR } from '../../config.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const HOME_RANGE = 1200;
const TREE_SHADE_RANGE = 150;
const MAX_REST = 9 * HOUR;
const COLD_THRESHOLD = 0.8;
const LOW_FIRE = 0.3;

/** Yorgunluk, ağrı ve soğuktan kurtulmak: dinlenmek, uyumak, ateş başında ısınmak. */
export class ComfortDrive extends Drive {
  static ID = 'comfort';
  static NAME = 'Rahatlık';
  static CATEGORY = DriveCategory.PHYSIOLOGICAL;
  static DESCRIPTION = 'Fiziksel rahatsızlıktan kurtulma arayışı.';
  static WEIGHT_RANGE = [0.85, 1.2];

  computeRaw(person, world) {
    const fatigue = 1 - person.needs.energy;
    const night = world.clock.isNight && fatigue > 0.15 ? 0.45 : 0;
    const pain = (1 - person.needs.health) * 0.4;
    const cold = person.needs.warmth < COLD_THRESHOLD ? Math.pow(1 - person.needs.warmth, 1.1) * 1.6 : 0;
    return Math.pow(fatigue, 1.3) * 1.2 + night + pain + cold;
  }

  createAction(person, world) {
    const cold = person.needs.warmth < COLD_THRESHOLD;
    return cold ? this.#warmUp(person, world) : this.#rest(person, world);
  }

  /** Eve git, ocağı besle (yakıt yoksa önce topla), ateş başında ısın. */
  #warmUp(person, world) {
    const fire = person.home.fire;
    const hasFuel = person.inventory.fuelSeconds > 0 || person.home.storage.fuelSeconds > 0;
    if (fire.level < LOW_FIRE && !hasFuel) {
      const gather = ActionFactory.gatherFuel(person, world);
      if (gather) return gather;
    }
    return new SequenceAction('Isınmaya gidiyor', [
      ActionFactory.goHome(person, 'Ocağına dönüyor'),
      ActionFactory.feedFire(person),
      new PerformAction(world.clock.isNight ? 'Ateş başında uyuyor' : 'Ateş başında ısınıyor', MAX_REST, {
        onTick: (p, _w, dt) => p.needs.rest(dt, p.home.restQuality),
        until: (p, w) => p.needs.warmth >= 0.95 && (!w.clock.isNight || p.needs.energy >= 0.98),
      }),
    ]);
  }

  #rest(person, world) {
    const { position, quality, label } = this.#chooseRestSpot(person, world);
    return new SequenceAction('Dinlenmeye gidiyor', [
      new MoveToAction(`${label} gidiyor`, position, { arriveDistance: 2 }),
      new PerformAction(world.clock.isNight ? 'Uyuyor' : 'Dinleniyor', MAX_REST, {
        onTick: (p, _w, dt) => p.needs.rest(dt, quality),
        until: (p, w) => p.needs.energy >= 0.98 && !w.clock.isNight,
      }),
    ]);
  }

  #chooseRestSpot(person, world) {
    const home = person.home;
    const homeDistance = person.position.distanceTo(home.position);
    if (homeDistance < HOME_RANGE && (home.hasShelter || homeDistance < 400)) {
      return { position: home.position, quality: home.restQuality, label: `${home.shelter.name} yönüne` };
    }
    const tree = world.findNearestTree(person.position, TREE_SHADE_RANGE);
    if (tree) return { position: tree.position, quality: 0.9, label: 'Ağaç altına' };
    return { position: person.position.clone(), quality: 0.7, label: 'Olduğu yere' };
  }
}
