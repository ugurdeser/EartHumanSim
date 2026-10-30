import { FAMILY, FIRE, PLANTS, SIM, WORLD } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { clamp } from '../core/MathUtils.js';
import { SpatialGrid } from '../core/SpatialGrid.js';
import { Vector2 } from '../core/Vector2.js';
import { Kinship } from '../society/Kinship.js';
import { SocialSystem } from '../society/SocialSystem.js';
import { InventionService } from '../tech/InventionService.js';
import { WeatherSystem } from '../weather/WeatherSystem.js';
import { ActiveRegion } from './ActiveRegion.js';
import { BiomeMap } from './BiomeMap.js';
import { ChunkGenerator } from './chunks/ChunkGenerator.js';
import { ChunkManager } from './chunks/ChunkManager.js';
import { Home } from './Home.js';
import { RoadNetwork } from './RoadNetwork.js';

const MAX_POND_RADIUS = 90;
const MAX_HILLSIDE_RADIUS = 120;
const MAX_PLANT_RADIUS = PLANTS.TREE.RADIUS[1];
const MIN_SEASON_FORAGE = 0.15; // kışın bile kar altında biraz ot kalır

/** Fiziksel dünya: arazi, su, madenler, yuvalar, yollar ve tüm canlılar. */
export class World {
  constructor({ rng, clock, calendar, log }) {
    this.size = WORLD.SIZE;
    this.rng = rng;
    this.clock = clock;
    this.calendar = calendar;
    this.log = log;
    this.weather = new WeatherSystem({ rng, calendar, log });

    this.biomes = new BiomeMap(rng);
    this.ponds = [];
    this.mines = [];
    this.hillsides = [];
    this.homes = [];
    this.people = [];
    this.deceased = [];
    this.animals = [];
    this.predators = []; // tehlikeli hayvanlar (hızlı sorgu için ayrı liste)

    this.pondGrid = new SpatialGrid(this.size, WORLD.FEATURE_CELL);
    this.mineGrid = new SpatialGrid(this.size, WORLD.FEATURE_CELL);
    this.hillsideGrid = new SpatialGrid(this.size, WORLD.FEATURE_CELL);
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

  addMine(mine) {
    this.mines.push(mine);
    this.mineGrid.insert(mine);
  }

  addHillside(hillside) {
    this.hillsides.push(hillside);
    this.hillsideGrid.insert(hillside);
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
    const radius = maxRadius * this.weather.sightFactor;
    return this.chunks.findNearest(position, radius, (c) => c.foodSources, (src) => src.available(now) > 0);
  }

  findNearestTree(position, maxRadius) {
    return this.chunks.findNearest(position, maxRadius, (c) => c.matureTrees);
  }

  findNearestMine(position, resource, maxRadius = 5000) {
    return this.mineGrid.findNearest(position, maxRadius, (m) => m.resource === resource);
  }

  /** Noktaya en yakın bitki (kenarına `tolerance` m'den yakın olmalı); parça üretmez. */
  plantAt(point, tolerance) {
    const reach = tolerance + MAX_PLANT_RADIUS;
    let best = null;
    let bestDistance = tolerance;
    const scan = (chunk) => {
      for (const list of [chunk.trees, chunk.bushes, chunk.grass]) {
        for (const plant of list) {
          const distance = plant.position.distanceTo(point) - plant.radius;
          if (plant.alive && distance < bestDistance) {
            best = plant;
            bestDistance = distance;
          }
        }
      }
    };
    this.chunks.forEachInRect(point.x - reach, point.y - reach, point.x + reach, point.y + reach, scan, { generate: false });
    return best;
  }

  /** Noktanın içinde kaldığı yamaç (yoksa null). */
  hillsideAt(position) {
    let found = null;
    this.hillsideGrid.forEachInRect(
      position.x - MAX_HILLSIDE_RADIUS,
      position.y - MAX_HILLSIDE_RADIUS,
      position.x + MAX_HILLSIDE_RADIUS,
      position.y + MAX_HILLSIDE_RADIUS,
      (h) => {
        if (!found && h.contains(position)) found = h;
      },
    );
    return found;
  }

  findNearestHillside(position, maxRadius) {
    return this.hillsideGrid.findNearest(position, maxRadius);
  }

  /**
   * Otlayan hayvanlar için ot bolluğu (0..1): çayırlık × mevsim × parçadaki otun durumu
   * (otlanıp seyrelen yer daha az doyurur); yamaçta kışın da ot bulunur.
   */
  forageAt(position) {
    const season = this.calendar.season;
    const cover = this.chunks.peek(this.chunks.coord(position.x), this.chunks.coord(position.y))?.ecology?.grassCover ?? 1;
    const meadow = Math.min(1, this.biomes.grassChance(position.x, position.y) * cover) * Math.max(MIN_SEASON_FORAGE, Math.min(1, season.growth));
    const hillside = this.hillsideAt(position);
    const open = meadow * this.weather.forageFactor;
    return hillside ? Math.max(open, hillside.forage) : open;
  }

  /**
   * Hayvan otladı: yakındaki ot öbeklerini `food` tokluk karşılığı kadar kısaltır.
   * Ot kökünden yeniden büyür; çok otlanan yer seyrelir (forageAt düşer).
   */
  graze(position, food) {
    const chunk = this.chunks.peek(this.chunks.coord(position.x), this.chunks.coord(position.y));
    if (!chunk?.ecology) return;
    const { GRAZE_PER_FOOD, GRAZE_REACH, MIN_GROWTH } = PLANTS.GRASS;
    let left = food * GRAZE_PER_FOOD;
    const reachSq = GRAZE_REACH * GRAZE_REACH;
    for (const grass of chunk.grass) {
      if (left <= 0) break;
      if (grass.alive && grass.position.distanceSqTo(position) <= reachSq) left -= grass.browse(left, MIN_GROWTH);
    }
  }

  /** Bir noktanın bulunduğu parçayı "değişti" diye işaretler (görsel önbellek için). */
  markChanged(position) {
    this.chunks.get(this.chunks.coord(position.x), this.chunks.coord(position.y)).markChanged();
  }

  isNearLitFire(position) {
    return this.homeGrid.queryRadius(position, FIRE.RADIUS, (h) => h.fire.isLit).length > 0;
  }

  findNearestLitHome(position, maxRadius) {
    return this.homeGrid.findNearest(position, maxRadius, (h) => h.fire.isLit);
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
    this.social.families.leave(person);
    this.settleAlone(person);
    this.log.add(`🧑 ${person.fullName} ${person.age} yaşına girdi ve kendi yuvasını kurdu`, LogType.LIFE, [person]);
  }

  /** Kişi eski yuvasının yakınında kendine yeni bir yuva kurar. */
  settleAlone(person) {
    const spot = this.spotNear(person.group?.center ?? person.home.position);
    person.moveHome(this.addHome(new Home(spot.x, spot.y)));
  }

  /** Bir noktanın yakınında yuva kurulabilecek kuru bir yer. */
  spotNear(origin) {
    const [min, max] = FAMILY.OWN_HOME_DISTANCE;
    let spot;
    do {
      spot = origin.clone().add(Vector2.fromAngle(this.rng.angle(), this.rng.range(min, max)));
      this.clampPosition(spot);
    } while (this.isWater(spot.x, spot.y, 5));
    return spot;
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
    this.weather.update(dt);
    this.activeTimer -= dt;
    if (this.activeTimer <= 0) {
      this.activeTimer = SIM.ACTIVE_REFRESH;
      this.activeRegion.refresh(this.people);
      this.chunks.evict(this.activeRegion.keys);
    }

    for (const system of this.systems) system.update(this, dt);
    for (const home of this.homes) home.update(dt, this.weather.precipitation);
    this.social.update();
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
