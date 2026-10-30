/**
 * Mevsimler: sıcaklık, bitki büyüme hızı ve harita renkleri.
 * Ağaç kahverengi-yeşil, çalı koyu yeşil, ot açık yeşil; sonbahar/kışta tonlar değişir.
 */
export const Season = Object.freeze({
  SPRING: Object.freeze({
    id: 'spring',
    name: 'İlkbahar',
    icon: '🌱',
    temperature: 14,
    growth: 1.2,
    palette: Object.freeze({ ground: '#e3dcc0', grass: '#a8dc6c', bush: '#24501a', tree: '#5a6326' }),
  }),
  SUMMER: Object.freeze({
    id: 'summer',
    name: 'Yaz',
    icon: '☀️',
    temperature: 26,
    growth: 1,
    palette: Object.freeze({ ground: '#e6d9a8', grass: '#b6d468', bush: '#2a5a1c', tree: '#5f6528' }),
  }),
  AUTUMN: Object.freeze({
    id: 'autumn',
    name: 'Sonbahar',
    icon: '🍂',
    temperature: 11,
    growth: 0.6,
    palette: Object.freeze({ ground: '#ddcfae', grass: '#c9b45e', bush: '#4d4a1c', tree: '#7a5a26' }),
  }),
  WINTER: Object.freeze({
    id: 'winter',
    name: 'Kış',
    icon: '❄️',
    temperature: -3,
    growth: 0,
    palette: Object.freeze({ ground: '#eef1f4', grass: '#c9d6bd', bush: '#3b4a35', tree: '#4f5340' }),
  }),
});

export const SEASON_ORDER = Object.freeze([Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER]);
