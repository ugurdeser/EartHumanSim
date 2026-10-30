import { CONFLICT, LAWS } from '../../config.js';

const weight = (member, drive) => member.drives.get(drive).weight;

/**
 * Bir topluluğun oylayabileceği konular. Her konunun seçenekleri vardır; ilk seçenek
 * başlangıç düzenidir. `opinion(üye)` üyenin seçeneği ne kadar benimsediğidir (oyunu belirler).
 * Diğer alanları seçeneğin etkisidir. Yeni yasa: buraya bir kayıt, etkisi kullanıldığı yerde.
 */
const law = (id, name, options) => Object.freeze({ id, name, options: Object.freeze(options.map(Object.freeze)) });

export const Laws = Object.freeze({
  THEFT: law('theft', 'Hırsızlık', [
    { id: 'graduated', name: 'Önce uyarı, sonra ceza, sonra sürgün', fineFrom: CONFLICT.FINE_OFFENSES, exileFrom: CONFLICT.EXILE_OFFENSES, deterrence: 1, opinion: () => LAWS.NEUTRAL },
    { id: 'lenient', name: 'Hoşgörü: yalnızca yiyecek cezası', fineFrom: CONFLICT.FINE_OFFENSES, exileFrom: Infinity, deterrence: 1.5, opinion: (m) => (weight(m, 'affiliation') + weight(m, 'nurture')) / 2 - weight(m, 'justice') / 2 + LAWS.NEUTRAL / 2 },
    { id: 'strict', name: 'İlk suçta sürgün', fineFrom: 1, exileFrom: 1, deterrence: 0.3, opinion: (m) => (weight(m, 'justice') + weight(m, 'hoarding')) / 2 },
  ]),
  FOOD: law('food', 'Yiyecek', [
    { id: 'private', name: 'Herkes kendi deposuna', dues: 0, opinion: (m) => weight(m, 'hoarding') * 0.8 },
    { id: 'tithe', name: 'Vergi: stoğun bir kısmı ortak', dues: LAWS.TITHE_RATE, opinion: () => LAWS.NEUTRAL },
    { id: 'common', name: 'Ortak depo: fazlası bölüşülür', dues: LAWS.COMMON_RATE, opinion: (m) => (weight(m, 'affiliation') + weight(m, 'nurture')) / 2 },
  ]),
  SUCCESSION: law('succession', 'Liderlik', [
    { id: 'election', name: 'Seçim', opinion: () => LAWS.NEUTRAL },
    { id: 'hereditary', name: 'Kurucuların soyundan', opinion: (m) => weight(m, 'status') * 0.8 },
    { id: 'elders', name: 'En yaşlı üye', opinion: (m) => (m.ageYears >= LAWS.ELDER_AGE ? 1.2 : 0.4) },
  ]),
  WORK: law('work', 'Çalışma', [
    { id: 'duty', name: 'Emre uymak zorunlu', shamesShirkers: true, opinion: () => LAWS.NEUTRAL },
    { id: 'voluntary', name: 'Çalışmak gönüllü', shamesShirkers: false, opinion: (m) => (weight(m, 'play') + weight(m, 'comfort')) / 2 },
  ]),
  MARRIAGE: law('marriage', 'Evlilik', [
    { id: 'open', name: 'Serbest', opinion: () => LAWS.NEUTRAL },
    { id: 'within', name: 'Yalnızca topluluk içinden', opinion: (m) => weight(m, 'affiliation') * 0.8 },
  ]),
  STRANGERS: law('strangers', 'Yabancılar', [
    { id: 'open', name: 'Herkese açık', opinion: () => LAWS.NEUTRAL },
    { id: 'closed', name: 'Topluluk kapalı', opinion: (m) => (weight(m, 'fear') + weight(m, 'disgust')) / 2 },
  ]),
  RAIDS: law('raids', 'Baskın', [
    { id: 'allowed', name: 'Kıtlıkta serbest', opinion: () => LAWS.NEUTRAL },
    { id: 'forbidden', name: 'Yasak', opinion: (m) => (weight(m, 'justice') + weight(m, 'affiliation')) / 2 },
  ]),
});

export const ALL_LAWS = Object.freeze(Object.values(Laws));
