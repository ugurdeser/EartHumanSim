import { HOUR } from '../config.js';
import { Action } from './Action.js';

/**
 * Bir hedefe yürür/koşar. Hedef sabit bir Vector2 ya da her adımda
 * konum döndüren bir fonksiyon olabilir (hareketli hedefler için).
 */
export class MoveToAction extends Action {
  constructor(label, target, { arriveDistance = 1.5, run = false, timeout = 6 * HOUR, onBlocked = null } = {}) {
    super(label);
    this.resolveTarget = typeof target === 'function' ? target : () => target;
    this.arriveDistance = arriveDistance;
    this.run = run;
    this.timeout = timeout;
    this.onBlocked = onBlocked; // yol kapalıysa (deniz) çağrılır
    this.elapsed = 0;
    this.target = null;
  }

  tick(person, world, dt) {
    this.target = this.resolveTarget();
    if (!this.target) return this.fail();

    this.elapsed += dt;
    if (this.elapsed > this.timeout) return this.fail();

    if (person.position.distanceTo(this.target) <= this.arriveDistance) return this.complete();
    const speed = this.run ? person.runSpeed : person.walkSpeed;
    const stopped = person.moveTowards(this.target, speed, dt, world);
    if (person.position.distanceTo(this.target) <= this.arriveDistance) return this.complete();
    if (stopped) {
      // Kıyıya dayandı, yol yok: saatlerce beklemek yerine vazgeçer
      this.onBlocked?.(person, world);
      this.fail();
    }
  }
}
