import { MINUTE } from './time.js';

/** Tarım: tohum toplamak, ekmek, tutmasını beklemek. */
export const FARMING = Object.freeze({
  SEED_SEARCH_RADIUS: 900,
  SEED_TIME: 20 * MINUTE,
  SOW_TIME: 30 * MINUTE,
  SOW_RANGE: [10, 45], // ekilen yerin yuvaya uzaklığı (m)
  SOW_TRIES: 8,
  MAX_PLANTS: 16, // bir yuvanın bakabileceği ekili bitki
  BASE_GERMINATION: 0.2, // hiç deneyimi olmayanın tohumu tutturma şansı
  SKILL_GERMINATION: 0.7,
  CARE: 0.7, // usta çiftçinin fidelerde ölümü azaltma oranı
});
