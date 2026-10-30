import { Technology } from './Technology.js';

/** Teknoloji ağacı. Önkoşullar bilinmeden icat edilemez. */
export const Technologies = Object.freeze({
  STONE_AXE: new Technology('stone_axe', { name: 'Taş balta', skill: 'taş balta yapmayı', difficulty: 0.2 }),
  FISHING_ROD: new Technology('fishing_rod', { name: 'Olta', skill: 'olta yapmayı', difficulty: 0.3 }),
  SPEAR: new Technology('spear', { name: 'Çakmaktaşı mızrak', skill: 'mızrak yapmayı', difficulty: 0.3 }),
  WOODEN_HUT: new Technology('wooden_hut', {
    name: 'Ahşap kulübe',
    skill: 'ahşap kulübe yapmayı',
    difficulty: 0.35,
    prerequisites: ['stone_axe'],
  }),
  STONE_HOUSE: new Technology('stone_house', {
    name: 'Taş ev',
    skill: 'taş ev yapmayı',
    difficulty: 0.6,
    prerequisites: ['wooden_hut'],
  }),
  STONE_ROAD: new Technology('stone_road', {
    name: 'Taş yol',
    skill: 'taş yol döşemeyi',
    difficulty: 0.5,
    prerequisites: ['wooden_hut'],
  }),
});

export const ALL_TECHNOLOGIES = Object.freeze(Object.values(Technologies));

/** Başlangıçta insanların bilebileceği temel teknikler. */
export const BASIC_TECHNOLOGIES = Object.freeze([Technologies.STONE_AXE, Technologies.FISHING_ROD, Technologies.SPEAR]);
