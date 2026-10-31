import { wrapDelta, wrapX } from '../core/Planet.js';
import { DAY } from '../config.js';
import { clamp01 } from '../core/MathUtils.js';

const DRIFT_SPEED = 0.25;
const DRIFT_RADIUS = 300;
const DRIFT_SAMPLES = 3; // sürü bir sonraki otlağı birkaç aday arasından en otlusu olarak seçer
const WARINESS_FADE = 3 * DAY; // avlanan sürü bu sürede sakinleşir

/**
 * Sürü: üyeler ortak bir merkezin çevresinde yaşar. Merkez otlu yerlere doğru yavaşça kayar.
 */
export class Herd {
  constructor(center, { maxSize, roams = true, tether = null }) {
    this.center = center.clone();
    this.maxSize = maxSize;
    this.roams = roams; // false: merkez yerinden oynamaz (ör. göletteki balıklar)
    this.tether = tether; // varsa ağıl: gündüz çevresinde otlar, gece döner
    this.target = null;
    this.alarmedAt = -Infinity;
    this.members = new Set();
    this.lastUpdate = null; // sürü kendi saatini tutar: hangi üye uyanıksa o ilerletir
  }

  get size() {
    let count = 0;
    for (const member of this.members) if (member.alive) count++;
    return count;
  }

  get isFull() {
    return this.size >= this.maxSize;
  }

  /** Ölen üye sürüden çıkarıldığı için ilk üye hep yaşayandır. */
  get leader() {
    return this.members.values().next().value ?? null;
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

  /** Uyuyan üyeler dahil tüm sürüyü uyandırır (kovalanma, avcı). */
  wakeAll(world) {
    for (const member of this.members) member.wake(world);
  }

  /** Son güncellemeden bu yana geçen süre kadar ilerler; aynı adımda ikinci çağrı bir şey yapmaz. */
  update(world) {
    const dt = this.lastUpdate === null ? 0 : world.now - this.lastUpdate;
    this.lastUpdate = world.now;
    if (dt <= 0 || !this.roams) return;
    if (this.tether) return this.#tended(world, dt);
    if (!this.target || this.center.distanceTo(this.target) < 5) this.target = this.#nextPasture(world);
    this.#moveCenter(this.target, dt);
  }

  /** Ağıl sürüsü: gündüz ağılın çevresindeki otlakta, gece ağılda. */
  #tended(world, dt) {
    const { position, grazeRange } = this.tether;
    if (world.clock.isNight) return this.#moveCenter(position, dt);
    if (!this.target || this.center.distanceTo(this.target) < 5) this.target = this.#nextPasture(world, position, grazeRange);
    this.#moveCenter(this.target, dt);
  }

  #nextPasture(world, around = this.center, radius = DRIFT_RADIUS) {
    let best = null;
    let bestForage = -1;
    for (let i = 0; i < DRIFT_SAMPLES; i++) {
      const point = world.randomPointNear(around, radius);
      const forage = world.forageAt(point);
      if (forage > bestForage) {
        best = point;
        bestForage = forage;
      }
    }
    return best;
  }

  #moveCenter(target, dt) {
    const dx = wrapDelta(target.x - this.center.x);
    const dy = target.y - this.center.y;
    const d = Math.hypot(dx, dy);
    if (d < 1e-6) return;
    const step = Math.min(DRIFT_SPEED * dt, d);
    this.center.x = wrapX(this.center.x + (dx / d) * step);
    this.center.y += (dy / d) * step;
  }
}
