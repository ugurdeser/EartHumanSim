import { FAMILY, FIRE, SIM, WORLD } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { clamp } from '../core/MathUtils.js';
import { SpatialGrid } from '../core/SpatialGrid.js';
import { Vector2 } from '../core/Vector2.js';
import { Kinship } from '../society/Kinship.js';
import { SocialSystem } from '../society/SocialSystem.js';
import { InventionService } from '../tech/InventionService.js';
import { ActiveRegion } from './ActiveRegion.js';
import { BiomeMap } from './BiomeMap.js';
import { ChunkGenerator } from './chunks/ChunkGenerator.js';
import { ChunkManager } from './chunks/ChunkManager.js';
import { Home } from './Home.js';
import { RoadNetwork } from './RoadNetwork.js';

const MAX_POND_RADIUS = 90;

/** Fiziksel dünya: arazi, su, madenler, yuvalar, yollar ve tüm canlılar. */
export class World {
  constructor({ rng, clock, calendar, log }) {
    this.size = WORLD.SIZE;
    this.rng = rng;
    this.clock = clock;
    this.calendar = calendar;
    this.log = log;

    this.biomes = new BiomeMap(rng);
    this.ponds = [];
    this.contaminationZones = [];
    this.mines = [];
    this.homes = [];
    this.people = [];
    this.deceased = [];
    this.animals = [];
    this.predators = []; // tehlikeli hayvanlar (hızlı sorgu için ayrı liste)

    this.pondGrid = new SpatialGrid(this.size, WORLD.FEATURE_CELL);
    this.zoneGrid = new SpatialGrid(this.size, WORLD.FEATURE_CELL);
    this.mineGrid = new SpatialGrid(this.size, WORLD.FEATURE_CELL);
    this.homeGrid = new SpatialGrid(this.size, WORLD.FEATURE_CELL);
    this.roads = new RoadNetwork(this.size);

    this.chunks = new ChunkManager({
      worldSize: this.size,
      chunkSize: WORLD.CHUNK_SIZE,
      maxLoaded: WORLD.MAX_LOADED_CHUNKS,
      generator: new ChunkGenerator({ seed: rng.seed, biomes: this.biomes, isWater: (x, y, m) => this.isWater(x, y, m) }),
    });
    this.activeRegion = new ActiveRegion(this.chunks);
    this.activeTimer = 0;
    this.systems = []; // periyodik servisler (ör. hayvan üretici): update(world, dt)

    this.social = new SocialSystem(this);
    this.invention = new InventionService(this);
    this.personFactory = null; // Game tarafından atanır
  }

  get now() {
    return this.clock.time;
  }

  // ---------- Kurulum ----------

  addPond(pond) {
    this.ponds.push(pond);
    this.pondGrid.insert(pond);
  }

  addContaminationZone(zone) {
    this.contaminationZones.push(zone);
    this.zoneGrid.insert(zone);
  }

  addMine(mine) {
    this.mines.push(mine);
    this.mineGrid.insert(mine);
  }

  addHome(home) {
    this.homes.push(home);
    this.homeGrid.insert(home);
    return home;
  }

  removeHome(home) {
    this.homes = this.homes.filter((h) => h !== home);
    this.homeGrid.remove(home);
  }

  addPerson(person) {
    this.people.push(person);
  }

  addSystem(system) {
    this.systems.push(system);
  }

  addAnimal(animal) {
    this.animals.push(animal);
    if (animal.isDangerous) this.predators.push(animal);
  }

  // ---------- Arazi sorguları ----------

  clampPosition(position) {
    position.x = clamp(position.x, 0, this.size);
    position.y = clamp(position.y, 0, this.size);
  }

  randomPointNear(center, radius) {
    const angle = this.rng.angle();
    const r = Math.sqrt(this.rng.next()) * radius;
    const point = new Vector2(center.x + Math.cos(angle) * r, center.y + Math.sin(angle) * r);
    this.clampPosition(point);
    return point;
  }

  isWater(x, y, margin = 0) {
    const reach = MAX_POND_RADIUS + margin;
    let water = false;
    this.pondGrid.forEachInRect(x - reach, y - reach, x + reach, y + reach, (pond) => {
      if (!water && Math.hypot(pond.position.x - x, pond.position.y - y) <= pond.radius + margin) water = true;
    });
    return water;
  }

  pondsNear(position, radius) {
    return this.pondGrid.queryRadius(position, radius + MAX_POND_RADIUS);
  }

  findNearestPond(position, { allowContaminated = false, withFish = false, maxRadius = 5000 } = {}) {
    return this.pondGrid.findNearest(
      position,
      maxRadius,
      (p) => (allowContaminated || !p.contaminated) && (!withFish || p.hasFish),
      (p) => Math.max(0, position.distanceTo(p.position) - p.radius),
    );
  }

  findNearestFood(position, maxRadius) {
    const now = this.now;
    return this.chunks.findNearest(position, maxRadius, (c) => c.foodSources, (src) => src.available(now) > 0);
  }

  findNearestTree(position, maxRadius) {
    return this.chunks.findNearest(position, maxRadius, (c) => c.standingTrees);
  }

  findNearestMine(position, resource, maxRadius = 5000) {
    return this.mineGrid.findNearest(position, maxRadius, (m) => m.resource === resource);
  }

