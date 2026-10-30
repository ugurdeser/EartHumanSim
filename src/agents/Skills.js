import { SKILLS } from '../config.js';

export const SKILL_DEFINITIONS = Object.freeze([
  { id: 'gathering', name: 'Toplayıcılık' },
  { id: 'building', name: 'İnşaat' },
  { id: 'crafting', name: 'Alet yapımı' },
  { id: 'mining', name: 'Madencilik' },
  { id: 'woodcutting', name: 'Odunculuk' },
  { id: 'fishing', name: 'Balıkçılık' },
  { id: 'hunting', name: 'Avcılık' },
  { id: 'husbandry', name: 'Hayvancılık' }, // süt sağma, yün kırkma
  { id: 'leadership', name: 'Liderlik' },
]);

/**
 * Pratikle gelişen beceriler. Her beceri biriken çalışma saatinden hesaplanır:
 * başta hızlı, sonra yavaş ilerler; ustalık 10.000 saat ister. Herkes sıfırdan başlar.
 */
export class Skills {
  constructor() {
    this.hours = new Map(SKILL_DEFINITIONS.map(({ id }) => [id, 0]));
  }

  /** Beceri düzeyi (0..1). */
  get(id) {
    return Math.min(1, Math.sqrt(this.hoursOf(id) / SKILLS.MASTERY_HOURS));
  }

  hoursOf(id) {
    return this.hours.get(id) ?? 0;
  }

  practice(id, hours) {
    this.hours.set(id, this.hoursOf(id) + hours);
  }

  /** En çok çalıştığı beceri. */
  get best() {
    return SKILL_DEFINITIONS.reduce((best, { id }) => (this.hoursOf(id) > this.hoursOf(best) ? id : best), SKILL_DEFINITIONS[0].id);
  }

  get average() {
    return SKILL_DEFINITIONS.reduce((sum, { id }) => sum + this.get(id), 0) / SKILL_DEFINITIONS.length;
  }

  entries() {
    return SKILL_DEFINITIONS.map((def) => ({ ...def, value: this.get(def.id), hours: this.hoursOf(def.id) }));
  }

  /** Düzeyin adı: çırak, kalfa, usta. */
  static rankOf(level) {
    if (level >= SKILLS.MASTER_LEVEL) return 'Usta';
    return level >= SKILLS.JOURNEYMAN_LEVEL ? 'Kalfa' : 'Çırak';
  }
}
