import { latitudeOf, Planet } from '../../core/Planet.js';
import { Random } from '../../core/Random.js';
import { ElevationMap } from '../../render/ElevationMap.js';
import { Surface, Terrain } from '../../world/Terrain.js';
import { el } from '../dom.js';

const PREVIEW_COLS = 630; // önizlemenin arazi ızgarası (oyundakinin yarısı sık, ~4 kat hızlı)
const MAP_WIDTH = 1200; // tuvalin iç çözünürlüğü (harita 2:1)
const MAP_HEIGHT = 600;
const REGENERATE_DELAY = 120; // ms: ayar sürüklenirken her adımda üretmesin
const DEG = 180 / Math.PI;

/** Enlemin kuşak adı: başlangıç yerini seçerken ne tür bir iklim beklendiği. */
const zoneOf = (latitude, obliquity) => {
  const abs = Math.abs(latitude);
  if (abs >= 90 - obliquity && obliquity > 0) return 'kutup kuşağı';
  if (abs <= obliquity) return 'tropik kuşak';
  if (abs < 35) return 'dönence altı (sıcak, kurak olabilir)';
  if (abs < 55) return 'ılıman kuşak';
  return 'soğuk kuşak';
};

/**
 * Başlangıç ekranının haritası: gezegenin önizlemesi (kara, deniz, dağlar, buzullar; düz harita).
 * Ayar değiştikçe yeniden üretilir. Bir kara noktasına tıklanınca başlangıç yeri olur.
 */
export class PlanetPreview {
  constructor(planet, onPick) {
    this.planet = planet;
    this.onPick = onPick;
    this.canvas = el('canvas', { class: 'planet-map' });
    Object.assign(this.canvas, { width: MAP_WIDTH, height: MAP_HEIGHT });
    this.hoverInfo = el('div', { class: 'planet-map-hover' });
    this.startInfo = el('div', { class: 'planet-map-start' });
    this.root = el('div', { class: 'planet-preview' }, this.canvas, el('div', { class: 'planet-map-info' }, this.startInfo, this.hoverInfo));
    this.terrain = null;
    this.elevation = null;
    this.landKey = null;
    this.timer = null;
    this.canvas.addEventListener('mousemove', (e) => this.#hover(e));
    this.canvas.addEventListener('mouseleave', () => (this.hoverInfo.textContent = ''));
    this.canvas.addEventListener('click', (e) => this.#pick(e));
  }

  /** Arazi ayarları değiştiyse (kısa bir beklemeyle) yeniden üretir; yoksa yalnızca yeniden çizer. */
  refresh() {
    if (this.planet.landKey === this.landKey) return this.#draw();
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.#generate(), REGENERATE_DELAY);
  }

  #generate() {
    const { planet } = this;
    Planet.resize(planet.circumference);
    this.terrain = new Terrain(new Random(planet.seed), planet, { cols: PREVIEW_COLS });
    this.elevation = new ElevationMap(this.terrain, { alpha: 1 }).ensure();
    this.landKey = planet.landKey;
    if (planet.start && this.terrain.surfaceAt(planet.start.x, planet.start.y) !== Surface.LAND) planet.start = null; // yer denize kaldı
    this.#draw();
  }

  #toWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * Planet.width, y: ((e.clientY - rect.top) / rect.height) * Planet.height };
  }

  #describe(point) {
    const latitude = latitudeOf(point.y) * DEG;
    const where = `${Math.abs(latitude).toFixed(1)}° ${latitude >= 0 ? 'K' : 'G'}`;
    const surface = this.terrain.surfaceAt(point.x, point.y);
    if (surface === Surface.SEA) return `${where} · deniz`;
    if (surface === Surface.ICE) return `${where} · buzul`;
    const altitude = Math.round(this.terrain.elevationAt(point.x, point.y) * this.planet.peakAltitude);
    return `${where} · kara · ${altitude} m · ${zoneOf(latitude, this.planet.obliquity)}`;
  }

  #hover(e) {
    if (!this.terrain) return;
    const point = this.#toWorld(e);
    const land = this.terrain.surfaceAt(point.x, point.y) === Surface.LAND;
    this.hoverInfo.textContent = `${land ? '🖱️ Tıklayınca başlangıç: ' : ''}${this.#describe(point)}`;
    this.canvas.style.cursor = land ? 'crosshair' : 'not-allowed';
  }

  #pick(e) {
    if (!this.terrain) return;
    const point = this.#toWorld(e);
    if (this.terrain.surfaceAt(point.x, point.y) !== Surface.LAND) return;
    this.planet.start = point;
    this.onPick(point);
    this.#draw();
  }

  #draw() {
    if (!this.elevation) return;
    const ctx = this.canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.elevation.canvas, 0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.#drawLatitudes(ctx);
    this.#drawStart(ctx);
  }

  /** Ekvator, dönenceler ve kutup daireleri (eksen eğikliğine göre). */
  #drawLatitudes(ctx) {
    const { obliquity } = this.planet;
    const lines = [[0, 'Ekvator']];
    if (obliquity > 0) lines.push([obliquity, 'Dönence'], [-obliquity, 'Dönence'], [90 - obliquity, 'Kutup dairesi'], [obliquity - 90, 'Kutup dairesi']);
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '13px system-ui, sans-serif';
    for (const [latitude, name] of lines) {
      const y = (0.5 - latitude / 180) * MAP_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_WIDTH, y);
      ctx.stroke();
      ctx.fillText(name, 8, y - 4);
    }
    ctx.restore();
  }

  #drawStart(ctx) {
    const { start } = this.planet;
    if (!start) {
      this.startInfo.textContent = '📍 Başlangıç yeri seçilmedi: haritada bir karaya tıklayın (seçmezseniz ılıman kuşakta bir yer seçilir).';
      return;
    }
    const x = (start.x / Planet.width) * MAP_WIDTH;
    const y = (start.y / Planet.height) * MAP_HEIGHT;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = '#ff5a4f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    this.startInfo.textContent = `📍 Başlangıç: ${this.#describe(start)}`;
  }
}
