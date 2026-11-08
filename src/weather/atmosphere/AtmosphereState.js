import { ATMOSPHERE } from '../../config.js';

/** Doyma nemi (kg/kg): sıcak hava çok daha fazla su buharı taşır (Clausius–Clapeyron). */
export const saturation = (temperature, altitude) => {
  const vapour = 611.2 * Math.exp((17.67 * temperature) / (temperature + 243.5)); // Pa
  const pressure = 101325 * Math.exp(-altitude / 8000);
  return (0.622 * vapour) / pressure;
};

/** Bulut suyundan gökyüzünün kapalı payı. */
export const cloudCover = (water) => 1 - Math.exp(-water / ATMOSPHERE.CLOUD_WATER_SCALE);

/**
 * Atmosferin anlık durumu: her alan bir hücre dizisi.
 * - theta: deniz seviyesine indirgenmiş hava sıcaklığı (°C); yerel sıcaklık = theta − yükselti × düşüş
 * - thetaMean: son bir günün ortalaması (öğleden sonra ısınmayı ölçmek için)
 * - humidity: özgül nem (kg/kg), cloud: bulut suyu (kg/kg), cover: bulut örtüsü (0..1)
 * - windEast / windNorth: yüzey rüzgârı (m/s), pressure: deniz seviyesi basıncı (hPa)
 * - eddyNorth: kuzey rüzgârının genel dolaşım dışındaki kısmı (ısıyı bu taşır; dolaşımın yüzey kolunun
 *   ısısını üst kol geri götürür, o yüzden ısı taşınımında sayılmaz)
 * - lift: yükselme ölçüsü (artı: yükselen, eksi: çöken hava), convection: kümülüs gücü (0..1)
 * - rain / snowfall: yağış (mm/saat), snow: yerdeki kar (mm su), soil: toprak nemi (mm)
 */
export class AtmosphereState {
  static FIELDS = ['theta', 'thetaMean', 'humidity', 'cloud', 'cover', 'windEast', 'windNorth', 'eddyNorth', 'pressure', 'lift', 'convection', 'rain', 'snowfall', 'snow', 'soil', 'seaIce'];

  constructor(size) {
    for (const name of AtmosphereState.FIELDS) this[name] = new Float32Array(size);
    this.scratch = new Float32Array(size); // taşınım ve yayılmada geçici alan
  }
}
