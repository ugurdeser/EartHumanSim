import { AnimalBehavior } from './AnimalBehavior.js';

const FLEE_DISTANCE = 30;
const WARY_THRESHOLD = 0.3;
const WATCH_FACTOR = 8; // bu kat uzaklıkta tehlike varken uyumaz

/**
 * Tehditten kaçmak. Yırtıcı her zaman tehdittir; insan ise koşuyorsa (av) ya da sürü
 * yakın zamanda avlandığı için ürkekse. Uysal hayvanlar daha az ürker.
 */
export class FleeBehavior extends AnimalBehavior {
  constructor({ radius }) {
    super('Kaçıyor');
    this.radius = radius;
    this.threat = null;
  }

  urgency(animal, world) {
    this.threat = this.#findThreat(animal, world);
    return this.threat ? 1 : 0;
  }

  #findThreat(animal, world) {
    const predator = world.nearestDanger(animal.position, this.radius * 1.5)?.animal;
    if (predator) return predator;
    if (animal.domestication) return null; // insana alışmış ya da ağılda
    const wariness = (animal.herd?.wariness(world.now) ?? 0) * (1 - animal.genome.get('tameness'));
    return world.peopleNear(animal.position, this.radius).find((p) => p.isRunning(world.now) || wariness > WARY_THRESHOLD) ?? null;
  }

  /**
   * Yakınlarda yırtıcı ya da tetikte olunacak insan varken uyunmaz (uyanık kalıp izler);
   * yoksa tehlike, uyandırma olaylarıyla (kovalanma, avcı) ve türün en uzun uykusuyla yakalanır.
   */
  quietFor(animal, world) {
    const watch = this.radius * WATCH_FACTOR;
    if (world.nearestDanger(animal.position, watch)) return 0;
    const wary = !animal.domestication && (animal.herd?.wariness(world.now) ?? 0) > 0;
    return wary && world.peopleNear(animal.position, watch).length > 0 ? 0 : Infinity;
  }

  tick(animal, world, dt) {
    const threat = this.threat;
    if (!threat?.alive || threat.position.distanceTo(animal.position) > this.radius * 2) return true;
    const away = animal.position.clone().sub(threat.position).normalize().scale(FLEE_DISTANCE).add(animal.position);
    animal.moveTowards(away, animal.runSpeed, dt, world);
    return false;
  }
}
