import { HOUR, POPULATION, SIM } from '../config.js';
import { PersonFactory } from '../agents/PersonFactory.js';
import { Sex } from '../agents/Sex.js';
import { AnimalSpawner } from '../animals/AnimalSpawner.js';
import { PlantSystem } from '../plants/PlantSystem.js';
import { FeatureGenerator } from '../world/FeatureGenerator.js';
import { PlanetSettings } from '../world/PlanetSettings.js';
import { World } from '../world/World.js';
import { Calendar } from './Calendar.js';
import { EventLog, LogType } from './EventLog.js';
import { breathe, LoadStage } from './LoadStage.js';
import { Random } from './Random.js';
import { SimulationClock } from './SimulationClock.js';

/**
 * Simülasyonu (arayüzden bağımsız) kurar: tarayıcı da başsız test de bunu kullanır.
 * `build` bir solukta kurar; `buildAsync` aşama aşama, aralarda ekrana ilerleme bildirerek.
 */
export class WorldBuilder {
  /**
   * @param {PlanetSettings|number} planet gezegen ayarları ya da (testler için) yalnızca tohum
   * @param {{settled?: boolean}} options tohumla çağrılınca: true ise başlangıç nüfusu yerleşir
   */
  static build(planet, { settled = true } = {}) {
    const builder = WorldBuilder.#steps(WorldBuilder.#planetOf(planet, settled));
    let result = builder.next();
    while (!result.done) result = builder.next();
    return result.value;
  }

  /** Aşama aşama kurar; `onProgress(aşama, 0..1)` her parçadan sonra çağrılır ve ekran nefes alır. */
  static async buildAsync(planet, onProgress = () => {}) {
    const builder = WorldBuilder.#steps(planet);
    let result = builder.next();
    while (!result.done) {
      onProgress(result.value.stage, result.value.progress);
      await breathe();
      result = builder.next();
    }
    return result.value;
  }

  static #planetOf(planet, settled) {
    if (planet instanceof PlanetSettings) return planet;
    return new PlanetSettings({ seed: planet, population: settled ? POPULATION.MALES + POPULATION.FEMALES : 0 });
  }

  /** Kurulum adımları: her `yield` { stage, progress } ilerlemeyi bildirir. */
  static *#steps(planet) {
    yield { stage: LoadStage.TERRAIN, progress: 0 };
    const rng = new Random(planet.seed);
    const clock = new SimulationClock(SIM.START_HOUR * HOUR);
    const calendar = new Calendar(clock);
    const log = new EventLog(calendar);
    const world = new World({ rng, clock, calendar, log, planet });
    world.personFactory = new PersonFactory(rng);

    for (const progress of world.weather.warmUp()) yield { stage: LoadStage.ATMOSPHERE, progress };

    yield { stage: LoadStage.FEATURES, progress: 0 };
    const { start } = world;
    new FeatureGenerator(rng).generate(world, start);
    world.addSystem(new AnimalSpawner(world));
    world.addSystem(new PlantSystem(world));
    WorldBuilder.#populate(world, planet.population);
    world.activeRegion.refresh(world.people);

    log.add(`🌍 Dünya oluşturuldu (tohum: ${rng.seed})`, LogType.INFO);
    return { rng, clock, calendar, log, world, start, planet };
  }

  /** Başlangıç nüfusu: yarısı erkek, yarısı kadın. */
  static #populate(world, count) {
    for (let i = 0; i < count; i++) world.arrive({ sex: i % 2 === 0 ? Sex.MALE : Sex.FEMALE });
  }
}
