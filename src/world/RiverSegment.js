import { Pond } from './Pond.js';

/**
 * Nehrin bir parçası: temiz, küçük bir gölet gibi davranır, böylece su içmek, balık tutmak
 * ve bitkilerin sudan kaçınması ek kod gerektirmez. Nehir bu parçaların ardışık dizisidir.
 */
export class RiverSegment extends Pond {
  constructor(x, y, { radius, fishCapacity, named = false }) {
    super(x, y, { radius, contaminated: false });
    this.riverFishCapacity = fishCapacity;
    this.named = named; // nehrin adı yalnızca aralıklı parçalarda yazar
  }

  get fishCapacity() {
    return this.riverFishCapacity;
  }

  get mapLabel() {
    return this.named ? 'Nehir' : null;
  }

  get destination() {
    return 'Nehre';
  }

  get shoreLabel() {
    return 'Nehir kıyısına';
  }
}
