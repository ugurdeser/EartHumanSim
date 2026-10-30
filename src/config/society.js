import { DAY, HOUR } from './time.js';

/** Toplulukların yasa yapması. */
export const LAWS = Object.freeze({
  NEUTRAL: 0.75, // yerleşik düzene varsayılan bağlılık (güdü ağırlıklarıyla karşılaştırılır)
  REVIEW_DAYS: 15, // gündem bu aralıkla gözden geçirilir
  PRESSURE_TO_VOTE: 3, // konunun oylanması için biriken olay ağırlığı
  MIN_VOTERS: 3,
  DISSENT_RESPECT: 0.05, // yasaya karşı olanın lidere saygı kaybı
  REJECTED_STATUS: 0.03, // önerisi reddedilen liderin itibar kaybı
  TITHE_RATE: 0.03, // vergide her gün alınan stok payı
  COMMON_RATE: 0.15, // ortak depoda her gün alınan fazla payı
  ELDER_AGE: 40,
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
  GREED_CHANCE: 0.03, // yiyeceği hiç kalmamış açgözlünün fırsat kollama olasılığı
  GREED_SAME_GROUP: 0.25, // kendi topluluğundan çalma çekincesi
  GREED_RIVAL: 1.5, // rakipten çalmak kolay gelir
  GREED_WITNESS: 0.5, // yakında biri varsa çekinir
  GREED_ABUNDANCE: 0.3, // yakında doğal yiyecek varken çalmaya gerek görmez
  GREED_ABUNDANCE_RANGE: 300,
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
  FUEL_PER_HOME: 15 * DAY,
  SUMMER_FUEL_WEIGHT: 0.5,
  MATERIAL_WEIGHT: 0.5,
  STONE_TARGET: 30,
  CLAY_TARGET: 6,
});
