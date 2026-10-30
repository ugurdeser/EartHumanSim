import { FARMING, HOUR } from '../../config.js';
import { LogType } from '../../core/EventLog.js';
import { Season } from '../../core/Season.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { Technologies } from '../../tech/Technologies.js';
import { PLANT_SPECIES } from '../../plants/PlantSpecies.js';
import { ActionFactory } from '../ActionFactory.js';
import { Project } from '../projects/Project.js';

const isSeed = (type) => type.isSeed;

/**
 * Tohum toplayıp yuvanın çevresine ekmek. Tohum ekme fikri basittir, ama acemi tohumların
 * çoğunu tutturamaz: çiftçilik becerisi yalnızca deneye deneye, yıllar içinde gelişir.
 */
export class PlantingProject extends Project {
  constructor() {
    super('Tohum ekmek');
  }

  static #speciesOf(seed) {
    return PLANT_SPECIES.find((Species) => Species.SPECIES.seed === seed) ?? null;
  }

  static #carriedSeed(person) {
    return person.inventory.entries().find(({ type }) => isSeed(type))?.type ?? null;
  }

  static #storedSeed(person) {
    return person.home.storage.entries().find(({ type }) => isSeed(type))?.type ?? null;
  }

  /** Tohumu alınabilecek olgun bitki. */
  static #seedSource(person, world) {
    const source = world.findNearestFood(person.position, FARMING.SEED_SEARCH_RADIUS);
    return source?.species?.seed ? source : null;
  }

  #canAttempt(person, world) {
    if (!person.isAdult || !person.knowledge.knows(Technologies.PLANTING)) return false;
    return world.calendar.season !== Season.WINTER && person.home.livingPlants.length < FARMING.MAX_PLANTS;
  }

  priority(person, world) {
    if (!this.#canAttempt(person, world)) return 0;
    const hasSeed = PlantingProject.#carriedSeed(person) || PlantingProject.#storedSeed(person);
    return hasSeed || PlantingProject.#seedSource(person, world) ? 0.5 : 0;
  }

  createAction(person, world, onWorkDone) {
    if (!this.#canAttempt(person, world)) return null;
    const seed = PlantingProject.#carriedSeed(person);
    if (seed) return this.#sow(person, world, seed, onWorkDone);
    if (PlantingProject.#storedSeed(person)) return ActionFactory.fetchFromHome(person, 'Depodan tohum alıyor', isSeed, 3);
    return this.#gather(person, world);
  }

  #gather(person, world) {
    const source = PlantingProject.#seedSource(person, world);
    if (!source) return null;
    const seed = source.species.seed;
    return new SequenceAction(`${seed.name} toplamaya gidiyor`, [
      new MoveToAction(`${source.species.name} arıyor`, source.position, { arriveDistance: 2 }),
      new PerformAction(`${seed.name} topluyor`, FARMING.SEED_TIME / person.workSpeed('farming', 'intelligence'), {
        onComplete: (p, w) => {
          p.improveSkill('farming', FARMING.SEED_TIME / HOUR, w);
          if (source.alive) p.inventory.add(seed, 1 + Math.floor(p.skills.get('farming') * 3));
        },
      }),
    ]);
  }

  /** Yuvanın çevresinde, suya ve komşu bitkilere uzak bir yer. */
  static #findSpot(person, world, Species) {
    const { home } = person;
    const [min, max] = FARMING.SOW_RANGE;
    const { spacing, waterMargin } = Species.SPECIES;
    for (let i = 0; i < FARMING.SOW_TRIES; i++) {
      const point = world.randomPointNear(home.position, max);
      if (point.distanceTo(home.position) < min || world.isWater(point.x, point.y, waterMargin)) continue;
      if (world.isPlantSpotFree(point, Species, spacing)) return point;
    }
    return null;
  }

  #sow(person, world, seed, onWorkDone) {
    const Species = PlantingProject.#speciesOf(seed);
    const spot = Species && PlantingProject.#findSpot(person, world, Species);
    if (!spot) return null;
    const home = person.home;
    return new SequenceAction(`${seed.name} ekmeye gidiyor`, [
      new MoveToAction('Ekilecek yere gidiyor', spot, { arriveDistance: 1 }),
      new PerformAction(`${seed.name} ekiyor`, FARMING.SOW_TIME / person.workSpeed('farming', 'intelligence'), {
        onComplete: (p, w) => {
          if (p.inventory.remove(seed, 1) === 0) return;
          const skill = p.skills.get('farming');
          p.improveSkill('farming', FARMING.SOW_TIME / HOUR, w);
          onWorkDone();
          if (!w.rng.chance(FARMING.BASE_GERMINATION + skill * FARMING.SKILL_GERMINATION)) return;
          home.plants.push(w.addPlant(Species.sow(spot.x, spot.y, w.rng, skill * FARMING.CARE)));
          w.log.personal([p], `🌱 Ektiği ${Species.SPECIES.name.toLocaleLowerCase('tr')} filizlendi`, LogType.BUILD);
        },
      }),
    ]);
  }
}
