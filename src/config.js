/**
 * Simülasyonun tüm ayarlanabilir sabitleri tek bir yerde.
 * Birimler: mesafe = metre, zaman = simülasyon saniyesi, sıcaklık = °C.
 */

export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

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
  REAL_TO_SIM: 60, // 1x hızda 1 gerçek saniye = 1 simülasyon dakikası
  MIN_STEP: 2, // simülasyon adımı (sn); yüksek hızlarda büyür
  MAX_STEP: 10,
  MAX_STEPS_PER_FRAME: 300,
  START_HOUR: 7,
  SPEEDS: [1, 10, 50, 200, 500],
  ACTIVE_REFRESH: 30, // etkin bölge kaç sn'de bir yeniden hesaplanır
});

export const CALENDAR = Object.freeze({
  DAYS_PER_SEASON: 10, // 1 yıl = 4 mevsim = 40 gün
});

export const DECISION = Object.freeze({
  THINK_INTERVAL: 6, // kişiler kaç saniyede bir güdülerini değerlendirir
  MIN_URGENCY: 0.12, // bunun altındaki güdüler eyleme dönüşmez
  SWITCH_MARGIN: 0.15, // mevcut işi bırakmak için gereken fark
});

export const PERSON = Object.freeze({
  WALK_SPEED: 1.4,
  RUN_SPEED: 3.8,
  CHILD_WALK_SPEED: 1.0,
  CHILD_RUN_SPEED: 2.6,
  CARRY_CAPACITY: 18, // kg; güçle artar
  MAX_CHILDREN: 6,
  STATUS_DECAY_TIME: 5 * DAY,
  GRIEVANCE_MEMORY: 2 * DAY,
});

export const NEEDS = Object.freeze({
  FOOD_DURATION: 16 * HOUR, // tokluk 1'den 0'a bu sürede iner
  WATER_DURATION: 12 * HOUR,
  ENERGY_DURATION: 18 * HOUR,
  REST_TIME: 6 * HOUR, // kaliteli dinlenmeyle enerjinin dolma süresi
  STARVATION_TIME: 2 * DAY, // aç/susuz kalınca sağlığın bitme süresi
  FREEZING_TIME: 1.5 * DAY, // donarken sağlığın bitme süresi
  HEAL_TIME: 3 * DAY,
  COMFORT_TEMPERATURE: 10, // bunun altında vücut ısı kaybeder
  WARMTH_LOSS_TIME: 8 * HOUR, // 0 °C'de sıcaklığın tükenme süresi
  WARMTH_GAIN_TIME: 1 * HOUR,
});

/** Yaşlanma: tüm yaşlar yıl cinsinden. */
export const AGING = Object.freeze({
  YEARS_PER_DAY: 1 / (4 * CALENDAR.DAYS_PER_SEASON),
  ADULT_AGE: 16,
  FEMALE_FERTILE_UNTIL: 45,
  PREGNANCY_YEARS: 0.75, // 9 ay = 30 gün
  POSTPARTUM_YEARS: 1, // doğumdan sonra yeniden hamile kalabilmek için
  OLD_AGE: 60,
  OLD_AGE_BASE_RISK: 0.02, // 60 yaşında yıllık ölüm olasılığı
  OLD_AGE_RISK_GROWTH: 8, // risk her bu kadar yılda e kat artar
});

export const REPRODUCTION = Object.freeze({
  CONCEPTION_CHANCE: 0.15,
});

export const POPULATION = Object.freeze({
  MALES: 5,
  FEMALES: 5,
  START_AGE: [18, 35],
  SPAWN_RADIUS: 400,
  STARTING_TECH_CHANCE: 0.5, // başlangıçta bir temel tekniği bilme olasılığı
});

export const FAMILY = Object.freeze({
  OWN_HOME_DISTANCE: [60, 160],
});

export const PLANTS = Object.freeze({
  // m² başına deneme sayısı; kabul olasılığı biyom gürültüsünden gelir
  TREE_ATTEMPTS: 2.8e-3,
  BUSH_ATTEMPTS: 1.9e-3,
  GRASS_ATTEMPTS: 2.5e-3,
  BUSH_CAPACITY: 3,
  BUSH_REGROW: 10 * HOUR,
  TREE_CAPACITY: 5,
  TREE_REGROW: 20 * HOUR,
  FRUIT_TREE_RATIO: 0.3,
  WOOD_PER_TREE: 4,
});

