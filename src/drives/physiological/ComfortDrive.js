import { FIRE, HOUR } from '../../config.js';
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
const SLEEPY_FATIGUE = 0.2; // gece bundan yorgun olan yatar
const MAX_SHELTER = 6 * HOUR;

/** Yorgunluk, ağrı ve soğuktan kurtulmak: dinlenmek, uyumak, ateş başında ısınmak. */
export class ComfortDrive extends Drive {
  static ID = 'comfort';
  static NAME = 'Rahatlık';
  static CATEGORY = DriveCategory.PHYSIOLOGICAL;
  static DESCRIPTION = 'Fiziksel rahatsızlıktan kurtulma arayışı.';
  static WEIGHT_RANGE = [0.85, 1.2];
  static FOR_DEPENDENTS = true;

  computeRaw(person, world) {
    const fatigue = 1 - person.needs.energy;
    // Uyuyan sabaha kadar uyur; yoksa yorgunluk eşiğin altına inince kalkıp yeniden yatarak titrer
    const sleepy = person.currentDrive === this || fatigue > SLEEPY_FATIGUE;
    const night = world.clock.isNight && sleepy ? 0.45 : 0;
    const pain = (1 - person.needs.health) * 0.4;
    const cold = person.needs.warmth < COLD_THRESHOLD ? Math.pow(1 - person.needs.warmth, 1.1) * 1.6 : 0;
    return Math.pow(fatigue, 1.3) * 1.2 + night + pain + cold + this.#shelterNeed(person, world);
  }

  /** Açıktaki kişi kötü havadan kaçar; eve uzaksa boşuna yola çıkmaz. */
  #shelterNeed(person, world) {
    if (person.isSheltered || !ActionFactory.isNearHome(person, HOME_RANGE)) return 0;
    return world.weather.shelterUrge;
  }

  createAction(person, world) {
    if (this.#shelterNeed(person, world) >= 0.2) return this.#takeShelter(person, world);
    const cold = person.needs.warmth < COLD_THRESHOLD;
    return cold ? this.#warmUp(person, world) : this.#rest(person, world);
  }

  /** Eve çekil, hava dinene kadar dinlen. */
  #takeShelter(person, world) {
    return new SequenceAction('Kötü havadan korunmaya gidiyor', [
      ActionFactory.goHome(person, `${world.weather.current.name} havadan eve kaçıyor`),
      new PerformAction('Hava dinene kadar evde bekliyor', MAX_SHELTER, {
        onTick: (p, _w, dt) => p.needs.rest(dt, p.home.restQuality),
        until: (_p, w) => w.weather.shelterUrge < 0.2,
      }),
    ]);
  }

  /** Eve git, ocağı besle (yakıt yoksa önce topla), ateş başında ısın. */
  #warmUp(person, world) {
    const fire = person.home.fire;
    const neighbour = ActionFactory.canKindle(person) ? null : world.findNearestLitHome(person.position, FIRE.NEIGHBOUR_RANGE);
    if (neighbour && !person.isDependent) return this.#warmAtNeighbour(neighbour);
    const hasFuel = person.inventory.fuelSeconds > 0 || person.home.storage.fuelSeconds > 0;
    if (!person.needsCare && fire.level < LOW_FIRE && !hasFuel) {
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

  /** Ateş yakmayı bilmeyen, yanan bir komşu ocağında ısınır. */
  #warmAtNeighbour(home) {
    return new SequenceAction('Komşu ateşine gidiyor', [
      new MoveToAction(`${home.label} ocağına gidiyor`, home.position, { arriveDistance: 3 }),
      new PerformAction('Komşu ateşinde ısınıyor', MAX_SHELTER, {
        until: (p) => p.needs.warmth >= 0.95,
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
