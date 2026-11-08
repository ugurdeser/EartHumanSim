import { HOUR, MINUTE } from './time.js';

export const WEATHER = Object.freeze({
  FORECAST: 4 * HOUR, // sert hava bu kadar yaklaşınca gökyüzünden anlaşılır
  FORECAST_URGE: 0.7, // yaklaşan havanın sığınma isteğine etkisi
  SNOW_SLOWDOWN: 0.35, // tam kar örtüsünde yürüme yavaşlaması
  SNOW_FORAGE_LOSS: 0.7, // tam kar örtüsünde otlamanın zorlaşması
  SNOW_SIGHT_LOSS: 0.5, // tam kar örtüsünde yiyecek arama menzilinin kısalması
  DRY_GROWTH: 0.6, // kuraklıkta bitki büyüme çarpanı
  WET_GROWTH: 1.3, // bol yağışta bitki büyüme çarpanı
  WET_TIME: 2 * HOUR, // sağanakta açıkta sırılsıklam olma süresi
  DRY_TIME: 3 * HOUR, // kuruma süresi (ateş yanında çok daha çabuk)
  WET_CHILL: 8, // sırılsıklam kişinin hissettiği ek soğuk (°C)
});

/** Haritanın üstünde süzülen bulutlar (yalnızca görsel). */
export const CLOUDS = Object.freeze({
  FADE_ZOOM: [0.12, 1.2], // bu zoom aralığında yukarıdan aşağı inerken silikleşir
  SHADOW_ALPHA: 0.18, // yere düşen gölge
});

export const FIRE = Object.freeze({
  RADIUS: 15,
  HEAT: 20, // ateş başında hissedilen sıcaklık artışı
  MAX_FUEL: 24 * HOUR, // dolu ocak bir gün yanar (3 odun)
  LIGHT_TIME: 20 * MINUTE, // sönük ocağı yakmak
  RAIN_BURN: 3, // barınaksız ocak yağışta bu kat daha hızlı söner
  NEIGHBOUR_RANGE: 800, // ateş yakamayan bu mesafedeki komşu ocağına gider
});

export const ROAD = Object.freeze({
  TILE: 10,
  SPEED_BONUS: 1.5,
  TILES_PER_SESSION: 4,
  MAX_LENGTH: 800,
});
