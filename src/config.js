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
  INFANT_AGE: 2, // bu yaşa kadar hep annesiyle (annesi yoksa evde)
  DAYCARE_AGE: 3, // bundan önce evde ya da annesinin yanında, sonra gündüz bakıcıda
  SELF_CARE_AGE: 10, // bu yaşa kadar bakılır, sonra topluluk ve ev işlerine yardım eder
  CONFINEMENT_YEARS: 1, // doğum yapan kadın bu süre iş yapmaz; yalnızca su ve yiyecek için çıkar
  INFANT_ROAM: 3, // annesiz bebeğin ev içinde gezdiği alan (m)
  TODDLER_ROAM: [15, 150], // INFANT_AGE'den SELF_CARE_AGE'e evin çevresinde gezme alanı (m)
  CARRIED_WARMTH: 10, // anne kucağının sıcaklığı (°C)
  NURSE_MIN_FOOD: 0.15, // anne bundan açsa emziremez
  NURSE_COST: 1 / (5 * DAY), // emzirmenin annenin tokluğundan saniyede aldığı
  FEMALE_FERTILE_UNTIL: 45,
  PREGNANCY_YEARS: 0.75, // 9 ay = 270 gün
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
  FIRE_KNOWLEDGE_CHANCE: 0.5, // başlangıçta ateş yakmayı bilme olasılığı
});

export const FAMILY = Object.freeze({
  OWN_HOME_DISTANCE: [60, 160],
});

const BUSH_DEFAULTS = Object.freeze({
  RADIUS: [1.2, 2.2],
  MATURITY: 2,
  LIFESPAN: [15, 40],
  SEEDS_PER_YEAR: 2,
  SEED_RADIUS: 15, // kuşlar yemişi taşır
  POLLEN_RADIUS: 40,
  SPACING: 2,
  WATER_MARGIN: 2,
  MORTALITY: { SEEDLING: 0.3, ADULT: 0.03, OLD: 0.5 },
  CAPACITY: 3,
  REGROW: 10 * HOUR,
});

export const PLANTS = Object.freeze({
  // m² başına deneme sayısı; kabul olasılığı biyom gürültüsünden gelir
  TREE_ATTEMPTS: 2.8e-3,
  BUSH_ATTEMPTS: 1.9e-3,
  GRASS_ATTEMPTS: 2.5e-3,
  TREE_CAPACITY: 5,
  TREE_REGROW: 20 * HOUR,
  FRUIT_TREE_RATIO: 0.3,
  WOOD_PER_TREE: 4,
  TICK: 30 * DAY, // her etkin parçanın bitkileri ayda bir topluca hesaplanır
  MAX_CATCH_UP: 1, // yıl: uzun süre etkin olmayan parçada en fazla bu kadarlık çoğalma
  CAPACITY_HEADROOM: 1.25, // parça, ilk bitki sayısının bu katına kadar dolabilir
  MIN_CAPACITY: 2,
  // Türler: yetişme süresi ve ömür yıl cinsinden; tohum/yıl tutma şansı ayrıca biyoma bağlı
  TREE: {
    RADIUS: [2.5, 4.5],
    MATURITY: 12,
    LIFESPAN: [60, 200],
    SEEDS_PER_YEAR: 3,
    SEED_RADIUS: 25,
    POLLEN_RADIUS: 80,
    SPACING: 3,
    WATER_MARGIN: 3,
    MORTALITY: { SEEDLING: 0.3, ADULT: 0.01, OLD: 0.5 }, // yıllık ölüm olasılığı
  },
  BUSH: BUSH_DEFAULTS,
  BUSHES: {
    BLUEBERRY: { ...BUSH_DEFAULTS, RADIUS: [1, 1.6], MATURITY: 3, LIFESPAN: [25, 50], CAPACITY: 3 },
    STRAWBERRY: {
      ...BUSH_DEFAULTS,
      RADIUS: [0.6, 1],
      MATURITY: 1,
      LIFESPAN: [4, 8],
      SEEDS_PER_YEAR: 4,
      SEED_RADIUS: 8, // sürgünleriyle yakına yayılır
      SPACING: 1,
      MORTALITY: { SEEDLING: 0.3, ADULT: 0.08, OLD: 0.5 },
      CAPACITY: 2,
      REGROW: 8 * HOUR,
    },
    BLACKBERRY: { ...BUSH_DEFAULTS, RADIUS: [1.6, 2.4], MATURITY: 2, LIFESPAN: [10, 25], SEEDS_PER_YEAR: 3, CAPACITY: 4 },
    RASPBERRY: { ...BUSH_DEFAULTS, RADIUS: [1.2, 1.8], MATURITY: 2, LIFESPAN: [8, 15], CAPACITY: 3, REGROW: 8 * HOUR },
  },
  GRASS: {
    RADIUS: [0.8, 1.5],
    MATURITY: 0.1,
    LIFESPAN: [3, 8],
    SEEDS_PER_YEAR: 4,
    SEED_RADIUS: 10,
    POLLEN_RADIUS: 30,
    SPACING: 1,
    WATER_MARGIN: 1,
    MORTALITY: { SEEDLING: 0.4, ADULT: 0.05, OLD: 0.6 },
    GRAZE_PER_FOOD: 1, // hayvanın 1 birim tokluğu kaç öbek-büyüklüğü ot yer
    GRAZE_REACH: 8, // m: hayvanın yediği öbekler
    MIN_GROWTH: 0.05, // yenen ot kökünden yeniden büyür
  },
});

