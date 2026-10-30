import { ANIMALS, DAY } from '../config.js';
import { Random } from '../core/Random.js';
import { Vector2 } from '../core/Vector2.js';
import { Season } from '../core/Season.js';
import { Fish } from './Fish.js';
import { Herd } from './Herd.js';
import { Sheep } from './Sheep.js';
import { Wolf } from './Wolf.js';

const SPAWN_SALT = 0x5eed;
const WOLF_MIN_DISTANCE_TO_PEOPLE = 1500; // kurtlar insanların dibinde doğmasın

/**
 * Hayvanları, bir bölge ilk kez etkinleştiğinde biyomuna göre üretir;
 * zamanla göletlere balık, ilkbaharda sürülere kuzu ekler.
 */
export class AnimalSpawner {
  constructor(world) {
    this.world = world;
    this.herds = [];
    this.stockedPonds = new Set();
    this.dailyTimer = DAY;
    world.activeRegion.onFirstActivation((cx, cy) => this.#populateChunk(cx, cy));
  }

  #populateChunk(cx, cy) {
    const world = this.world;
    const chunks = world.chunks;
    const size = chunks.chunkSize;
    const rng = Random.derive(world.rng.seed ^ SPAWN_SALT, chunks.keyOf(cx, cy));
    const center = new Vector2((cx + 0.5) * size, (cy + 0.5) * size);

    const farFromPeople = world.peopleNear(center, WOLF_MIN_DISTANCE_TO_PEOPLE).length === 0;
    if (farFromPeople && world.biomes.isForest(center.x, center.y) && rng.chance(ANIMALS.WOLF.SPAWN_CHANCE)) {
      world.addAnimal(new Wolf(center.x, center.y));
    }
    if (world.biomes.isMeadow(center.x, center.y) && rng.chance(ANIMALS.SHEEP.SPAWN_CHANCE) && !world.isWater(center.x, center.y, 10)) {
      this.#spawnHerd(center, rng.int(...ANIMALS.SHEEP.HERD_SIZE));
    }

    world.pondGrid.forEachInRect(cx * size, cy * size, (cx + 1) * size - 1e-6, (cy + 1) * size - 1e-6, (pond) => {
      if (chunks.coord(pond.position.x) !== cx || chunks.coord(pond.position.y) !== cy) return;
      if (this.stockedPonds.has(pond)) return;
      this.stockedPonds.add(pond);
      for (let i = 0; i < pond.fishCapacity; i++) world.addAnimal(new Fish(pond, world.rng));
    });
  }

  #spawnHerd(center, count) {
    const herd = new Herd(center);
    this.herds.push(herd);
    for (let i = 0; i < count; i++) {
      const p = this.world.randomPointNear(center, 20);
      const sheep = new Sheep(p.x, p.y);
      herd.add(sheep);
      this.world.addAnimal(sheep);
    }
  }

  /** Kurt nüfusu en azın altına düşerse insanlardan uzak bir ormanda yeni kurt belirir. */
  #keepWolvesAlive(world) {
    if (world.predators.length >= ANIMALS.WOLF.MIN_POPULATION) return;
    for (let attempt = 0; attempt < 30; attempt++) {
      const spot = new Vector2(world.rng.range(0, world.size), world.rng.range(0, world.size));
      if (!world.biomes.isForest(spot.x, spot.y) || world.isWater(spot.x, spot.y, 10)) continue;
      if (world.peopleNear(spot, WOLF_MIN_DISTANCE_TO_PEOPLE).length > 0) continue;
      world.addAnimal(new Wolf(spot.x, spot.y));
      return;
    }
  }

  /** Günlük: kurt nüfusu, göletlere balık, ilkbaharda sürülere kuzu. */
  update(world, dt) {
    this.dailyTimer -= dt;
    if (this.dailyTimer > 0) return;
    this.dailyTimer = DAY;

    const restockChance = DAY / ANIMALS.FISH.RESTOCK_TIME;
    for (const pond of this.stockedPonds) {
      if (pond.fish.size < pond.fishCapacity && world.rng.chance(restockChance)) world.addAnimal(new Fish(pond, world.rng));
    }

    this.#keepWolvesAlive(world);
    this.herds = this.herds.filter((h) => h.size > 0);
    if (world.calendar.season !== Season.SPRING) return;
    for (const herd of this.herds) {
      if (herd.size >= ANIMALS.SHEEP.MAX_HERD || !world.rng.chance(ANIMALS.SHEEP.SPRING_BIRTH_CHANCE)) continue;
      const mother = herd.leader;
      const lamb = new Sheep(mother.position.x, mother.position.y);
      herd.add(lamb);
      world.addAnimal(lamb);
    }
  }
}
