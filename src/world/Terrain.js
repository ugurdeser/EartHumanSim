import { PLANET } from '../config.js';
import { clamp01, lerp, smoothstep } from '../core/MathUtils.js';
import { Planet, seamless, wrapDelta, wrapX } from '../core/Planet.js';
import { ValueNoise } from '../core/ValueNoise.js';
import { Vector2 } from '../core/Vector2.js';
import { DetailNoise } from './DetailNoise.js';
import { PlanetSettings } from './PlanetSettings.js';

const COLS = 1260; // kıta ızgarasının doğu-batı hücre sayısı (küçük gezegende 200 m; boyla büyür)
const START_SAMPLES = 126; // başlangıç yeri ılıman enlem boyunca bu kadar noktada aranır
const START_RING = 12; // kıyı kontrolünde çevredeki örnek sayısı
const LAND_RISE = 0.2; // kıyıdan bu kadar yükselince tam iç kesim sayılır
const BELT_SCALE = 30000; // m (küçük gezegende, boyla büyür): dağ kuşaklarının genişliği
const RIDGE_SCALE = 6000; // m: sırtlar arası uzaklık (her boyda gerçek ölçü)
const HILL_SCALE = 2500; // m: tepeler arası uzaklık
const HILL_SHARE = 0.14; // tepelerin en yüksek dağa oranı
const SLOPE_SPREAD = 320; // m: eğim bu kadar ötedeki yüksekliklerden ölçülür
const CONTINENT_OCTAVES = 5;
const COAST_FINEST = 250; // m: kıyı girintilerinin en küçüğü
const COAST_SHARE = 0.032; // kıta gürültüsünün ızgaranın çözemediği ince katlarının toplam payı
const SEED_SALT = Object.freeze({ COAST: 0x1c0a57, RIDGE: 0x2b1d6e, HILL: 0x3e11f0 });

/** Yükselti hesabının ayrıntısı: 1 yakından (sırtlar, tepeler, kıyı girintileri), 0 uzaktan (ortalaması). */
export const FULL_DETAIL = 1;

export const Surface = Object.freeze({ LAND: 0, SEA: 1, ICE: 2 });

/**
 * Gezegenin yüzeyi: kara, deniz ve kutup buzulları; gezegen ayarlarına göre (boy, deniz oranı,
 * kıtaların boyu, dağlık, buzullar). Kıtalar ve dağ kuşakları gezegenin boyuyla büyüyen bir ızgarada
 * bir kez hesaplanır; sırtlar, tepeler ve kıyıların ince girintileri her boyda gerçek ölçüsünde,
 * sorgulanan noktada hesaplanır (gerçek boyda ızgara hücresi ~32 km'dir, ayrıntıyı tutamaz).
 * Başlangıç yeri ayarlarda seçilmişse (ve karaysa) orasıdır, değilse ılıman kuşakta bulunur.
 */
export class Terrain {
  /** `cols`: ızgaranın sıklığı; başlangıç ekranının önizlemesi kabasıyla hızlı üretir. */
  constructor(rng, planet = new PlanetSettings({ seed: rng.seed }), { cols = COLS } = {}) {
    this.planet = planet;
    this.width = Planet.width;
    this.height = Planet.height;
    this.cols = cols;
    this.cell = this.width / cols;
    this.rows = Math.ceil(this.height / this.cell) + 1;
    this.heights = new Float32Array(this.cols * this.rows); // kıtaların gürültüsü (deniz seviyesine göre)
    this.belts = new Float32Array(this.cols * this.rows); // dağ kuşağının gücü (0..1)
    this.icePhase = [rng.angle(), rng.angle()];
    this.iceWobble = PLANET.ICE_WOBBLE * Planet.scale;
    this.iceMargin = planet.iceMargin; // m: kutup buzulunun genişliği (her sorguda ayardan okunmasın)
    this.#build(rng);
    this.#buildDetail(rng);
    this.start = this.#chosenStart() ?? this.#findStart();
    this.#buildBelts(rng);
    this.#measureDetail();
  }