export const FEATURES = Object.freeze({
  // km² başına adet
  POND_DENSITY: 0.4,
  DIRTY_POND_RATIO: 0.25,
  STONE_MINE_DENSITY: 0.25,
  FLINT_MINE_DENSITY: 0.1,
  CLAY_MINE_DENSITY: 0.2,
  HILLSIDE_DENSITY: 0.3, // yamaç: hayvanların kışın sığındığı korunaklı yer
  RIVER_RADIUS: [7, 15], // m: kaynaktan ağza doğru genişler
  RIVER_WAYPOINT: [500, 1100], // m: nehir başlangıç bölgesine bu kadar yaklaşır
  RIVER_MEANDER: 450, // m: kıvrım uzunluğu
  RIVER_FISH_EVERY: 8, // her bu kadar parçada bir balıklı nokta
  RIVER_FISH: 2,
});

export const ANIMALS = Object.freeze({
  WOLF: {
    SPAWN_CHANCE: 0.02, // ormanlık parça başına
    PACK_SIZE: [2, 4],
    MAX_PACK: 8,
    ROAM_SPEED: 1.2,
    CHASE_SPEED: 4.5,
    DETECT_RADIUS: 100,
    CHASE_TIME: 75,
    ATTACK_DAMAGE: 0.3,
    COOLDOWN: 12 * HOUR,
    GROUP_DETERRENCE: 2,
    MEAT: 3,
    HIDE: 1,
    MIN_POPULATION: 3, // azalırsa insanlardan uzak ormanlarda yeni sürü belirir
    ADULT_AGE: 1.5,
    OLD_AGE: 9,
    OLD_AGE_RISK: 0.3,
    WILD_AGE: [2, 6],
    FOOD_DURATION: 6 * DAY,
    WATER_DURATION: 2 * DAY,
    STARVATION_TIME: 8 * DAY,
    FREEZING_TIME: 5 * DAY,
    HEAL_TIME: 4 * DAY,
    COMFORT_TEMPERATURE: -25,
    HUNT_BELOW: 0.5, // tokluk bunun altına inince avlanır
    SMALL_GAME_TIME: 8 * DAY, // av bulamazsa küçük hayvanlarla doyma süresi
    CONCEPTION_CHANCE: 0.03,
    GESTATION_DAYS: 60,
    LACTATION_DAYS: 60,
    LITTER_SIZE: [2, 4],
  },
  SHEEP: {
    SPAWN_CHANCE: 0.015, // çayırlık parça başına sürü
    HERD_SIZE: [4, 8],
    MAX_HERD: 14, // dolu sürüde yeni gebelik olmaz
    WALK_SPEED: 0.6,
    FLEE_SPEED: 3.4,
    FLEE_RADIUS: 25,
    // Yaşam (yıl)
    ADULT_AGE: 1,
    OLD_AGE: 8,
    OLD_AGE_RISK: 0.3, // OLD_AGE'den sonra yıllık ölüm olasılığı
    WILD_AGE: [0.3, 6],
    // İhtiyaçlar
    FOOD_DURATION: 1 * DAY,
    WATER_DURATION: 1.5 * DAY,
    STARVATION_TIME: 4 * DAY,
    FREEZING_TIME: 3 * DAY,
    HEAL_TIME: 5 * DAY,
    COMFORT_TEMPERATURE: 0, // yün ve yamaç bunun altını telafi eder
    GRAZE_TIME: 3 * HOUR, // en iyi otlakta açken doyma süresi
    // Üreme: sonbaharda çiftleşir, ~5 ay gebelik → ilkbaharda kuzular
    CONCEPTION_CHANCE: 0.03, // çiftleşme mevsiminde günlük
    GESTATION_DAYS: 150,
    LACTATION_DAYS: 120,
    LITTER_SIZE: [1, 2],
    // Ürünler
    MEAT: 4,
    HIDE: 1,
    WOOL_PER_YEAR: 6, // tam yapağı (adet)
    WOOL_INSULATION: 15, // tam yapağının sağladığı °C
    MILK_PER_DAY: 1,
  },
  FISH: {
    PER_POND_RADIUS: 10, // her 10 m yarıçap için 1 balık
    RESTOCK_TIME: 60 * DAY, // balığı biten suya komşu sulardan balık gelmesi
    SWIM_SPEED: 0.4,
    THINK_INTERVAL: 120, // balıklar kaç saniyede bir davranışını yeniden seçer
    COARSE_INTERVAL: 10 * MINUTE, // ileri sararken balıklar bu sıklıkta güncellenir
    ADULT_AGE: 1,
    OLD_AGE: 5,
    OLD_AGE_RISK: 0.4,
    WILD_AGE: [0.3, 4],
    FOOD_DURATION: 4 * DAY,
    STARVATION_TIME: 10 * DAY,
    HEAL_TIME: 5 * DAY,
    FEED_TIME: 1 * DAY,
    CONCEPTION_CHANCE: 0.05,
    GESTATION_DAYS: 30, // yumurtadan çıkma
    LITTER_SIZE: [2, 4],
    MATE_RADIUS: 200,
    MEAT: 1,
  },
});

