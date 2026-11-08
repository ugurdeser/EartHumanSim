import { ATMOSPHERE, DAY } from '../../config.js';
import { Calendar } from '../../core/Calendar.js';

const RAD = Math.PI / 180;

/**
 * Güneşin gökteki yeri. Eksen eğik olduğundan güneş yazın kuzeye, kışın güneye kayar:
 * mevsimler buradan doğar ve iki yarıkürede terstir.
 */
export class Sun {
  /** Güneşin dik geldiği enlem (radyan). `obliquity`: eksen eğikliği (derece). */
  static declination(time, obliquity) {
    const day = (time % Calendar.yearLength) / DAY;
    return obliquity * RAD * Math.sin((2 * Math.PI * (day - ATMOSPHERE.EQUINOX_DAY)) / (Calendar.yearLength / DAY));
  }

  /** Güneşin yüksekliğinin sinüsü (ufkun altındaysa negatif). `hourAngle`: yerel öğlenden açı. */
  static elevation(sinLat, cosLat, sinDec, cosDec, hourAngle) {
    return sinLat * sinDec + cosLat * cosDec * Math.cos(hourAngle);
  }

  /** Günlük ortalama (24 saat) güneş yüksekliği çarpanı: uzun adımlarda gece-gündüz yerine. */
  static dailyMean(sinLat, cosLat, sinDec, cosDec) {
    const tanProduct = (sinLat / Math.max(1e-6, cosLat)) * (sinDec / Math.max(1e-6, cosDec));
    const sunset = Math.acos(Math.max(-1, Math.min(1, -tanProduct))); // 0: kutup gecesi, π: kutup günü
    return (sunset * sinLat * sinDec + cosLat * cosDec * Math.sin(sunset)) / Math.PI;
  }
}
