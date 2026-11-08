import { wrapDelta } from '../core/Planet.js';
import { Entity } from '../world/Entity.js';

const MIN_SLIDE_PROGRESS = 0.2; // kıyı boyunca kayarken adımın bu kadarı hedefe yaklaştırmalı

/** Hareket edebilen varlıkların temel sınıfı. */
export class Agent extends Entity {
  /** Hedefe doğru ilerler; vardıysa ya da deniz yolu kapattıysa true döner. */
  moveTowards(target, baseSpeed, dt, world) {
    const speed = baseSpeed * world.weather.at(this.position).moveFactor;
    const dx = wrapDelta(target.x - this.position.x);
    const dy = target.y - this.position.y;
    const distance = Math.hypot(dx, dy);
    const step = speed * dt;
    const arrives = distance <= step;
    const moveX = arrives ? dx : (dx / distance) * step;
    const moveY = arrives ? dy : (dy / distance) * step;
    const { x, y } = this.position;
    if (!world.isPassable(x, y) || world.isPassable(x + moveX, y + moveY)) {
      this.position.x += moveX;
      this.position.y += moveY;
      world.clampPosition(this.position);
      return arrives;
    }
    return this.#slideAlongShore(moveX, moveY, step, world);
  }

  /** Kıyıya dayanan, olabildiğince kıyı boyunca kayar; hedefe yaklaşamıyorsa vazgeçer. */
  #slideAlongShore(moveX, moveY, step, world) {
    const { x, y } = this.position;
    const alongX = Math.abs(moveX) >= Math.abs(moveY);
    const [first, second] = alongX ? [[moveX, 0], [0, moveY]] : [[0, moveY], [moveX, 0]];
    const slide = [first, second].find(([sx, sy]) => world.isPassable(x + sx, y + sy));
    if (!slide || Math.abs(slide[0] + slide[1]) < step * MIN_SLIDE_PROGRESS) return true;
    this.position.x += slide[0];
    this.position.y += slide[1];
    world.clampPosition(this.position);
    return false;
  }

  update(_world, _dt) {
    throw new Error(`${this.constructor.name}.update() uygulanmalı`);
  }
}
