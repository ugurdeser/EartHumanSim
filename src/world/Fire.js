import { FIRE } from '../config.js';

/** Yuvadaki ocak: yakıt (saniye) bittikçe söner. */
export class Fire {
  constructor() {
    this.fuel = 0;
  }

  get isLit() {
    return this.fuel > 0;
  }

  /** Yakıtın ne kadarının dolu olduğu (0..1). */
  get level() {
    return this.fuel / FIRE.MAX_FUEL;
  }

  /** Yakıt türünden en fazla `count` adet atar; atılan adedi döndürür. */
  feed(fuelType, count) {
    const room = Math.floor((FIRE.MAX_FUEL - this.fuel) / fuelType.fuelSeconds);
    const used = Math.max(0, Math.min(count, room));
    this.fuel += used * fuelType.fuelSeconds;
    return used;
  }

  update(dt) {
    this.fuel = Math.max(0, this.fuel - dt);
  }
}
