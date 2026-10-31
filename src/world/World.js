import { DAY, FIRE, PLANET, PLANTS, SIM, WORLD } from '../config.js';
import { clamp } from '../core/MathUtils.js';
import { latitudeOf, wrapX } from '../core/Planet.js';
import { Scheduler } from '../core/Scheduler.js';
import { SpatialGrid } from '../core/SpatialGrid.js';
import { Vector2 } from '../core/Vector2.js';
import { SocialSystem } from '../society/SocialSystem.js';
import { InventionService } from '../tech/InventionService.js';
import { WeatherSystem } from '../weather/WeatherSystem.js';
import { ActiveRegion } from './ActiveRegion.js';
import { BiomeMap } from './BiomeMap.js';
import { ChunkGenerator } from './chunks/ChunkGenerator.js';
import { ChunkManager } from './chunks/ChunkManager.js';
import { Demography } from './Demography.js';
import { Pasture } from './Pasture.js';
import { RoadNetwork } from './RoadNetwork.js';
import { Terrain } from './Terrain.js';

const MAX_POND_RADIUS = 131; // en büyük gölet, en uzun kıyısıyla
const MAX_PLANT_RADIUS = PLANTS.TREE.RADIUS[1];

/** Fiziksel dünya: arazi, su, madenler, yuvalar, yollar ve tüm canlılar. */
export class World {
  constructor({ rng, clock, calendar, log }) {
    this.width = WORLD.WIDTH;
    this.height = WORLD.HEIGHT;
    this.rng = rng;
    this.clock = clock;
    this.calendar = calendar;
    this.log = log;
    this.weather = new WeatherSystem({ rng, calendar, log });

    this.terrain = new Terrain(rng);
    this.start = this.terrain.start;
    this.biomes = new BiomeMap(rng, this.start);
    this.ponds = [];
    this.mines = [];
    this.homes = [];
    this.pens = [];
    this.people = [];
    this.deceased = [];
    this.animals = [];
    this.predators = []; // tehlikeli hayvanlar (hızlı sorgu için ayrı liste)

    this.pondGrid = new SpatialGrid(this.width, this.height, WORLD.FEATURE_CELL);
    this.mineGrid = new SpatialGrid(this.width, this.height, WORLD.FEATURE_CELL);
    this.homeGrid = new SpatialGrid(this.width, this.height, WORLD.FEATURE_CELL);
    this.roads = new RoadNetwork(this.width);

    this.chunks = new ChunkManager({
      worldWidth: this.width,
      worldHeight: this.height,
      chunkSize: WORLD.CHUNK_SIZE,
      maxLoaded: WORLD.MAX_LOADED_CHUNKS,
      generator: new ChunkGenerator({ seed: rng.seed, biomes: this.biomes, isWater: (x, y, m) => this.isWater(x, y, m) }),
    });
    this.activeRegion = new ActiveRegion(this.chunks);
    this.activeTimer = 0;
    this.scheduler = new Scheduler(); // uyuyan canlıları uyanma zamanına göre tutar
    this.systems = []; // periyodik servisler (ör. hayvan üretici): update(world, dt)

    this.pasture = new Pasture(this);
    this.demography = new Demography(this);
    this.social = new SocialSystem(this);
    this.invention = new InventionService(this);
    this.personFactory = null; // Game tarafından atanır
  }

  get now() {
    return this.clock.time;
  }

