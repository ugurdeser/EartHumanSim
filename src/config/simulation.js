export const WORLD = Object.freeze({
  // En küçük (temel) gezegen: ~80 km çaplı, enlem-boylam düzlemine açılmış. Oyundaki boy gezegen
  // ayarlarından gelir (core/Planet.js); her boy parça ve ızgara boylarının tam katı olmalı (dikiş görünmesin).
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
  START_LAND: 7000, // m: başlangıç yeri, çevresinde bu yarıçapta kara olan kıta içi bir noktadır
  START_LATITUDE: 30, // derece: ılıman kuşak
  ICE_WOBBLE: 2800, // m: buzul kıyısının dalgalanması
  HOME_RADIUS: 4000, // m: başlangıç çevresinde kaynaklar eski yoğunluğunda
  FERTILITY_REACH: 32000, // m: verimlilik bu uzaklığa kadar yavaşça bölgesel düzene geçer
  SPARSE: 0.3, // uzak diyarlarda kaynak yoğunluğu çarpanı
  FERTILITY_FAR: 0.45, // uzak diyarlarda bitki örtüsü çarpanı
});

// Yıldız sistemi, Güneş-Dünya oranlarıyla (gezegen çapı = 1): gerçek boyda Güneş 1,39 milyon km
// çapında ve 149,6 milyon km uzakta; küçük gezegende orantılı olarak yakın ve küçük.
export const STAR = Object.freeze({
  DIAMETER: 109.2,
  DISTANCE: 11740,
});

export const SIM = Object.freeze({
  REAL_TO_SIM: 540, // 1x hızda 1 gerçek saniye = 9 simülasyon dakikası (500x: 90 günlük mevsim ≈ 29 sn)
  MIN_STEP: 2, // simülasyon adımı (sn); yüksek hızlarda büyür, gerçek zamanda kare başına küçülür
  MAX_STEP: 60,
  SMOOTH_FRAMES: 120, // yavaş hızlarda adım, saniyenin bu kadarda biri kadar oyun süresine iner (akıcı hareket)
  STEPS_PER_SECOND: 4500, // hızlı modlarda gerçek saniye başına hedeflenen adım sayısı
  MAX_STEPS_PER_FRAME: 300,
  START_HOUR: 7,
  // `scale`: 1x'e göre hız; kısayol tuşu. "Gerçek": 1 gerçek saniye = 1 oyun saniyesi.
  SPEEDS: Object.freeze([
    { label: 'Gerçek', scale: 1 / 540, key: 'Digit0', title: '1 gerçek saniye = 1 oyun saniyesi' },
    { label: '1x', scale: 1, key: 'Digit1', title: '1 gerçek saniye = 9 oyun dakikası' },
    { label: '10x', scale: 10, key: 'Digit2' },
    { label: '50x', scale: 50, key: 'Digit3' },
    { label: '200x', scale: 200, key: 'Digit4' },
    { label: '500x', scale: 500, key: 'Digit5', title: '1 gerçek saniye ≈ 3 oyun günü' },
  ]),
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
