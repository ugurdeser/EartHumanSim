/**
 * Hava türleri. Yeni hava: buraya ekle, mevsimlerin `weather` ağırlıklarına yaz.
 * - duration: [min, max] saat
 * - cooling: havanın kendisini soğutması (°C)
 * - windChill: açıkta ek üşüme (°C), barınakta hissedilmez
 * - precipitation: yağış (0..1), açıkta ıslatır, bitkileri besler
 * - snowfall: saatte biriken kar örtüsü (0..1)
 * - moveFactor: yürüme hızına etkisi
 * - shelterUrge: açıktaki insanın sığınma isteği (0 = yok)
 * - clouds: gökyüzünün kapanması (0..1, görsel)
 */
const type = (id, name, icon, options) =>
  Object.freeze({ id, name, icon, cooling: 0, windChill: 0, precipitation: 0, snowfall: 0, moveFactor: 1, shelterUrge: 0, clouds: 0, ...options });

export const WeatherType = Object.freeze({
  CLEAR: type('clear', 'Açık', '☀️', { duration: [12, 72] }),
  CLOUDY: type('cloudy', 'Bulutlu', '☁️', { duration: [6, 36], cooling: 2, clouds: 0.5 }),
  RAIN: type('rain', 'Yağmurlu', '🌧️', { duration: [3, 18], cooling: 3, windChill: 1, precipitation: 0.5, moveFactor: 0.95, shelterUrge: 0.2, clouds: 0.95 }),
  STORM: type('storm', 'Sağanak', '⛈️', { duration: [2, 8], cooling: 5, windChill: 4, precipitation: 1, moveFactor: 0.85, shelterUrge: 0.6, clouds: 1 }),
  SNOW: type('snow', 'Karlı', '🌨️', { duration: [6, 36], cooling: 3, windChill: 1, precipitation: 0.1, snowfall: 0.015, moveFactor: 0.95, clouds: 0.8 }),
  BLIZZARD: type('blizzard', 'Tipi', '❄️', { duration: [8, 30], cooling: 8, windChill: 7, precipitation: 0.2, snowfall: 0.04, moveFactor: 0.7, shelterUrge: 1, clouds: 1 }),
});
