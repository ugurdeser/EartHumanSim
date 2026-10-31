import { Items } from '../items/Items.js';
import { Technologies } from '../tech/Technologies.js';

/**
 * Barınak basamakları: her biri daha fazla malzeme, beceri ve zaman ister;
 * karşılığında daha iyi dinlenme ve soğuğa karşı koruma sağlar.
 */
export const SHELTER_LEVELS = Object.freeze([
  Object.freeze({ level: 0, name: 'Açık kamp', materials: [], technology: null, minSkill: 0, work: 0, restQuality: 1, insulation: 0 }),
  Object.freeze({
    level: 1,
    name: 'Dal kulübe',
    materials: [[Items.BRANCH, 6]],
    technology: Technologies.BRANCH_HUT,
    minSkill: 0,
    work: 1, // gereken iş miktarı (oturum ≈ 0.3-0.6)
    restQuality: 1.2,
    insulation: 4, // °C
  }),
  Object.freeze({
    level: 2,
    name: 'Ahşap kulübe',
    materials: [[Items.WOOD, 12]],
    technology: Technologies.WOODEN_HUT,
    minSkill: 0,
    work: 4,
    restQuality: 1.4,
    insulation: 8,
  }),
  Object.freeze({
    level: 3,
    name: 'Taş ev',
    materials: [[Items.STONE, 30]],
    technology: Technologies.STONE_HOUSE,
    minSkill: 0.05, // ≈ 25 saat inşaat: en az bir kulübe yapmış olmalı
    work: 10,
    restQuality: 1.6,
    insulation: 12,
  }),
]);

export const MAX_SHELTER_LEVEL = SHELTER_LEVELS.length - 1;
