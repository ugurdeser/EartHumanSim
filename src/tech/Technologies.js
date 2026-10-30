import { Technology } from './Technology.js';

/** Teknoloji: elle tutulur alet ve yapılar. Teknik: öğrenilen yöntemler. */
export const TechnologyKind = Object.freeze({
  TECHNOLOGY: 'technology',
  TECHNIQUE: 'technique',
});

const { TECHNOLOGY, TECHNIQUE } = TechnologyKind;

/** Her giysi ayrı bir buluştur: önceki giysiden ya da teknikten yola çıkılır. */
const garment = (id, name, difficulty, prerequisite) =>
  new Technology(id, { name, skill: `${name.toLocaleLowerCase('tr')} yapmayı`, difficulty, kind: TECHNOLOGY, prerequisites: [prerequisite] });

/** Teknoloji ağacı. Önkoşullar bilinmeden icat edilemez. */
export const Technologies = Object.freeze({
  FIRE_MAKING: new Technology('fire_making', { name: 'Ateş yakma', skill: 'ateş yakmayı', difficulty: 0.2, kind: TECHNIQUE }),
  COOKING: new Technology('cooking', {
    name: 'Pişirme',
    kind: TECHNIQUE,
    skill: 'yemek pişirmeyi',
    difficulty: 0.2,
    prerequisites: ['fire_making'],
  }),
  COMMUNAL_STORAGE: new Technology('communal_storage', {
    name: 'Ortak depo',
    kind: TECHNIQUE,
    skill: 'ortak depo kurmayı',
    difficulty: 0.5,
    locked: true,
  }),
  POTTERY: new Technology('pottery', {
    name: 'Çanak çömlek',
    kind: TECHNIQUE,
    skill: 'kilden çömlek pişirmeyi',
    difficulty: 0.4,
    prerequisites: ['fire_making'],
  }),
  STONE_AXE: new Technology('stone_axe', { name: 'Taş balta', skill: 'taş balta yapmayı', difficulty: 0.2, kind: TECHNOLOGY }),
  FISHING_ROD: new Technology('fishing_rod', { name: 'Olta', skill: 'olta yapmayı', difficulty: 0.3, kind: TECHNOLOGY }),
  SPEAR: new Technology('spear', { name: 'Çakmaktaşı mızrak', skill: 'mızrak yapmayı', difficulty: 0.3, kind: TECHNOLOGY }),
  FLINT_KNIFE: new Technology('flint_knife', { name: 'Çakmaktaşı bıçak', skill: 'bıçak yapmayı', difficulty: 0.25, kind: TECHNOLOGY }),

  // Deri: post önce olduğu gibi giyilir, sonra işlenir, sonra dikilir
  HIDE_CLOAK: garment('hide_cloak', 'Post pelerin', 0.25, 'flint_knife'),
  HIDE_WORKING: new Technology('hide_working', {
    name: 'Deri işleme',
    kind: TECHNIQUE,
    skill: 'deri işlemeyi',
    difficulty: 0.3,
    prerequisites: ['hide_cloak'],
  }),
  STITCHING: new Technology('stitching', {
    name: 'Deri dikişi',
    kind: TECHNIQUE,
    skill: 'deri dikmeyi',
    difficulty: 0.35,
    prerequisites: ['hide_working'],
  }),
  LEATHER_BOOTS: garment('leather_boots', 'Deri çarık', 0.3, 'stitching'),
  LEATHER_HAT: garment('leather_hat', 'Deri bere', 0.3, 'stitching'),
  LEATHER_GLOVES: garment('leather_gloves', 'Deri eldiven', 0.35, 'leather_hat'),
  LEATHER_VEST: garment('leather_vest', 'Deri yelek', 0.35, 'stitching'),
  LEATHER_SHIRT: garment('leather_shirt', 'Deri gömlek', 0.4, 'leather_vest'),
  LEATHER_PANTS: garment('leather_pants', 'Deri pantolon', 0.45, 'leather_vest'),
  LEATHER_JACKET: garment('leather_jacket', 'Deri ceket', 0.5, 'leather_shirt'),
  LEATHER_BAG: garment('leather_bag', 'Deri sırt çantası', 0.4, 'stitching'),

  // Yün: önce ip eğrilir; iple örülür ya da dokunur
  SPINNING: new Technology('spinning', {
    name: 'İp eğirme',
    kind: TECHNIQUE,
    skill: 'yünden ip eğirmeyi',
    difficulty: 0.3,
    prerequisites: ['flint_knife'],
  }),
  KNITTING: new Technology('knitting', {
    name: 'Örgü',
    kind: TECHNIQUE,
    skill: 'örgü örmeyi',
    difficulty: 0.4,
    prerequisites: ['spinning'],
  }),
  WEAVING: new Technology('weaving', {
    name: 'Yün dokuma',
    kind: TECHNIQUE,
    skill: 'yün dokumayı',
    difficulty: 0.45,
    prerequisites: ['spinning'],
  }),
  WOOL_SOCKS: garment('wool_socks', 'Yün çorap', 0.3, 'knitting'),
  WOOL_HAT: garment('wool_hat', 'Yün bere', 0.3, 'knitting'),
  WOOL_GLOVES: garment('wool_gloves', 'Yün eldiven', 0.35, 'wool_hat'),
  WOOL_SWEATER: garment('wool_sweater', 'Yün kazak', 0.5, 'wool_gloves'),
  WOOL_TSHIRT: garment('wool_tshirt', 'Yün tişört', 0.4, 'weaving'),
  WOOL_SHIRT: garment('wool_shirt', 'Yün gömlek', 0.45, 'wool_tshirt'),
  WOOL_PANTS: garment('wool_pants', 'Yün pantolon', 0.45, 'wool_tshirt'),
  WOOL_BAG: garment('wool_bag', 'Yün sırt çantası', 0.4, 'weaving'),

  WOODEN_HUT: new Technology('wooden_hut', {
    name: 'Ahşap kulübe',
    kind: TECHNOLOGY,
    skill: 'ahşap kulübe yapmayı',
    difficulty: 0.35,
    prerequisites: ['stone_axe'],
  }),
  STONE_HOUSE: new Technology('stone_house', {
    name: 'Taş ev',
    kind: TECHNOLOGY,
    skill: 'taş ev yapmayı',
    difficulty: 0.6,
    prerequisites: ['wooden_hut'],
  }),
  STONE_ROAD: new Technology('stone_road', {
    name: 'Taş yol',
    kind: TECHNOLOGY,
    skill: 'taş yol döşemeyi',
    difficulty: 0.5,
    prerequisites: ['wooden_hut'],
  }),
});

export const ALL_TECHNOLOGIES = Object.freeze(Object.values(Technologies));

/** Başlangıçta insanların bilebileceği temel teknikler. */
export const BASIC_TECHNOLOGIES = Object.freeze([
  Technologies.STONE_AXE,
  Technologies.FISHING_ROD,
  Technologies.SPEAR,
  Technologies.FLINT_KNIFE,
]);
