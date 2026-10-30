import { clamp01 } from '../core/MathUtils.js';

/** Kalıtsal özellikler ve etkileri. */
export const TRAIT_DEFINITIONS = Object.freeze([
  { id: 'intelligence', name: 'Zekâ', effect: 'Öğrenme hızı, icat ve öğretme' },
  { id: 'strength', name: 'Güç', effect: 'Taşıma, maden, odun, savunma' },
  { id: 'agility', name: 'Çeviklik', effect: 'Yürüme/koşma hızı, avcılık' },
  { id: 'endurance', name: 'Dayanıklılık', effect: 'Yorgunluk, soğuk, yaralanma' },
  { id: 'charm', name: 'Çekicilik', effect: 'Kur yapma başarısı' },
]);

const STRONG = 0.62; // bunun üstü "güçlü yan" sayılır
const MUTATION = 0.04;

/**
 * Genetik özellikler (0..1). Çocuk anne ve babanın ortalamasını alır; ebeveynler
 * birbirine ne kadar benziyorsa çocuk o özelliği o kadar kesin alır (ortak özellik).
 */
export class Traits {
  constructor(values) {
    for (const { id } of TRAIT_DEFINITIONS) this[id] = clamp01(values[id] ?? 0.5);
  }

  static random(rng) {
    const values = {};
    for (const { id } of TRAIT_DEFINITIONS) values[id] = rng.normal(0.5, 0.15);
    return new Traits(values);
  }

  static inherit(rng, mother, father) {
    const other = father ?? mother;
    const values = {};
    for (const { id } of TRAIT_DEFINITIONS) {
      const mean = (mother[id] + other[id]) / 2;
      const spread = Math.abs(mother[id] - other[id]) * 0.5 + MUTATION;
      values[id] = rng.normal(mean, spread);
    }
    return new Traits(values);
  }

  /** Anne ve babada ortak güçlü olup çocuğa da geçen özelliklerin adları. */
  sharedParentalStrengths(mother, father) {
    if (!father) return [];
    return TRAIT_DEFINITIONS.filter(({ id }) => mother[id] >= STRONG && father[id] >= STRONG && this[id] >= STRONG).map((t) => t.name);
  }

  entries() {
    return TRAIT_DEFINITIONS.map((def) => ({ ...def, value: this[def.id] }));
  }
}
