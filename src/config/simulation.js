export const WORLD = Object.freeze({
  // ~80 km çaplı gezegen, enlem-boylam düzlemine açılmış: doğu-batı sarar, kuzey-güney kutuplarda biter.
  // Genişlik parça ve ızgara boylarının tam katı olmalı (dikiş görünmesin).
  WIDTH: 252000, // ekvator çevresi
  HEIGHT: 126000, // kutuptan kutba
  CHUNK_SIZE: 250, // bitkiler bu boyutta parçalar halinde, gerektikçe üretilir
  FEATURE_CELL: 1000, // gölet / maden / yuva ızgarası
  ACTIVE_RADIUS: 3000, // insanların bu çevresindeki hayvanlar simüle edilir
  EXPLORATION_CELL: 250,
  MAX_LOADED_CHUNKS: 5000, // aşılırsa dokunulmamış parçalar bellekten atılır
  START_AREA_RADIUS: 1500, // başlangıç bölgesinde temel kaynaklar garanti edilir
});

export const PLANET = Object.freeze({
  SEA_SHARE: 0.4, // yüzeyin deniz olan payı
  CONTINENT_SCALE: 20000, // m: kıta / deniz öbeklerinin tipik boyu
  START_LAND: 7000, // m: başlangıç yeri, çevresinde bu yarıçapta kara olan kıta içi bir noktadır
  START_LATITUDE: 30, // derece: ılıman kuşak
  ICE_MARGIN: 15400, // m: kutuptan bu kadar uzağa kadar aşılamaz buzul
  ICE_WOBBLE: 2800, // m: buzul kıyısının dalgalanması
  CLIMATE_SWING: 32, // °C: ekvatordan kutba sıcaklık farkı (30. enlemde fark sıfır)
  HOME_RADIUS: 4000, // m: başlangıç çevresinde kaynaklar eski yoğunluğunda
  FERTILITY_REACH: 32000, // m: verimlilik bu uzaklığa kadar yavaşça bölgesel düzene geçer
  SPARSE: 0.3, // uzak diyarlarda kaynak yoğunluğu çarpanı
  FERTILITY_FAR: 0.45, // uzak diyarlarda bitki örtüsü çarpanı
});

// Yıldız sistemi, Güneş-Dünya oranlarıyla (gezegen çapı = 1)
export const STAR = Object.freeze({
  DIAMETER: 109.2, // ~8.700 km
  DISTANCE: 11740, // ~940.000 km
});

// Bulut katmanı, Dünya'daki 2-12 km yüksekliğin gezegen çapına oranıyla
const REAL_PLANET_KM = 12742;
const PLANET_DIAMETER = WORLD.WIDTH / Math.PI;
export const CLOUD_ALTITUDE = Object.freeze([(2 / REAL_PLANET_KM) * PLANET_DIAMETER, (12 / REAL_PLANET_KM) * PLANET_DIAMETER]); // ~13-76 m

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