  /** Bir noktanın bulunduğu parçayı "değişti" diye işaretler (görsel önbellek için). */
  markChanged(position) {
    this.chunks.get(this.chunks.coord(position.x), this.chunks.coord(position.y)).markChanged();
  }

  nearestContamination(position, maxRadius = 200) {
    const zone = this.zoneGrid.findNearest(position, maxRadius, () => true, (z) => z.distanceToEdge(position));
    return { zone, distance: zone ? zone.distanceToEdge(position) : Infinity };
  }

  isNearLitFire(position) {
    return this.homeGrid.queryRadius(position, FIRE.RADIUS, (h) => h.fire.isLit).length > 0;
  }

  findHomeWithFood(position, maxRadius, excludeHome) {
    return this.homeGrid.findNearest(position, maxRadius, (h) => h !== excludeHome && h.storage.foodCount > 0);
  }

  // ---------- Canlı sorguları ----------

  peopleNear(position, radius, exclude = null) {
    const radiusSq = radius * radius;
    return this.people.filter((p) => p !== exclude && p.position.distanceSqTo(position) <= radiusSq);
  }

  /** Yaşayan ya da ölmüş kişiyi kimliğinden bulur (arayüzdeki bağlantılar için). */
  findPersonById(id) {
    return this.people.find((p) => p.id === id) ?? this.deceased.find((p) => p.id === id) ?? null;
  }

  nearestAnimal(position, maxRadius, predicate, candidates = this.animals) {
    let best = null;
    let bestDistance = maxRadius;
    for (const animal of candidates) {
      if (!animal.alive || !predicate(animal)) continue;
      const distance = animal.position.distanceTo(position);
      if (distance < bestDistance) {
        best = animal;
        bestDistance = distance;
      }
    }
    return best ? { animal: best, distance: bestDistance } : null;
  }

  nearestDanger(position, maxRadius) {
    return this.nearestAnimal(position, maxRadius, () => true, this.predators);
  }

  // ---------- Yaşam döngüsü ----------

  birth(mother, father) {
    const child = this.personFactory.createChild(mother, father);
    this.addPerson(child);
    this.social.families.registerBirth(child, mother);
    this.log.add(`👶 ${mother.name} ve ${father?.name ?? '?'} bir çocuk sahibi oldu: ${child.fullName}`, LogType.LIFE, [mother, father, child]);
    const gifts = child.traits.sharedParentalStrengths(mother.traits, father?.traits);
    if (gifts.length) this.log.personal([child], `🧬 Anne ve babasının ortak özelliğini aldı: ${gifts.join(', ')}`, LogType.LIFE);
    this.#notifyRelatives(child, () => `👶 ${Kinship.siblingWord(child)} ${child.name} doğdu`, [...child.siblings]);
    return child;
  }

  /** Yetişkin olan kişi ailesinin yakınında kendi yuvasını kurar; artık kendi ailesini kurabilir. */
  comeOfAge(person) {
    const [min, max] = FAMILY.OWN_HOME_DISTANCE;
    const origin = person.home.position;
    let spot;
    do {
      spot = origin.clone().add(Vector2.fromAngle(this.rng.angle(), this.rng.range(min, max)));
      this.clampPosition(spot);
    } while (this.isWater(spot.x, spot.y, 5));

    this.social.families.leave(person);
    person.moveHome(this.addHome(new Home(spot.x, spot.y)));
    this.log.add(`🧑 ${person.fullName} ${person.age} yaşına girdi ve kendi yuvasını kurdu`, LogType.LIFE, [person]);
  }

  killPerson(person, cause) {
    if (!person.alive) return;
    person.die(cause, this.now);
    this.people = this.people.filter((p) => p !== person);
    this.deceased.push(person);
    this.social.handleDeath(person);
    if (person.home.owners.size === 0) this.removeHome(person.home);
    this.log.add(`✝ ${person.fullName} ${person.age} yaşında öldü (${cause})`, LogType.DANGER, [person]);
    this.#notifyRelatives(person, (relative) => `✝ ${Kinship.describe(person, relative)} ${person.name} öldü (${cause})`);
  }

  /** Kişinin yaşayan yakınlarının hikâyesine kişisel not düşer. */
  #notifyRelatives(person, messageFor, relatives = Kinship.closeRelatives(person)) {
    for (const relative of relatives) {
      if (relative.alive) this.log.personal([relative], messageFor(relative), LogType.LIFE);
    }
  }

  // ---------- Döngü ----------

  update(dt) {
    this.activeTimer -= dt;
    if (this.activeTimer <= 0) {
      this.activeTimer = SIM.ACTIVE_REFRESH;
      this.activeRegion.refresh(this.people);
      this.chunks.evict(this.activeRegion.keys);
    }

    for (const system of this.systems) system.update(this, dt);
    for (const home of this.homes) home.update(dt);
    for (const animal of this.animals) {
      if (animal.alive && this.activeRegion.isActive(animal.position)) animal.update(this, dt);
    }
    if (this.animals.some((a) => !a.alive)) {
      this.animals = this.animals.filter((a) => a.alive);
      this.predators = this.predators.filter((a) => a.alive);
    }
    for (const person of [...this.people]) person.update(this, dt);
  }
}
