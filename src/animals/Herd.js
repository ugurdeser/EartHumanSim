import { DAY } from '../config.js';
import { clamp01 } from '../core/MathUtils.js';

const DRIFT_SPEED = 0.25;
const DRIFT_RADIUS = 300;
const DRIFT_SAMPLES = 3; // sürü bir sonraki otlağı birkaç aday arasından en otlusu olarak seçer
const SHELTER_SEARCH = 1500;
const WARINESS_FADE = 3 * DAY; // avlanan sürü bu sürede sakinleşir

/**
 * Sürü: üyeler ortak bir merkezin çevresinde yaşar. Merkez otlu yerlere doğru yavaşça kayar;
 * sığınma mevsiminde (kış) en yakın yamaca gider ve orada kalır, yamaç yoksa olduğu yerde bekler.
 */
export class Herd {
  constructor(center, { maxSize, shelterSeasons = [], roams = true }) {
    this.center = center.clone();
    this.maxSize = maxSize;
    this.shelterSeasons = shelterSeasons;
    this.roams = roams; // false: merkez yerinden oynamaz (ör. göletteki balıklar)
    this.target = null;
    this.shelter = null; // sığınma mevsiminde seçilen yamaç
    this.sheltering = false;
    this.alarmedAt = -Infinity;
    this.members = new Set();
  }

  get size() {
    let count = 0;
    for (const member of this.members) if (member.alive) count++;
    return count;
  }

  get isFull() {
    return this.size >= this.maxSize;
  }

  get leader() {
    for (const member of this.members) if (member.alive) return member;
    return null;
  }

  add(animal) {
    this.members.add(animal);
    animal.herd = this;
  }

  remove(animal) {
    this.members.delete(animal);
  }

  /** Sürüden biri avlandı: bir süre insanlardan ürkerler. */
  alarm(now) {
    this.alarmedAt = now;
  }

  /** 1 = yeni avlandı, 0 = sakin. */
  wariness(now) {
    return clamp01(1 - (now - this.alarmedAt) / WARINESS_FADE);
  }

  update(world, dt) {
    if (!this.roams) return;
    if (this.shelterSeasons.includes(world.calendar.season)) return this.#shelter(world, dt);
    this.sheltering = false;
    this.shelter = null;
    if (!this.target || this.center.distanceTo(this.target) < 5) this.target = this.#nextPasture(world);
    this.#moveCenter(this.target, dt);
  }

  #nextPasture(world) {
    let best = null;
    let bestForage = -1;
    for (let i = 0; i < DRIFT_SAMPLES; i++) {
      const point = world.randomPointNear(this.center, DRIFT_RADIUS);
      const forage = world.forageAt(point);
      if (forage > bestForage) {
        best = point;
        bestForage = forage;
      }
    }
    return best;
  }

  #shelter(world, dt) {
    if (!this.sheltering) {
      this.sheltering = true;
      this.shelter = world.findNearestHillside(this.center, SHELTER_SEARCH);
    }
    if (this.shelter) this.#moveCenter(this.shelter.position, dt);
  }

  #moveCenter(target, dt) {
    const dx = target.x - this.center.x;
    const dy = target.y - this.center.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return;
    const step = Math.min(DRIFT_SPEED * dt, d);
    this.center.x += (dx / d) * step;
    this.center.y += (dy / d) * step;
  }
}
