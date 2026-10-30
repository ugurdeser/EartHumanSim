import { clamp01 } from '../core/MathUtils.js';

export const SKILL_DEFINITIONS = Object.freeze([
  { id: 'gathering', name: 'Toplayıcılık' },
  { id: 'building', name: 'İnşaat' },
  { id: 'crafting', name: 'Alet yapımı' },
  { id: 'mining', name: 'Madencilik' },
  { id: 'woodcutting', name: 'Odunculuk' },
  { id: 'fishing', name: 'Balıkçılık' },
  { id: 'hunting', name: 'Avcılık' },
]);

/** Pratikle gelişen beceriler; gelişme hızı zekâyla artar. */
export class Skills {
  constructor(rng) {
    this.levels = new Map(SKILL_DEFINITIONS.map(({ id }) => [id, rng ? rng.range(0.05, 0.3) : 0]));
  }

  get(id) {
    return this.levels.get(id) ?? 0;
  }

  improve(id, amount, intelligence = 0.5) {
    const learningRate = 0.5 + intelligence;
    const diminishing = 1 - this.get(id) * 0.6;
    this.levels.set(id, clamp01(this.get(id) + amount * learningRate * diminishing));
  }

  get average() {
    let total = 0;
    for (const level of this.levels.values()) total += level;
    return total / this.levels.size;
  }

  entries() {
    return SKILL_DEFINITIONS.map((def) => ({ ...def, value: this.get(def.id) }));
  }
}
