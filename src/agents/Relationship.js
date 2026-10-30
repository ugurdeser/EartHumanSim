import { clamp } from '../core/MathUtils.js';

/** Bir kişinin başka birine bakışı (tek yönlü). */
export class Relationship {
  constructor({ affinity = 0, attraction = 0, respect = 0 } = {}) {
    this.affinity = affinity; // sevgi/yakınlık  -1..1
    this.attraction = attraction; // çekim         0..1
    this.respect = respect; // saygı           -1..1
    this.rejectedAt = null; // bu kişi tarafından en son ne zaman reddedildi
  }

  wasRejectedRecently(now, cooldown) {
    return this.rejectedAt !== null && now - this.rejectedAt < cooldown;
  }

  changeAffinity(delta) {
    this.affinity = clamp(this.affinity + delta, -1, 1);
  }

  changeAttraction(delta) {
    this.attraction = clamp(this.attraction + delta, 0, 1);
  }

  changeRespect(delta) {
    this.respect = clamp(this.respect + delta, -1, 1);
  }
}