  /** Güneşin tam tepede olduğu boylam: öğlen başlangıç bölgesinin üstünde, batıya doğru döner. */
  get sunX() {
    return wrapX(this.start.x - ((this.now % DAY) / DAY - 0.5) * this.width);
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

  addHome(home) {
    this.homes.push(home);
    this.homeGrid.insert(home);
    return home;
  }

  removeHome(home) {
    if (home.pen) this.removePen(home.pen);
    this.homes = this.homes.filter((h) => h !== home);
    this.homeGrid.remove(home);
  }

  addPen(pen) {
    this.pens.push(pen);
    pen.home.pen = pen;
    return pen;
  }

  removePen(pen) {
    pen.release(this);
    this.pens = this.pens.filter((p) => p !== pen);
    pen.home.pen = null;
  }

  /** Yakalanan yırtıcı artık tehlike değil. */
  forgetPredator(animal) {
    this.predators = this.predators.filter((a) => a !== animal);
  }

  /** Yabana dönen yırtıcı yeniden tehlike. */
  rememberPredator(animal) {
    if (animal.isDangerous && !this.predators.includes(animal)) this.predators.push(animal);
  }

  /** Ekilen bitkiyi bulunduğu parçaya koyar. */
  addPlant(plant) {
    const { x, y } = plant.position;
    const chunk = this.chunks.get(this.chunks.coordX(x), this.chunks.coordY(y));
    chunk[plant.species.layer].push(plant);
    chunk.markChanged();
    return plant;
  }

  /** Noktanın `spacing` kadar yakınında aynı katmandan yaşayan bitki yok mu? */
  isPlantSpotFree(point, Species, spacing) {
    const chunk = this.chunks.get(this.chunks.coordX(point.x), this.chunks.coordY(point.y));
    const spacingSq = spacing * spacing;
    return !chunk[Species.SPECIES.layer].some((p) => p.alive && p.position.distanceSqTo(point) < spacingSq);
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
    position.x = wrapX(position.x);
    position.y = clamp(position.y, 0, this.height);
  }

  /** Deniz ve buzul yürünemez. */
  isPassable(x, y) {
    return this.terrain.isLand(x, y);
  }

  /** Enleme göre sıcaklık farkı (°C): ekvator sıcak, kutuplar soğuk; başlangıç enleminde sıfır. */
  climateAt(position) {
    return PLANET.CLIMATE_SWING * (0.25 - Math.sin(latitudeOf(position.y)) ** 2);
  }

  randomPointNear(center, radius) {
    const angle = this.rng.angle();
    const r = Math.sqrt(this.rng.next()) * radius;
    const point = new Vector2(center.x + Math.cos(angle) * r, center.y + Math.sin(angle) * r);
    this.clampPosition(point);
    return point;
  }

  isWater(x, y, margin = 0) {
    if (!this.isPassable(x, y)) return true;
    const reach = MAX_POND_RADIUS + margin;
    const point = { x, y };
    let water = false;
    this.pondGrid.forEachInRect(x - reach, y - reach, x + reach, y + reach, (pond) => {
      if (!water && pond.contains(point, margin)) water = true;
    });
    return water;
  }

  pondsNear(position, radius) {
    return this.pondGrid.queryRadius(position, radius + MAX_POND_RADIUS);
  }

  findNearestPond(position, { withFish = false, maxRadius = 5000 } = {}) {
    return this.pondGrid.findNearest(
      position,
      maxRadius,
      (p) => !withFish || p.hasFish,
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

  forageAt(position) {
    return this.pasture.forageAt(position);
  }

  graze(position, food) {
    this.pasture.graze(position, food);
  }

  /** Bir noktanın bulunduğu parçayı "değişti" diye işaretler (görsel önbellek için). */
  markChanged(position) {
    this.chunks.get(this.chunks.coordX(position.x), this.chunks.coordY(position.y)).markChanged();
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
    return this.demography.birth(mother, father);
  }

  comeOfAge(person) {
    this.demography.comeOfAge(person);
  }

  settleAlone(person) {
    this.demography.settleAlone(person);
  }

  spotNear(origin) {
    return this.demography.spotNear(origin);
  }

  killPerson(person, cause) {
    this.demography.killPerson(person, cause);
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
    this.scheduler.popDue(this.now, (animal) => animal.wake(this));
    let anyDead = false;
    for (const animal of this.animals) {
      if (!animal.alive) anyDead = true;
      else if (animal.sleeping) continue;
      else if (this.activeRegion.isActive(animal.position)) animal.update(this, dt);
      else animal.freeze(this);
    }
    if (anyDead) {
      this.animals = this.animals.filter((a) => a.alive);
      this.predators = this.predators.filter((a) => a.alive);
    }
    for (const person of [...this.people]) person.update(this, dt);
  }
}
