import { DECISION } from '../config.js';
import { ActionFactory } from './ActionFactory.js';

/**
 * Kişinin "beyni": güdüleri periyodik olarak değerlendirir, en şiddetlisini
 * eyleme dönüştürür. Mevcut işi bırakmak için yeni güdünün belirgin şekilde
 * daha güçlü olması gerekir (histerezis) — böylece kişiler kararsızca titremez.
 */
export class DecisionMaker {
  constructor(person) {
    this.person = person;
    this.currentDrive = null;
    this.currentAction = null;
    this.thinkTimer = 0;
    this.lastThinkTime = null;
  }

  get activity() {
    return this.currentAction && !this.currentAction.isDone ? this.currentAction.description : 'Boşta';
  }

  update(world, dt) {
    this.thinkTimer -= dt;
    const idle = !this.currentAction || this.currentAction.isDone;
    if (idle || this.thinkTimer <= 0) {
      this.think(world);
      this.thinkTimer = DECISION.THINK_INTERVAL;
    }
    this.currentAction?.update(this.person, world, dt);
  }

  think(world) {
    const now = world.now;
    const elapsed = this.lastThinkTime === null ? DECISION.THINK_INTERVAL : now - this.lastThinkTime;
    this.lastThinkTime = now;

    const drives = this.person.drives;
    drives.evaluate(this.person, world, elapsed);

    const busy = this.currentAction && !this.currentAction.isDone;
    const threshold = busy ? (this.currentDrive?.urgency ?? 0) + DECISION.SWITCH_MARGIN : DECISION.MIN_URGENCY;

    for (const drive of drives.ranked()) {
      if (drive.urgency < Math.max(threshold, DECISION.MIN_URGENCY)) break;
      if (busy && drive === this.currentDrive) continue;
      const action = drive.createAction(this.person, world);
      if (action) return this.#setAction(drive, action);
    }

    if (!busy) this.#setAction(null, ActionFactory.idle(this.person, world));
  }

  #setAction(drive, action) {
    this.currentAction?.cancel();
    this.currentDrive = drive;
    this.currentAction = action;
  }

  stop() {
    this.#setAction(null, null);
  }
}
