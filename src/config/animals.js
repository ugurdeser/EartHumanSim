import { DAY, HOUR, MINUTE } from './time.js';

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
    MAX_SLEEP: 10 * MINUTE, // olay tabanlı zaman: tok kurt en fazla bu kadar kesintisiz uyur
    CAPTURE_CHANCE: 0.001, // yavrusunu alıştırmak binde bir
    TAME_SESSIONS: 120,
    TAME_MIN_SKILL: 0.5,
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
    MAX_SLEEP: 10 * MINUTE, // kovalanınca, avcı yaklaşınca zaten uyanır
    CAPTURE_CHANCE: 0.35,
    TAME_SESSIONS: 20, // ideal koşulda alışması için gereken bakım oturumu
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
    MAX_SLEEP: 30 * MINUTE, // olay tabanlı zaman: en uzun kesintisiz uyku
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

/** Evcilleştirme: fikir kolay öğrenilir, uygulaması pratik ve zaman ister. */
export const DOMESTICATION = Object.freeze({
  SEARCH_RADIUS: 1500, // yakalanacak hayvanın aranacağı uzaklık
  CAPTURE_TIME: 1 * HOUR, // bir yakalama denemesi
  TEND_TIME: 30 * MINUTE, // tutsak hayvanla bir bakım oturumu
  TEND_COOLDOWN: 12 * HOUR, // aynı hayvana yeniden bakmak için bekleme
  ESCAPE_PER_DAY: 0.03, // yeni yakalanan hayvanın günlük kaçma olasılığı (alıştıkça azalır)
  BREEDING_STOCK: 4, // ağılda bundan fazlası kesilebilir
  SLAUGHTER_TIME: 1 * HOUR,
  BASE_YIELD: 0.6, // acemi kesimde alınan ürün oranı
});

export const PEN = Object.freeze({
  OFFSET: 18, // yuvadan uzaklığı (m)
  RADIUS: 12,
  CAPACITY: 12,
  GRAZE_RANGE: 250, // gündüz sürünün otlayabileceği uzaklık
  GUARD_RANGE: 200, // bu kadar yakında insan varken yırtıcı sürüye yaklaşmaz
  SAFE_DISTANCE: 45, // gece bu kadar yakındaki hayvana kurt ulaşamaz
  BUILD_TIME: 4 * HOUR,
});