export const WEATHER = Object.freeze({
  FORECAST: 4 * HOUR, // sert hava bu kadar yaklaşınca gökyüzünden anlaşılır
  FORECAST_URGE: 0.7, // yaklaşan havanın sığınma isteğine etkisi
  SNOW_SLOWDOWN: 0.35, // tam kar örtüsünde yürüme yavaşlaması
  SNOW_FORAGE_LOSS: 0.7, // tam kar örtüsünde otlamanın zorlaşması
  SNOW_SIGHT_LOSS: 0.5, // tam kar örtüsünde yiyecek arama menzilinin kısalması
  SNOW_MELT_TIME: 20 * DAY, // 1 °C'de tam örtünün erime süresi
  SNOW_SETTLE_TIME: 30 * DAY, // don altında bile kar yavaş yavaş oturur
  DRY_GROWTH: 0.6, // kuraklıkta bitki büyüme çarpanı
  WET_GROWTH: 1.3, // bol yağışta bitki büyüme çarpanı
  WET_TIME: 2 * HOUR, // sağanakta açıkta sırılsıklam olma süresi
  DRY_TIME: 3 * HOUR, // kuruma süresi (ateş yanında çok daha çabuk)
  WET_CHILL: 8, // sırılsıklam kişinin hissettiği ek soğuk (°C)
});

/** Haritanın üstünde süzülen bulutlar (yalnızca görsel). */
export const CLOUDS = Object.freeze({
  COUNT: 180, // haritadaki bulut sayısı (gökyüzü tam kapalıyken hepsi görünür)
  SIZE: [250, 700], // bulut çapı (m)
  CLEAR_COVER: 0.12, // açık havada da birkaç dağınık bulut
  DRIFT: 30, // sürüklenme hızı (m / gerçek saniye, oyun hızıyla en fazla 10 kat)
  FADE_ZOOM: [0.12, 1.2], // bu zoom aralığında yukarıdan aşağı inerken silikleşir
  MAX_ALPHA: 0.85,
  RAIN_SIZE_BOOST: 0.9, // yağış arttıkça bulutlar büyür ve birbirine karışır
  RAIN_ALPHA_BOOST: 0.15, // yağışta bulutlar daha az saydam
  DARK_SHARE: 0.4, // yağışta koyulaşan bulutların oranı
  OVERCAST_FROM: [0.6, 0.95], // kapalılık bu aralıkta artarken sürekli örtü belirir
  OVERCAST_COVER: 0.9, // yağmurda haritanın kapanan oranı
  STORM_COVER: 0.97, // sağanakta
  OVERCAST_ALPHA: 0.85,
  SHADOW_ALPHA: 0.18, // yere düşen gölge
  SHADOW_OFFSET: 120, // gölgenin buluttan kayması (m)
});

