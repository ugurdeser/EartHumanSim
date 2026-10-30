const DRIFT_SPEED = 0.25;
const DRIFT_RADIUS = 300;

/** Koyun sürüsü: üyeler ortak bir merkezin çevresinde otlar, merkez yavaşça kayar. */
export class Herd {
  constructor(center) {
    this.center = center.clone();
    this.target = null;
    this.members = new Set();
  }

  get size() {
    return [...this.members].filter((m) => m.alive).length;
  }

  get leader() {
    for (const member of this.members) if (member.alive) return member;
    return null;
  }

  add(sheep) {
    this.members.add(sheep);
    sheep.herd = this;
  }

  update(world, dt) {
    if (!this.target || this.center.distanceTo(this.target) < 5) this.target = world.randomPointNear(this.center, DRIFT_RADIUS);
    const step = DRIFT_SPEED * dt;
    const dx = this.target.x - this.center.x;
    const dy = this.target.y - this.center.y;
    const d = Math.hypot(dx, dy) || 1;
    this.center.x += (dx / d) * Math.min(step, d);
    this.center.y += (dy / d) * Math.min(step, d);
  }
}
