import { clamp01, lerp } from '../core/MathUtils.js';

const MUTATION = 0.05;
const indexes = new WeakMap(); // tanım listesi -> (gen id -> sıra), türdeki tüm bireyler paylaşır

const indexOf = (definitions) => {
  let index = indexes.get(definitions);
  if (!index) {
    index = new Map(definitions.map((def, i) => [def.id, i]));
    indexes.set(definitions, index);
  }
  return index;
};

/**
 * Bir canlının (hayvan ya da bitki) kalıtsal özellikleri (0..1). Hangi genlerin olduğunu
 * tür belirler: [{ id, name, mean?, spread? }]. Yavru anne ve babanın ortalamasını alır;
 * ebeveynler farklılaştıkça sapma artar, her nesilde küçük bir mutasyon olur.
 * Değerler düz dizide tutulur: haritada yüz binlerce bitki olabilir.
 */
export class Genome {
  constructor(definitions, values) {
    this.definitions = definitions;
    this.index = indexOf(definitions);
    this.values = definitions.map((def) => clamp01(values[def.id] ?? def.mean ?? 0.5));
  }

  static random(definitions, rng) {
    const values = {};
    for (const def of definitions) values[def.id] = rng.normal(def.mean ?? 0.5, def.spread ?? 0.15);
    return new Genome(definitions, values);
  }

  /** Babası bilinmiyorsa (ör. kendi kendini tozlayan bitki) anne iki kez sayılır. */
  static inherit(mother, father, rng) {
    const other = father ?? mother;
    const values = {};
    for (const def of mother.definitions) {
      const a = mother.get(def.id);
      const b = other.get(def.id);
      values[def.id] = rng.normal((a + b) / 2, Math.abs(a - b) * 0.5 + MUTATION);
    }
    return new Genome(mother.definitions, values);
  }

  get(id) {
    const i = this.index.get(id);
    return i === undefined ? 0.5 : this.values[i];
  }

  set(id, value) {
    const i = this.index.get(id);
    if (i !== undefined) this.values[i] = clamp01(value);
  }

  /** Genin değerini [min, max] aralığına yansıtır (0.5 = ortalama). */
  scale(id, min, max) {
    return lerp(min, max, this.get(id));
  }

  entries() {
    return this.definitions.map((def) => ({ ...def, value: this.get(def.id) }));
  }
}