export const FIRE = Object.freeze({
  RADIUS: 15,
  HEAT: 20, // ateş başında hissedilen sıcaklık artışı
  MAX_FUEL: 16 * HOUR,
  LIGHT_TIME: 20 * MINUTE, // sönük ocağı yakmak
  RAIN_BURN: 3, // barınaksız ocak yağışta bu kat daha hızlı söner
  NEIGHBOUR_RANGE: 800, // ateş yakamayan bu mesafedeki komşu ocağına gider
});

export const RELATIONS = Object.freeze({
  AFFINITY_GROWTH: 0.1, // sevgi bu ölçekte artar; arttıkça daha da yavaşlar
  ATTRACTION_GROWTH: 0.35,
});

export const SKILLS = Object.freeze({
  MASTERY_HOURS: 10000, // bir işte tam ustalık için gereken çalışma saati
  JOURNEYMAN_LEVEL: 0.3,
  MASTER_LEVEL: 0.7,
  APPRENTICE_RANGE: 30, // ustanın bu kadar yakınında çalışan çırak olur
  COMMUNITY_APPRENTICE_RANGE: 150, // aynı topluluktaki ustadan daha uzaktan da öğrenilir
  APPRENTICE_RATE: 2, // çırak bu kat hızlı öğrenir
  APPRENTICE_RESPECT: 0.002,
  TEACHING_HOURS: 0.25, // çocuğa bakarken aktarılan deneyim
});

export const CLOTHING = Object.freeze({
  WET_WEAR: 2, // ıslak giysi bu kat hızlı yıpranır
  WORN_WARMTH: 0.5, // tamamen eskimiş giysi korumasının bu kadarını sağlar
  CHECK_INTERVAL: 1 * HOUR,
  WET_THRESHOLD: 0.3,
});

export const CONFLICT = Object.freeze({
  FIRST_YEAR: 0.3, // ilk yılın çatışma şiddeti
  PER_YEAR: 0.35, // her yıl bu kadar artar (en çok 1)
  SCAN_INTERVAL: 1 * HOUR,
  QUARREL_RANGE: 25,
  QUARREL_CHANCE: 0.15,
  QUARREL_COOLDOWN: 1 * DAY,
  QUARREL_AFFINITY: 0.12,
  QUARREL_RESPECT: 0.02,
  FRICTION: 0.03, // sohbetin tartışmaya dönme olasılığı
  ESCALATION: 0.5, // tartışmanın kavgaya dönmesi
  HUNGRY: 0.35,
  SCARCITY_TENSION: 0.2,
  RIVAL_TENSION: 0.3,
  JEALOUSY_TENSION: 0.3,
  JEALOUS_ATTRACTION: 0.5,
  PEACEMAKER_RANGE: 30,
  PEACEMAKER_CHANCE: 0.4,
  FIGHT_AFFINITY: 0.25,
  FIGHT_LUCK: 0.4,
  WOUND: [0.1, 0.3],
  MIN_HEALTH: 0.05, // yara tek başına öldürmez
  LETHAL_CHANCE: 0.02, // kavganın ölümle bitmesi
  MURDER_OFFENSES: 2,
  FEUD_AFFINITY: 0.6,
  WITNESS_RANGE: 150,
  FAVOUR_AFFINITY: 0.5, // lider bundan çok sevdiğini kayırır
  UNFAIR_RESPECT: 0.1,
  FAIR_RESPECT: 0.03,
  FINE_OFFENSES: 2,
  FINE_PORTIONS: 5,
  EXILE_OFFENSES: 3,
  THIEF_DISTRUST: 0.05,
  GREED_CHANCE: 0.03, // açgözlünün fırsat kollama olasılığı
  GREED_SCRUPLES: 0.8, // adalet ağırlığı bundan azsa çalabilir
  TEMPTATION_CHANCE: 0.05, // evlinin gözünün dışarı kayması
  TEMPTATION_ATTRACTION: 0.6,
  AFFAIR_CONSENT: 0.4,
  DISCOVERY_CHANCE: 0.3,
  BETRAYAL_AFFINITY: 0.5,
  BETRAYAL_ATTRACTION: 0.4,
  DIVORCE_AFFINITY: -0.1,
  UNREST_INTERVAL: 30 * DAY,
  UNREST_RESPECT: -0.15, // ortalama saygı bunun altına inerse lider devrilir
  SUPPORTER_AFFINITY: 0.3,
  RAID_YEAR: 2, // bu yıldan önce baskın olmaz
  RAID_SHORTAGE: 0.6,
  RAID_RANGE: 3000,
  RAID_PORTIONS: 6,
  DEFEND_RANGE: 40,
});

