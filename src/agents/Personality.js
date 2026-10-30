import { clamp } from '../core/MathUtils.js';
import { DRIVE_TYPES } from '../drives/DriveRegistry.js';

/** Her güdünün kişiye özgü ağırlığı: insanları birbirinden farklı kılan şey. */
export class Personality {
  constructor(weights) {
    this.weights = weights;
  }

  static random(rng) {
    const weights = new Map();
    for (const Type of DRIVE_TYPES) {
      const [min, max] = Type.WEIGHT_RANGE;
      weights.set(Type.ID, rng.range(min, max));
    }
    return new Personality(weights);
  }

  /** Ebeveynlerin ortalaması + küçük mutasyon. */
  static inherit(rng, mother, father) {
    const weights = new Map();
    for (const Type of DRIVE_TYPES) {
      const [min, max] = Type.WEIGHT_RANGE;
      const base = (mother.weightOf(Type.ID) + (father ?? mother).weightOf(Type.ID)) / 2;
      weights.set(Type.ID, clamp(base + rng.range(-0.15, 0.15), min, max));
    }
    return new Personality(weights);
  }

  weightOf(driveId) {
    return this.weights.get(driveId) ?? 1;
  }
}