export const FEATURES = Object.freeze({
  // km² başına adet
  POND_DENSITY: 0.4,
  DIRTY_POND_RATIO: 0.25,
  CONTAMINATION_DENSITY: 0.2,
  STONE_MINE_DENSITY: 0.25,
  FLINT_MINE_DENSITY: 0.1,
});

export const ANIMALS = Object.freeze({
  WOLF: {
    SPAWN_CHANCE: 0.02, // ormanlık parça başına
    ROAM_SPEED: 1.2,
    CHASE_SPEED: 4.5,
    DETECT_RADIUS: 100,
    CHASE_TIME: 75,
    ATTACK_DAMAGE: 0.3,
    COOLDOWN: 6 * HOUR,
    GROUP_DETERRENCE: 2,
    MEAT: 3,
    MIN_POPULATION: 3, // azalırsa insanlardan uzak ormanlarda yenisi belirir
  },
  SHEEP: {
    SPAWN_CHANCE: 0.015, // çayırlık parça başına sürü
    HERD_SIZE: [4, 8],
    MAX_HERD: 10,
    WALK_SPEED: 0.6,
    FLEE_SPEED: 3.4,
    FLEE_RADIUS: 25,
    MEAT: 4,
    SPRING_BIRTH_CHANCE: 0.3, // ilkbaharda sürü başına günlük
  },
  FISH: {
    PER_POND_RADIUS: 10, // her 10 m yarıçap için 1 balık
    RESTOCK_TIME: 2 * DAY,
  },
});

export const FIRE = Object.freeze({
  RADIUS: 15,
  HEAT: 20, // ateş başında hissedilen sıcaklık artışı
  MAX_FUEL: 16 * HOUR,
});

export const ROAD = Object.freeze({
  TILE: 10,
  SPEED_BONUS: 1.5,
  TILES_PER_SESSION: 4,
  MAX_LENGTH: 800,
});

export const COLORS = Object.freeze({
  BERRY: '#d6283b',
  FRUIT: '#f2a33a',
  WATER: '#3a8fd6',
  WATER_DIRTY: '#6f6a2e',
  CONTAMINATION: 'rgba(104, 58, 88, 0.55)',
  HOME: '#7a5230',
  FIRE: '#ff7a1a',
  ROAD: '#8f8a80',
  STONE_MINE: '#8a8d91',
  FLINT_MINE: '#3d4552',
  MALE: '#2f7bff',
  FEMALE: '#ff6fb5',
  WOLF: '#3a3a3a',
  SHEEP: '#fbfbf6',
  FISH: '#ff9f43',
  SELECTION: '#ffe14d',
});

export const NAMES = Object.freeze({
  MALE: [
    'Ali', 'Mehmet', 'Can', 'Emre', 'Kerem', 'Mert', 'Ozan', 'Baran', 'Efe', 'Arda', 'Kaan', 'Tuna', 'Umut', 'Doruk', 'Alp',
    'Deniz', 'Eren', 'Yiğit', 'Berk', 'Onur', 'Cem', 'Taylan', 'Batu', 'Koray', 'Selim', 'Rüzgar', 'Aras', 'Polat', 'Toprak', 'Atlas',
  ],
  FEMALE: [
    'Ayşe', 'Elif', 'Zeynep', 'Selin', 'Ece', 'Defne', 'Nehir', 'Ela', 'Su', 'Derin', 'Lale', 'İpek', 'Nil', 'Mina', 'Yaren',
    'Asya', 'Duru', 'Eylül', 'Melis', 'Ceren', 'Gizem', 'Damla', 'Irmak', 'Naz', 'Sena', 'Pınar', 'Beren', 'Azra', 'Ada', 'Öykü',
  ],
});

export const SURNAMES = Object.freeze([
  'Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan',
  'Kılıç', 'Aslan', 'Çetin', 'Kara', 'Koç', 'Kurt', 'Özdemir', 'Polat', 'Ateş', 'Bulut',
]);
