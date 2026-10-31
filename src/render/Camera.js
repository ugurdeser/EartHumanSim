import { clamp, lerp, smoothstep } from '../core/MathUtils.js';
import { latitudeOf, wrapDelta, wrapX } from '../core/Planet.js';
import { Vector2 } from '../core/Vector2.js';

// Ekran köşesinin gezegen yarıçapına oranı:
const GLOBE_RATIO = 0.6; // bundan uzakta küre resmi çizilir
const CURVE_FROM = 0.08; // bundan yakında yüzey düzdür (eğrilik gözle görülmez)
const CURVE_FULL = 0.3; // bu orana gelince tam küre izdüşümü
const MAX_LATITUDE_VIEW = 0.12; // kamera merkezi kutuplara bu oran kadar yaklaşmaz

/**
 * Kuş bakışı kamera: dünya (metre) ↔ ekran (piksel) dönüşümü, zoom ve kaydırma.
 * Gezegen her yakınlıkta küredir: yüzey ancak eğrilik görülmeyecek kadar küçük alanda düz çizilir.
 */
export class Camera {
  constructor(worldWidth, worldHeight) {
    this.worldWidth = worldWidth;
    this.worldHeight = worldHeight;
    this.globeDiameter = worldWidth / Math.PI;
    this.x = worldWidth / 2;
    this.y = worldHeight / 2;
    this.zoom = 0.2; // piksel / metre
    this.minZoom = 0.05;
    this.maxZoom = 40;
    this.sceneStretch = 1; // kavisli görünümün ara resmi yatayda bu kadar sıkışık çizilir
    this.width = 1;
    this.height = 1;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  fitWorld() {
    this.zoom = (Math.min(this.width, this.height) / this.globeDiameter) * 0.95;
    this.minZoom = this.zoom * 0.4;
  }

  get #viewRatio() {
    return Math.hypot(this.width, this.height) / 2 / this.globeRadius;
  }

  get isGlobe() {
    return this.#viewRatio > GLOBE_RATIO;
  }

  /** 0: düz yüzey, 1: tam küre izdüşümü; arası yumuşak geçiş. */
  get curvature() {
    return smoothstep(CURVE_FROM, CURVE_FULL, this.#viewRatio);
  }

  /** Boylam metreleri enlemle daralır: kavisli görünümde x bu oranda sıkışır. */
  get stretch() {
    return lerp(1, Math.cos(latitudeOf(this.y)), this.curvature);
  }

  get globeRadius() {
    return (this.globeDiameter / 2) * this.zoom;
  }

  /** Enlem ve boylam farkındaki yön, kameraya göre birim vektör (x sağ, y yukarı, z bize doğru). */
  viewDirection(latitude, east) {
    const center = latitudeOf(this.y);
    const y0 = Math.sin(latitude);
    const z0 = Math.cos(latitude) * Math.cos(east);
    return {
      x: Math.cos(latitude) * Math.sin(east),
      y: y0 * Math.cos(center) - z0 * Math.sin(center),
      z: y0 * Math.sin(center) + z0 * Math.cos(center),
    };
  }

  /** Kameranın baktığı boylamdan bir boylama olan açı. */
  eastOf(x) {
    return (wrapDelta(x - this.x) / this.worldWidth) * Math.PI * 2;
  }

  /** Dünya noktasının küre üzerindeki ekran konumu; arka yüzdeyse null. */
  projectToGlobe(position) {
    const view = this.viewDirection(latitudeOf(position.y), this.eastOf(position.x));
    if (view.z <= 0) return null;
    const radius = this.globeRadius;
    return { x: this.width / 2 + view.x * radius, y: this.height / 2 - view.y * radius };
  }

  /** Küre üzerindeki ekran noktasının dünya konumu (kürenin dışı en yakın kenara sayılır). */
  #globeToWorld(sx, sy) {
    const radius = this.globeRadius;
    let nx = (sx - this.width / 2) / radius;
    let ny = (this.height / 2 - sy) / radius;
    const length = Math.hypot(nx, ny);
    if (length > 1) {
      nx /= length;
      ny /= length;
    }
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const center = latitudeOf(this.y);
    const up = ny * Math.cos(center) + nz * Math.sin(center);
    const forward = nz * Math.cos(center) - ny * Math.sin(center);
    const east = Math.atan2(nx, forward);
    return new Vector2(wrapX(this.x + (east / (Math.PI * 2)) * this.worldWidth), (0.5 - Math.asin(clamp(up, -1, 1)) / Math.PI) * this.worldHeight);
  }

  screenToWorld(sx, sy) {
    const flatX = (sx - this.width / 2) / this.zoom + this.x;
    const flatY = (sy - this.height / 2) / this.zoom + this.y;
    const curve = this.curvature;
    if (curve <= 0) return new Vector2(wrapX(flatX), flatY);
    const round = this.#globeToWorld(sx, sy);
    if (this.isGlobe) return round;
    return new Vector2(wrapX(flatX + wrapDelta(round.x - flatX) * curve), lerp(flatY, round.y, curve));
  }

  zoomAt(sx, sy, factor) {
    const wasGlobe = this.isGlobe;
    const before = this.screenToWorld(sx, sy);
    this.zoom = clamp(this.zoom * factor, this.minZoom, this.maxZoom);
    if (wasGlobe || this.isGlobe) return; // küre merkezinde döner, imleç noktası sabit kalmaz
    const after = this.screenToWorld(sx, sy);
    this.x += wrapDelta(before.x - after.x);
    this.y += before.y - after.y;
    this.#clampCenter();
  }

  panBy(dxPixels, dyPixels) {
    this.x -= dxPixels / (this.zoom * this.stretch);
    this.y -= dyPixels / this.zoom;
    this.#clampCenter();
  }

  /** Noktaya gider; uzaktaysa en az `minZoom` kadar yakınlaşır. */
  focusOn(position, minZoom) {
    this.zoom = clamp(Math.max(this.zoom, minZoom), this.minZoom, this.maxZoom);
    this.centerOn(position);
  }

  centerOn(position) {
    this.x = position.x;
    this.y = position.y;
    this.#clampCenter();
  }

  #clampCenter() {
    this.x = wrapX(this.x);
    this.y = clamp(this.y, this.worldHeight * MAX_LATITUDE_VIEW, this.worldHeight * (1 - MAX_LATITUDE_VIEW));
  }

  /** Ekran dünyanın dikişini görüyorsa öbür yanı da bu kaymayla çizilir. */
  get seamShifts() {
    const { minX, maxX } = this.visibleBounds;
    if (minX < 0) return [0, this.worldWidth];
    if (maxX > this.worldWidth) return [0, -this.worldWidth];
    return [0];
  }

  get visibleBounds() {
    const halfW = this.width / 2 / (this.zoom * this.sceneStretch);
    const halfH = this.height / 2 / this.zoom;
    return { minX: this.x - halfW, minY: this.y - halfH, maxX: this.x + halfW, maxY: this.y + halfH };
  }

  /** Bir ekran piksel boyutunu dünya metresine çevirir (sabit piksel boyutlu noktalar için). */
  pixels(px) {
    return px / this.zoom;
  }

  applyTo(ctx, dpr) {
    const scale = this.zoom * dpr;
    const scaleX = scale * this.sceneStretch;
    ctx.setTransform(scaleX, 0, 0, scale, this.width / 2 * dpr - this.x * scaleX, (this.height / 2 - this.y * this.zoom) * dpr);
  }
}
