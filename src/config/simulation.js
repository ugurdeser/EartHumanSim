export const WORLD = Object.freeze({
  SIZE: 8000, // 8 km x 8 km
  CHUNK_SIZE: 250, // bitkiler bu boyutta parçalar halinde, gerektikçe üretilir
  FEATURE_CELL: 1000, // gölet / maden / yuva ızgarası
  ACTIVE_RADIUS: 3000, // insanların bu çevresindeki hayvanlar simüle edilir
  EXPLORATION_CELL: 250,
  MAX_LOADED_CHUNKS: 5000, // aşılırsa dokunulmamış parçalar bellekten atılır
  START_AREA_RADIUS: 1500, // başlangıç bölgesinde temel kaynaklar garanti edilir
});

export const SIM = Object.freeze({
  REAL_TO_SIM: 540, // 1x hızda 1 gerçek saniye = 9 simülasyon dakikası (500x: 90 günlük mevsim ≈ 29 sn)
  MIN_STEP: 2, // simülasyon adımı (sn); yüksek hızlarda büyür
  MAX_STEP: 60,
  STEPS_PER_SECOND: 4500, // hızlı modlarda gerçek saniye başına hedeflenen adım sayısı
  MAX_STEPS_PER_FRAME: 300,
  START_HOUR: 7,
  SPEEDS: [1, 10, 50, 200, 500],
  ACTIVE_REFRESH: 30, // etkin bölge kaç sn'de bir yeniden hesaplanır
});

export const CALENDAR = Object.freeze({
  DAYS_PER_SEASON: 90, // 1 yıl = 4 mevsim = 360 gün
});

export const DECISION = Object.freeze({
  THINK_INTERVAL: 6, // kişiler kaç saniyede bir güdülerini değerlendirir
  MIN_URGENCY: 0.12, // bunun altındaki güdüler eyleme dönüşmez
  SWITCH_MARGIN: 0.15, // mevcut işi bırakmak için gereken fark
});
