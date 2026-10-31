import { clamp01, smoothstep } from '../core/MathUtils.js';
import { latitudeOf, wrapDelta } from '../core/Planet.js';

const PEAK_HEIGHT = 500; // m: en yüksek sırt (eğimi belirler)
const LOW_SUN = 0.3; // güneş bundan alçaktayken gölge daha fazla uzamaz
const SHADE = 0.75; // en dik yamacın parlaklık değişimi
const DUSK = 0.1; // güneş bu yükseklikten alçalırken gölge silinir
const SNOW_LINE = 0.62; // ekvatordaki kar çizgisi (yükselti)
const POLAR_DROP = 0.5; // kutba yaklaşırken kar çizgisinin inişi
const SNOW_EDGE = 0.1;

/** Dağ ve tepelerin ışığı: küre de yakın görünüm de yüzeyi aynı hesapla gölgeler. */
export class Hillshade {
  constructor(world) {
    this.world = world;
  }

  /** Yamacın güneşe dönüklüğü: -1 tam gölge, 0 düz zemin, 1 tam aydınlık. */
  lightAt(x, y) {
    const { terrain, width } = this.world;
    const toSun = (wrapDelta(this.world.sunX - x) / width) * Math.PI * 2;
    const latitude = latitudeOf(y);
    const cosSun = Math.cos(toSun);
    const sunUp = Math.cos(latitude) * cosSun;
    if (sunUp <= 0) return 0;
    const { east, south } = terrain.gradientAt(x, y);
    const sunEast = Math.sin(toSun);
    const sunNorth = -Math.sin(latitude) * cosSun;
    const light = (PEAK_HEIGHT * (south * sunNorth - east * sunEast)) / Math.max(sunUp, LOW_SUN);
    return Math.max(-1, Math.min(1, light)) * SHADE * clamp01(sunUp / DUSK);
  }

  /** Noktadaki karın örtüsü (0..1): yükseklerde ve soğuk enlemlerde kalıcıdır. */
  snowAt(x, y) {
    const line = SNOW_LINE * (1 - POLAR_DROP * (Math.abs(latitudeOf(y)) / (Math.PI / 2)));
    return smoothstep(line, line + SNOW_EDGE, this.world.terrain.elevationAt(x, y));
  }
}
