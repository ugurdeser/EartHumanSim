/**
 * Mevsimler: sıcaklık, bitki büyüme hızı ve harita renkleri.
 * Ağaç kahverengi-yeşil, çalı koyu yeşil, ot açık yeşil; sonbahar/kışta tonlar değişir.
 * meadow ve forest: yeryüzünü saran kesintisiz bitki örtüsü, noktalar bunun üstünde durur.
 */
export const Season = Object.freeze({
  SPRING: Object.freeze({
    id: 'spring',
    name: 'İlkbahar',
    months: Object.freeze(['Mart', 'Nisan', 'Mayıs']),
    icon: '🌱',
    temperature: 14,
    growth: 1.2,
    weather: Object.freeze({ CLEAR: 4, CLOUDY: 3, RAIN: 4, STORM: 1 }),
    palette: Object.freeze({ ground: '#e3dcc0', meadow: '#9cc36a', forest: '#4f7f3f', grass: '#a8dc6c', bush: '#24501a', tree: '#5a6326' }),
  }),
  SUMMER: Object.freeze({
    id: 'summer',
    name: 'Yaz',
    months: Object.freeze(['Haziran', 'Temmuz', 'Ağustos']),
    icon: '☀️',
    temperature: 26,
    growth: 1,
    weather: Object.freeze({ CLEAR: 7, CLOUDY: 2, RAIN: 1, STORM: 1 }),
    palette: Object.freeze({ ground: '#e6d9a8', meadow: '#a9bf5c', forest: '#48733a', grass: '#b6d468', bush: '#2a5a1c', tree: '#5f6528' }),
  }),
  AUTUMN: Object.freeze({
    id: 'autumn',
    name: 'Sonbahar',
    months: Object.freeze(['Eylül', 'Ekim', 'Kasım']),
    icon: '🍂',
    temperature: 11,
    growth: 0.6,
    weather: Object.freeze({ CLEAR: 3, CLOUDY: 3, RAIN: 5, STORM: 1 }),
    palette: Object.freeze({ ground: '#ddcfae', meadow: '#c0a95a', forest: '#7a6a30', grass: '#c9b45e', bush: '#4d4a1c', tree: '#7a5a26' }),
  }),
  WINTER: Object.freeze({
    id: 'winter',
    name: 'Kış',
    months: Object.freeze(['Aralık', 'Ocak', 'Şubat']),
    icon: '❄️',
    temperature: -3,
    growth: 0.3, // 90 günlük kışta yemişler yavaş da olsa yenilenir
    weather: Object.freeze({ CLEAR: 3, CLOUDY: 3, SNOW: 4, BLIZZARD: 1 }),
    palette: Object.freeze({ ground: '#eef1f4', meadow: '#dfe4dc', forest: '#8d9a8a', grass: '#c9d6bd', bush: '#3b4a35', tree: '#4f5340' }),
  }),
});

export const SEASON_ORDER = Object.freeze([Season.SPRING, Season.SUMMER, Season.AUTUMN, Season.WINTER]);
