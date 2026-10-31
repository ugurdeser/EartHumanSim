import { HOUR, POPULATION, SIM } from '../config.js';
import { PersonFactory } from '../agents/PersonFactory.js';
import { Sex } from '../agents/Sex.js';
import { AnimalSpawner } from '../animals/AnimalSpawner.js';
import { PlantSystem } from '../plants/PlantSystem.js';
import { FeatureGenerator } from '../world/FeatureGenerator.js';
import { Home } from '../world/Home.js';
import { World } from '../world/World.js';
import { Calendar } from './Calendar.js';
import { EventLog, LogType } from './EventLog.js';
import { Random } from './Random.js';
import { SimulationClock } from './SimulationClock.js';

/** Simülasyonu (arayüzden bağımsız) kurar: tarayıcı da başsız test de bunu kullanır. */
export class WorldBuilder {
  static build(seed) {
    const rng = new Random(seed);
    const clock = new SimulationClock(SIM.START_HOUR * HOUR);
    const calendar = new Calendar(clock);
    const log = new EventLog(calendar);
    const world = new World({ rng, clock, calendar, log });
    world.personFactory = new PersonFactory(rng);

    const { start } = world;
    new FeatureGenerator(rng).generate(world, start);
    world.addSystem(new AnimalSpawner(world));
    world.addSystem(new PlantSystem(world));
    WorldBuilder.#populate(world, start);
    world.activeRegion.refresh(world.people);

    log.add(`🌍 Dünya oluşturuldu (tohum: ${rng.seed})`, LogType.INFO);
    return { rng, clock, calendar, log, world, start };
  }

  static #populate(world, center) {
    const spawn = (sex) => {
      let position;
      do position = world.randomPointNear(center, POPULATION.SPAWN_RADIUS);
      while (world.isWater(position.x, position.y, 5));
      const home = world.addHome(new Home(position.x, position.y));
      const person = world.personFactory.createAdult(sex, position, home);
      world.addPerson(person);
      const known = person.knowledge.technologies.map((t) => t.skill).join(', ');
      world.log.personal([person], `📍 ${person.age} yaşında bu topraklara geldi${known ? ` (${known} biliyor)` : ''}`, LogType.LIFE);
    };
    for (let i = 0; i < POPULATION.MALES; i++) spawn(Sex.MALE);
    for (let i = 0; i < POPULATION.FEMALES; i++) spawn(Sex.FEMALE);
  }
}
