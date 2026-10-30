import { CALENDAR } from './simulation.js';
import { DAY, HOUR } from './time.js';

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
