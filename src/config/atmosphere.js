import { DAY, HOUR } from './time.js';

/**
 * Atmosfer modeli. Gezegen Dünya'nın küçültülmüş hâlidir: fizik Dünya ölçeğinde hesaplanır
 * (rüzgâr m/s, basınç hPa, enerji W/m²), harita metresi EARTH_SCALE ile Dünya metresine çevrilir.
 */
export const ATMOSPHERE = Object.freeze({
  COLS: 128, // ızgara: her hücre ~2 km (Dünya ölçeğinde ~310 km)
  ROWS: 64,
  STEP: 1 * HOUR, // modelin adımı
  SPIN_UP: 360 * DAY, // açılışta model bu kadar önceden çalıştırılır (mevsimler yerine otursun)
  SPIN_UP_STEP: 1 * DAY,
  EARTH_CIRCUMFERENCE: 40_075_000, // m

  // ---------- Güneş ----------
  SOLAR_CONSTANT: 1361, // W/m² (Dünya'nın; gezegen ayarlarındaki güneş gücüyle çarpılır)
  EQUINOX_DAY: 19, // yılın kaçıncı günü ilkbahar ılımı (takvim 1 Mart'ta başlar → 20 Mart)

  // ---------- Işınım (Budyko türü enerji dengesi) ----------
  OLR_A: 190, // W/m²: uzaya giden ışınım = A + B·T − bulut örtüsü etkisi
  OLR_B: 3.0, // W/m²/°C: ısınan yer daha çok ışır (bulutsuz bölgede küresel ortalamadan güçlü)
  CLOUD_GREENHOUSE: 30, // W/m²: tam bulut örtüsünün geri tuttuğu ışınım (bulutlu gece ılık geçer)
  DRY_AIR_COOLING: 20, // W/m²: kuru havanın fazladan soğuması (çölde geceler soğuk)
  CLEAR_SKY_ALBEDO: 0.08, // havanın kendi yansıtması
  CLOUD_ALBEDO: 0.35,
  ALBEDO: Object.freeze({ SEA: 0.06, LAND: 0.2, SNOW: 0.7, ICE: 0.6, SEA_ICE: 0.5 }),

  // ---------- Isı sığası (J/m²/°C): kara çabuk ısınıp soğur, deniz yavaş ----------
  CAPACITY: Object.freeze({ LAND: 2.0e6, SEA: 1.2e8, ICE: 4e6, AIR: 1e7 }),
  SEA_FREEZE: -1.8, // °C: deniz buzlanır
  LAPSE_RATE: 0.0065, // °C/m: yükseldikçe soğuma
  HEAT_DIFFUSION: 1.0e6, // m²/s: girdapların ısıyı yayması (ekvatordan kutba taşınım)
  HEAT_EXCHANGE: 400, // W/m²: üstünden geçen havanın yüzeyle alıp verebileceği en fazla ısı
  DAILY_MEMORY: 1 * DAY, // günlük ortalama sıcaklığın belleği

  // ---------- Rüzgâr ----------
  ROTATION: 7.292e-5, // rad/s: gezegenin dönüşü (Coriolis)
  FRICTION: Object.freeze({ LAND: 3e-5, SEA: 1.5e-5 }), // 1/s: yüzey sürtünmesi
  THERMAL_PRESSURE: 18, // (m²/s²)/°C: sıcak hava alçak basınç yapar
  MAX_THERMAL_WIND: 12, // m/s
  MAX_WIND: 45, // m/s
  ITCZ_SHIFT: 0.45, // dönence altı kuşakları güneşi bu oranda izler
  // genel dolaşım (yüzey): alize, batı rüzgârları, kutup doğu rüzgârları (m/s, doğu +)
  TRADES: -6,
  WESTERLIES: 8,
  POLAR_EASTERLIES: -3,
  HADLEY_INFLOW: 2, // m/s: alizelerin ekvatora doğru bileşeni
  FERREL_OUTFLOW: 1,
  POLAR_INFLOW: 0.7,

  // ---------- Basınç sistemleri ----------
  AIR_DENSITY: 1.2, // kg/m³
  CYCLONE: Object.freeze({ PER_DAY: 1.4, LATITUDE: [35, 65], DEPTH: [12, 32], RADIUS: [800e3, 1400e3], LIFE: [3, 7], DRIFT: 1.15, POLEWARD: 1.5 }),
  ANTICYCLONE: Object.freeze({ PER_DAY: 0.5, LATITUDE: [25, 50], DEPTH: [6, 16], RADIUS: [1200e3, 2000e3], LIFE: [4, 9], DRIFT: 0.6, POLEWARD: 0 }),
  HURRICANE: Object.freeze({ PER_DAY: 0.15, LATITUDE: [8, 20], DEPTH: [30, 70], RADIUS: [500e3, 800e3], LIFE: [5, 10], DRIFT: 1, POLEWARD: 2.5, SEA_TEMPERATURE: 26.5 }),

  // ---------- Nem ve bulut ----------
  COLUMN_MASS: 3000, // kg/m²: nemin taşındığı hava kütlesi (q=0,01 → 30 mm yağışa dönüşebilir su)
  EVAPORATION_TIME: 2 * DAY, // denizin havayı doyurma süresi (rüzgârla kısalır)
  CONDENSATION_TIME: 1 * HOUR,
  CLOUD_EVAPORATION_TIME: 4 * HOUR,
  RAIN_THRESHOLD: 8e-5, // kg/kg: bulut suyu bunu aşınca yağar (~0,25 kg/m² sıvı su)
  RAIN_TIME: 1.5 * HOUR,
  CLOUD_WATER_SCALE: 3e-5, // bulut örtüsü = 1 − e^(−su/ölçek) (~0,1 kg/m² sıvı su örter)
  SATURATION: 0.98, // yükselme yokken yoğuşmanın başladığı bağıl nem
  LIFT_SATURATION: 0.25, // güçlü yükselmede bağıl nem eşiğinin düşüşü
  CONVERGENCE_LIFT: 3e5, // s: yakınsama (1/s) → yükselme ölçüsü
  OROGRAPHIC_LIFT: 0.04, // m/s: bu dikey hız tam yükselme sayılır
  CONVECTION_START: 2.5, // °C: öğleden sonra karanın günlük ortalamayı bu kadar aşması kümülüs başlatır
  CONVECTION_RANGE: 6,
  SNOW_BELOW: 0.5, // °C: bundan soğukta yağış kar
  RAIN_ABOVE: 2.5,
  LATENT_HEAT: 2.5e6, // J/kg
  AIR_HEAT: 1004, // J/kg/°C
  // sayısal güvenlik sınırları (gerçekte ulaşılmaz)
  THETA_RANGE: Object.freeze([-90, 60]),
  MAX_CLOUD_WATER: 3e-3,
  LIFT_RANGE: Object.freeze([-1, 2]),

  // ---------- Yer: kar ve toprak nemi ----------
  SNOW_MELT: 3, // mm/gün/°C: kar erimesi
  SNOW_DEPTH_SCALE: 15, // mm su: örtü = 1 − e^(−kar/ölçek)
  SOIL_CAPACITY: 150, // mm
  SOIL_EVAPORATION: 0.35, // ıslak topraktan buharlaşmanın denize oranı (bitkiler terler)
});