export const COMMUNITY = Object.freeze({
  MIN_ADULTS: 2, // bundan az yetişkinle lider seçilmez
  FRIEND_AFFINITY: 0.3, // topluluk kurmak ve katılmak için gereken dostluk
  JOIN_RESPECT: -0.1, // lidere saygısı bundan azsa katılmaz
  LEAVE_RESPECT: -0.3, // lidere saygısı bundan azsa ayrılır
  VILLAGE_RADIUS: 300, // köy merkezine bundan uzak kamplar taşınır
  SHARE_INTERVAL: 1 * DAY, // ürünler bu aralıkla bölüşülür
  FOSTER_NURTURE: 0.5, // oy verirken adayın bakma isteğinin ağırlığı
  DAYCARE_RADIUS: 30, // gündüz çocukların köy merkezinde gezdiği alan (m)
  WATCH_RANGE: 200, // çocuk bu kadar yakında çalışan birini izlemeye gider
  WATCH_TIME: 1 * HOUR,
  THIRSTY_WATER: 0.6, // bundan susamış çocuk yanındaki sudan içer
  DAYCARE_SESSION: 2 * HOUR,
  DAYCARE_URGE: 0.6,
  FAMINE_FOOD_PER_HEAD: 2, // kişi başı yiyecek bundan azsa toplulukta kıtlık var
  FAMINE_HUNGER: 0.4, // üyelerin ortalama tokluğu bundan azsa da kıtlık var
  CHILD_SHARE: 0.5, // çocuğun payı, yetişkinin bu katı
  SICK_HEALTH: 0.6, // sağlığı bundan düşük olan emre uymak zorunda değil
  SHIRK_AFFINITY: 0.06, // emre uymayana her üyenin sevgisi bu kadar düşer
  SHIRK_RESPECT: 0.04,
  SHIRK_STATUS: 0.02,
  SHARE_URGE: 0.65, // payını almaya gitme isteği
  HELP_RANGE: 40, // kurt saldırısında yardıma koşma mesafesi
  ALLY_BONUS: 0.1, // yanındaki her silahlı üyenin savunmaya katkısı
  HUNGRY_FOOD: 0.35, // bundan açsa topluluktan yiyecek ister
  HELP_MIN_STOCK: 4, // yardım eden evin elinde en az bu kadar kalmalı
  HELP_PORTIONS: 3,
  ELECTION_INTERVAL: 360 * DAY,
  RETRY_INTERVAL: 5 * DAY,
  ORDER_INTERVAL: 3 * DAY,
  MIN_NEED: 0.15, // eksik bundan azsa emir verilmez
  BONUS_BASE: 0.2, // emir verilen işte hız artışı
  BONUS_LEADERSHIP: 0.4, // tam liderlik becerisinin ek hızı
  LEADERSHIP_HOURS: 6, // lider her kararda bu kadar deneyim kazanır
  DUTY: 0.9, // emre uyma isteğinin gücü
  DUTY_DONE: 0.6, // bir vardiya sonunda azalan baskı
  DUTY_STATUS: 0.02,
  WINTER_WATCH: 60, // kışa bu kadar gün kala lider kışa hazırlanır
  FOOD_PER_HEAD: 8,
  WINTER_FOOD_WEIGHT: 1.3,
  FUEL_PER_HOME: 3 * DAY,
  SUMMER_FUEL_WEIGHT: 0.5,
  MATERIAL_WEIGHT: 0.5,
  STONE_TARGET: 30,
  CLAY_TARGET: 6,
});

export const ROAD = Object.freeze({
  TILE: 10,
  SPEED_BONUS: 1.5,
  TILES_PER_SESSION: 4,
  MAX_LENGTH: 800,
});

export const COLORS = Object.freeze({
  FRUIT: '#f2a33a',
  WATER: '#3a8fd6',
  WATER_DIRTY: '#6f6a2e',
  HOME: '#7a5230',
  FIRE: '#ff7a1a',
  ROAD: '#8f8a80',
  STONE_MINE: '#8a8d91',
  FLINT_MINE: '#3d4552',
  CLAY_MINE: '#b5704a',
  LEADER: '#ffd23f',
  MALE: '#2f7bff',
  FEMALE: '#ff6fb5',
  WOLF: '#3a3a3a',
  SHEEP: '#fbfbf6',
  FISH: '#ff9f43',
  HILLSIDE: 'rgba(122, 98, 70, 0.35)',
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
