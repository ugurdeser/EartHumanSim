import { IdleBehavior } from './IdleBehavior.js';

const POND_REACH = 0.8;

/** Balığın suyunun içinde gezinmesi: alan, yaşadığı suyun büyüklüğüne bağlıdır. */
export class SwimBehavior extends IdleBehavior {
  constructor() {
    super({ radius: 0 });
    this.label = 'Yüzüyor';
  }

  radiusFor(animal) {
    return animal.reach(animal.pond.innerRadius * POND_REACH);
  }
}
