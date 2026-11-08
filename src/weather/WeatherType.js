/**
 * Hava türleri: atmosfer modelinin bir yerdeki durumunun adı. Model bulut, yağış ve rüzgârı
 * hesaplar; tür, insanların ve arayüzün bu durumu nasıl gördüğüdür.
 * - moveFactor: tam güçteyken yürüme hızına etkisi
 * - shelterUrge: tam güçteyken açıktaki insanın sığınma isteği (0 = yok)
 * - fullRate: türün tam güce ulaştığı yağış (mm/saat)
 */
const type = (id, name, icon, options) => Object.freeze({ id, name, icon, moveFactor: 1, shelterUrge: 0, fullRate: 1, ...options });

export const WeatherType = Object.freeze({
  CLEAR: type('clear', 'Açık', '☀️'),
  CLOUDY: type('cloudy', 'Bulutlu', '☁️'),
  RAIN: type('rain', 'Yağmurlu', '🌧️', { moveFactor: 0.95, shelterUrge: 0.2, fullRate: 3 }),
  STORM: type('storm', 'Sağanak', '⛈️', { moveFactor: 0.85, shelterUrge: 0.6, fullRate: 8 }),
  SNOW: type('snow', 'Karlı', '🌨️', { moveFactor: 0.95, fullRate: 1.5 }),
  BLIZZARD: type('blizzard', 'Tipi', '❄️', { moveFactor: 0.7, shelterUrge: 1, fullRate: 3 }),
  GALE: type('gale', 'Fırtına', '🌬️', { moveFactor: 0.8, shelterUrge: 0.7 }),
});
