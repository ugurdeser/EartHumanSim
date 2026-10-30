import { Entity } from '../world/Entity.js';

/** Hareket edebilen varlıkların temel sınıfı. */
export class Agent extends Entity {
  /** Hedefe doğru ilerler; vardıysa true döner. */
  moveTowards(target, speed, dt, world) {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const distance = Math.hypot(dx, dy);
    const step = speed * dt;
    if (distance <= step) {
      this.position.set(target.x, target.y);
      world.clampPosition(this.position);
      return true;
    }
    this.position.x += (dx / distance) * step;
    this.position.y += (dy / distance) * step;
    world.clampPosition(this.position);
    return false;
  }

  update(_world, _dt) {
    throw new Error(`${this.constructor.name}.update() uygulanmalı`);
  }
}