  /** Ayarlarda seçilen yer, karaysa. */
  #chosenStart() {
    const start = this.planet.start;
    if (!start || this.surfaceAt(start.x, start.y) !== Surface.LAND) return null;
    return new Vector2(start.x, start.y);
  }



  #build(rng) {
    const noise = new ValueNoise(rng);
    const scale = this.planet.continentScale;
    const { cell } = this;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const y = row * cell;
        this.heights[row * this.cols + col] = seamless(col * cell, (x) => noise.fractal(x / scale, y / scale, CONTINENT_OCTAVES));
      }
    }
    this.seaLevel = Float32Array.from(this.heights).sort()[Math.floor(this.heights.length * this.planet.seaShare)];
  }

  /**
   * Izgaranın tutamadığı ince ayrıntı: kıta gürültüsünün devamı olan kıyı girintileri (en kabası
   * kıta gürültüsünün en ince katının yarısı), sırtlar ve tepeler.
   */
  #buildDetail(rng) {
    const seed = rng.int(0, 0x7fffffff);
    const coarsest = this.planet.continentScale / 2 ** CONTINENT_OCTAVES;
    const coastOctaves = Math.max(0, Math.ceil(Math.log2(coarsest / COAST_FINEST)));
    this.coast = coastOctaves > 0 ? new DetailNoise(seed ^ SEED_SALT.COAST, this.width, coarsest, coastOctaves) : null;
    this.ridges = new DetailNoise(seed ^ SEED_SALT.RIDGE, this.width, RIDGE_SCALE, 4);
    this.hills = new DetailNoise(seed ^ SEED_SALT.HILL, this.width, HILL_SCALE, 3);
  }

  /** Dağ kuşakları: kıtalarla birlikte büyüyen geniş şeritler. */
  #buildBelts(rng) {
    const noise = new ValueNoise(rng);
    const [beltFrom, beltTo] = this.planet.mountainBelt;
    const scale = BELT_SCALE * Planet.scale;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const y = row * this.cell;
        this.belts[row * this.cols + col] = smoothstep(beltFrom, beltTo, seamless(col * this.cell, (at) => noise.fractal(at / scale, y / scale, 2)));
      }
    }
  }

  /** Uzaktan bakışta sırtların ve tepelerin ortalaması (ayrıntı silinince yerine geçer). */
  #measureDetail() {
    let ridges = 0;
    let hills = 0;
    const n = 4096;
    for (let i = 0; i < n; i++) {
      const x = ((i * 0.618034) % 1) * this.width;
      const y = (i / n) * this.height;
      ridges += Terrain.#ridge(this.ridges.at(x, y)) ** 2;
      hills += this.hills.at(x, y);
    }
    this.ridgeMean = ridges / n;
    this.hillMean = hills / n;
  }

  /**
   * Bir örneğin kapladığı alana (m) göre ayrıntının payı: tepelerden küçük örnekte tam, sırtlardan
   * epey büyük örnekte sıfır (uzaktan bakışta tek tek sırtlar seçilmez, kumlanma olmasın).
   */
  static detailFor(footprint) {
    return 1 - smoothstep(HILL_SCALE / 2, RIDGE_SCALE * 2, footprint);
  }

  /** Ayrıntının ölçüleri: ekran kartı aynı gürültüyü aynı değerlerle hesaplar. */
  get detailShape() {
    return { landRise: LAND_RISE, hillShare: HILL_SHARE, coastShare: COAST_SHARE, startLand: PLANET.START_LAND };
  }

  static #ridge(n) {
    return 1 - Math.abs(2 * n - 1);
  }

  /** Ilıman enlemde, çevresi en geniş karayla çevrili kıta içi nokta. */
  #findStart() {
    const y = (0.5 - PLANET.START_LATITUDE / 180) * this.height;
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < START_SAMPLES; i++) {
      const x = (i / START_SAMPLES) * this.width;
      const score = this.#lowestAround(x, y);
      if (score > bestScore) {
        best = x;
        bestScore = score;
      }
    }
    return new Vector2(best, y);
  }

  #lowestAround(x, y) {
    let lowest = this.heightAt(x, y);
    for (let radius = PLANET.START_LAND / 2; radius <= PLANET.START_LAND; radius += PLANET.START_LAND / 2) {
      for (let i = 0; i < START_RING; i++) {
        const angle = (i / START_RING) * Math.PI * 2;
        lowest = Math.min(lowest, this.heightAt(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius));
      }
    }
    return lowest;
  }

  /** Kıta ızgarasının hücre kenarı (m). */
  get cellSize() {
    return this.cell;
  }

  /** Eğimin ölçüldüğü uzaklık (m). */
  get slopeSpread() {
    return SLOPE_SPREAD;
  }

  /** Kıtaların yüksekliği (deniz seviyesiyle karşılaştırılır); ayrıntı 0 iken kıyı girintisiz. */
  heightAt(x, y, detail = FULL_DETAIL) {
    const base = this.#sample(this.heights, x, y);
    if (!this.coast || detail <= 0) return base;
    return base + (this.coast.at(wrapX(x), y) - 0.5) * 2 * COAST_SHARE * detail;
  }

  /** İlk insanlar dağda başlamaz: başlangıcın çevresinde dağ kuşağı söner. */
  #openness(x, y) {
    const fromStart = Math.hypot(wrapDelta(x - this.start.x), y - this.start.y);
    return smoothstep(PLANET.START_LAND * 0.6, PLANET.START_LAND * 1.2, fromStart);
  }

  /**
   * Karanın yüksekliği (0: kıyı, 1: en yüksek sırt): geniş kuşaklar boyunca sırtlar, her yerde alçak
   * tepeler. Deniz ve buzul düzdür. `detail` 0 iken sırtlar ve tepeler ortalamalarıyla yer alır.
   */
  elevationAt(x, y, detail = FULL_DETAIL) {
    const inland = clamp01((this.heightAt(x, y, detail) - this.seaLevel) / LAND_RISE);
    if (inland <= 0 || this.#isIce(x, y)) return 0;
    const at = wrapX(x);
    const ridge = detail > 0 ? lerp(this.ridgeMean, Terrain.#ridge(this.ridges.at(at, y)) ** 2, detail) : this.ridgeMean;
    const hills = detail > 0 ? lerp(this.hillMean, this.hills.at(at, y), detail) : this.hillMean;
    const belt = this.#openness(x, y) * this.#sample(this.belts, x, y);
    return smoothstep(0, 0.5, inland) * (belt * ridge + hills * HILL_SHARE);
  }

  /** Yükselmenin doğuya ve güneye doğru hızı (yükselti/m); uzaktan bakışta daha geniş ölçülür. */
  gradientAt(x, y, detail = FULL_DETAIL, spread = SLOPE_SPREAD) {
    return {
      east: (this.elevationAt(x + spread, y, detail) - this.elevationAt(x - spread, y, detail)) / (spread * 2),
      south: (this.elevationAt(x, y + spread, detail) - this.elevationAt(x, y - spread, detail)) / (spread * 2),
    };
  }

  #sample(field, x, y) {
    const u = wrapX(x) / this.cell;
    const v = Math.min(this.rows - 1.001, Math.max(0, y / this.cell));
    const col = Math.min(this.cols - 1, Math.floor(u));
    const row = Math.floor(v);
    const next = col + 1 === this.cols ? 0 : col + 1;
    const top = lerp(field[row * this.cols + col], field[row * this.cols + next], u - col);
    const bottom = lerp(field[(row + 1) * this.cols + col], field[(row + 1) * this.cols + next], u - col);
    return lerp(top, bottom, v - row);
  }

  #isIce(x, y) {
    const angle = (x / this.width) * Math.PI * 2;
    const [a, b] = this.icePhase;
    const wobble = (Math.sin(angle * 3 + a) + Math.sin(angle * 7 + b) * 0.5) * this.iceWobble;
    return Math.min(y, this.height - y) < this.iceMargin + wobble;
  }

  surfaceAt(x, y, detail = FULL_DETAIL) {
    if (this.#isIce(x, y)) return Surface.ICE;
    return this.heightAt(x, y, detail) < this.seaLevel ? Surface.SEA : Surface.LAND;
  }

  isLand(x, y) {
    return this.surfaceAt(x, y) === Surface.LAND;
  }
}
