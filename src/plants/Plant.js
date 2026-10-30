import { lerp } from '../core/MathUtils.js';
import { Genome } from '../genetics/Genome.js';
import { FoodSource } from '../world/FoodSource.js';

const SEEDLING_SCALE = 0.25; // fidanın görünen boyu (yetişkinin oranı)
const WILD_MATURE_SHARE = 0.85; // harita üretilirken bitkilerin bu kadarı yetişkin olur

/**
 * Büyüyen, yaşlanan ve tohumla çoğalan bitki (soyut). Tür ayrıntıları alt sınıfın
 * statik SPECIES profilinden gelir:
 * - name, layer: parçadaki liste adı ('trees' | 'bushes' | 'grass'), genes
 * - radius [min, max] (boy geni), maturity: yetişme süresi (yıl, büyüme geni hızlandırır)
 * - lifespan [min, max] yıl (ömür geni), mortality { seedling, adult, old } yıllık ölüm olasılığı
 * - seedsPerYear (tohum verimi geni), seedSeasons, seedRadius, pollenRadius, spacing, waterMargin
 * - germination(world, x, y): tohumun o noktada tutma olasılığı (biyom)
 * Ortak genler: vigor (büyüme hızı), stature (boy), fertility (tohum), longevity (ömür).
 * Yiyecek verimi alt sınıfta `yieldCapacity()` ile tanımlanır.
 */
export class Plant extends FoodSource {
  constructor(x, y, { genome, growth = 1, ageYears = 0, food = null, regrowTime = Infinity }) {
    super(x, y, { capacity: 0, regrowTime, food });
    if (new.target === Plant) throw new Error('Plant soyut bir sınıftır');
    this.genome = genome;
    this.growth = growth; // 0 = tohumdan yeni çıkmış, 1 = yetişkin
    this.ageYears = ageYears;
    this.dead = false;
    this.radius = 0;
    this.mortalityScale = 1; // insanın baktığı bitkide 1'in altında
  }

  /** Haritayla birlikte üretilen bitki: rastgele genler, çoğunlukla yetişkin. */
  static createWild(x, y, rng, extra = {}) {
    const mature = rng.chance(WILD_MATURE_SHARE);
    const plant = new this(x, y, { genome: Genome.random(this.SPECIES.genes, rng), growth: mature ? 1 : rng.range(0.1, 1), ...extra });
    plant.ageYears = mature ? rng.range(plant.maturityYears, plant.lifespan * 0.8) : plant.growth * plant.maturityYears;
    plant.refresh();
    return plant;
  }

  /** Tohumdan çıkan fide: genler anneden ve tozlayan babadan gelir. */
  static sprout(x, y, mother, father, rng) {
    const plant = new this(x, y, { genome: Genome.inherit(mother.genome, father?.genome, rng), growth: 0, ...this.inheritedFrom(mother) });
    plant.refresh();
    return plant;
  }

  /** İnsanın ektiği tohumdan çıkan fide; bakımı (`care` 0..1) ölümünü azaltır. */
  static sow(x, y, rng, care) {
    const plant = new this(x, y, { genome: Genome.random(this.SPECIES.genes, rng), growth: 0, ...this.sownOptions() });
    plant.mortalityScale = 1 - care;
    plant.touched = true;
    plant.refresh();
    return plant;
  }

  /** Ekilen tohumun taşıdığı özellikler (ör. meyve çekirdeğinden meyveli ağaç). */
  static sownOptions() {
    return {};
  }

  /** Genden bağımsız, doğrudan anneden geçen özellikler (ör. meyveli ağaç). */
  static inheritedFrom(_mother) {
    return {};
  }

  get species() {
    return this.constructor.SPECIES;
  }

  get displayName() {
    return this.species.name;
  }

  /** Otlayan hayvan için değeri (otlanmayan bitkide 0). */
  get forage() {
    return 0;
  }

  get alive() {
    return !this.dead;
  }

  get isMature() {
    return this.growth >= 1;
  }

  get maturityYears() {
    return this.species.maturity / this.genome.scale('vigor', 0.7, 1.3);
  }

  get lifespan() {
    const [min, max] = this.species.lifespan;
    return this.genome.scale('longevity', min, max);
  }

  get seedsPerYear() {
    return this.species.seedsPerYear * this.genome.scale('fertility', 0.5, 1.5);
  }

  /** Yıllık ölüm olasılığı: fide kırılgandır, ömrünü aşan bitki hızla kurur. */
  get mortality() {
    const { seedling, adult, old } = this.species.mortality;
    return ((this.isMature ? adult : seedling) + (this.ageYears > this.lifespan ? old : 0)) * this.mortalityScale;
  }

  /** Yetişkinken verdiği yiyecek porsiyonu (yoksa 0). */
  yieldCapacity() {
    return 0;
  }

  /** `growthYears` büyüme süresi ve `years` takvim süresi geçti. Görünüm değiştiyse true. */
  grow(growthYears, years) {
    this.ageYears += years;
    if (this.isMature || growthYears <= 0) return false;
    this.growth = Math.min(1, this.growth + growthYears / this.maturityYears);
    this.refresh();
    return true;
  }

  /** Hayvanların yemesi: büyümeyi geri alır, kök kaldığı için bitki ölmez. Yenen miktarı döndürür. */
  browse(amount, minGrowth) {
    const eaten = Math.max(0, Math.min(amount, this.growth - minGrowth));
    if (eaten > 0) {
      this.growth -= eaten;
      this.refresh();
    }
    return eaten;
  }

  die() {
    this.dead = true;
    this.capacity = 0;
  }

  /** Boy ve yiyecek verimini büyümeye göre yeniden hesaplar. */
  refresh() {
    const [min, max] = this.species.radius;
    this.radius = this.genome.scale('stature', min, max) * lerp(SEEDLING_SCALE, 1, this.growth);
    const capacity = this.isMature && !this.dead ? Math.round(this.yieldCapacity()) : 0;
    if (capacity !== this.capacity) {
      this.capacity = capacity;
      this.portionsAtHarvest = Math.min(this.portionsAtHarvest, capacity);
    }
  }
}
