import { clamp01 } from '../core/MathUtils.js';
import { latitudeOf, wrapDelta } from '../core/Planet.js';
import { Sun } from '../weather/atmosphere/Sun.js'; // güneşin yüksekliği (gece karanlığı)
import { AgentLayer } from './AgentLayer.js';
import { Camera } from './Camera.js';
import { CloudLayer } from './CloudLayer.js';
import { ChunkLayer } from './ChunkLayer.js';
import { CloudField } from './CloudField.js';
import { FeatureLayer } from './FeatureLayer.js';
import { GlobeLayer } from './GlobeLayer.js';
import { GroundLayer } from './GroundLayer.js';
import { Hillshade } from './Hillshade.js';
import { OffsetContext } from './OffsetContext.js';
import { OverlayLayer } from './OverlayLayer.js';
import { OverviewLayer } from './OverviewLayer.js';
import { Painters } from './painters/Painters.js';
import { PlantLayer } from './PlantLayer.js';
import { ReliefLayer } from './ReliefLayer.js';
import { SeaLayer } from './SeaLayer.js';
import { SpaceLayer } from './SpaceLayer.js';
import { SnowLayer } from './SnowLayer.js';
import { WeatherEffects } from './WeatherEffects.js';
import { WeatherMaps } from './WeatherMaps.js';
import { WindLayer } from './WindLayer.js';

const NIGHT_MAX_ALPHA = 0.45;
const SPACE_COLOR = '#05070f';
const SCENE_MARGIN = 1.3; // ara resim ekrandan bu kadar geniş: kenarlar kavisle içeri çekilir
const CELL_COLS = 28; // kavis ekranda bu kadar küçük parçaya bölünerek uygulanır
const CELL_ROWS = 18;
const HIGH_LATITUDE = 0.75; // rad: bundan yukarıda boylamlar ara resme sığmaz, taban küre görünür
const DAY_FROM = Math.sin((3 * Math.PI) / 180); // güneş ufkun 3° üstündeyse tam gündüz
const NIGHT_FROM = Math.sin((-10 * Math.PI) / 180); // 10° altındaysa tam gece

/**
 * Katmanları sırayla çizer: uzak görünüm → dağ gölgeleri → parça resimleri → tek tek bitkiler →
 * kar → deniz → göl/maden/yuva/yol → canlılar → bulutlar → hava katmanı → rüzgâr → yağış → gece.
 * Her katman kendi zoom aralığını bilir. Gece, baktığın yerde güneşin ne kadar alçaldığıdır.
 * Uzaktan bakış yerdurağan uydu gibidir: kamera gezegenle döner, kara sabit kalır; güneş, yıldızlar,
 * gece-gündüz çizgisi ve bulutlar üzerinden akar.
 * Gezegen her yakınlıkta küredir: uzaktan küre resmi, orta yakınlıkta katmanlar ara resme çizilip
 * küreye bükülür, eğriliğin görünmediği yakınlıkta doğrudan çizilir.
 */
export class Renderer {
  /** `prepared`: yükleme ekranında önceden hazırlanmış { overview, clouds } (yoksa burada hazırlanır). */
  constructor(canvas, world, camera, selection, settings, prepared = {}) {
    this.canvas = canvas;
    this.settings = settings;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.camera = camera;
    this.scene = document.createElement('canvas');
    this.sceneCamera = new Camera(world.width, world.height);
    const overview = (prepared.overview ?? new OverviewLayer(world)).prepare();
    const clouds = prepared.clouds ?? new CloudField();
    const hillshade = new Hillshade(world);
    this.maps = new WeatherMaps(world, clouds, settings);
    const painters = Painters.create({ world, overview, clouds, hillshade, maps: this.maps, settings });
    this.paintedBy = painters.kind; // 'gpu' ya da 'cpu'
    this.globe = new GlobeLayer(world, overview, this.maps, painters.globe);
    this.space = new SpaceLayer(world);
    this.wind = new WindLayer(world, this.maps);
    const relief = new ReliefLayer(world, painters.relief);
    const cloudLayer = new CloudLayer(world, this.maps, painters.cloud);
    this.optional = new Map([
      [relief, 'relief'],
      [cloudLayer, 'clouds'],
    ]); // katman → onu açıp kapatan ayar
    const ground = painters.ground ? new GroundLayer(world, painters.ground, settings) : overview;
    this.layers = [
      ground,
      relief,
      new ChunkLayer(world),
      new PlantLayer(world),
      new SnowLayer(world, this.maps),
      new SeaLayer(world, painters.sea),
      new FeatureLayer(world),
      new AgentLayer(world, selection),
      cloudLayer,
      new OverlayLayer(world, this.maps),
      this.wind,
    ];
    this.weatherEffects = new WeatherEffects(world);
    this.dpr = 1;
    this.resize();
    settings.onChange((key) => key === 'quality' && this.resize());
    settings.onChange((key) => key === 'lod' && this.#repaint());
  }

  /** Piksel piksel boyanan katmanlar bir sonraki karede yeniden boyansın (ayrıntı düzeyi değişti). */
  #repaint() {
    for (const layer of [...this.layers, this.globe]) if ('painted' in layer) layer.painted = '';
  }

  /** Tuval, ekran pikselinin kalite oranı kadarıyla çizilir; tarayıcı ekrana büyütür. */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = (window.devicePixelRatio || 1) * this.settings.resolution;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.camera.resize(rect.width, rect.height);
  }

  render() {
    const { ctx, camera, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = SPACE_COLOR;
    ctx.fillRect(0, 0, camera.width, camera.height);

    if (camera.isGlobe) {
      this.space.draw(ctx, camera);
      this.globe.draw(ctx, camera);
      this.wind.drawGlobe(ctx, camera);
      this.space.drawGlare(ctx, camera);
      return; // küre kendi gece-gündüz gölgesini taşır
    } else {
      if (camera.curvature > 0) this.#drawCurved();
      else for (const shift of camera.seamShifts) this.#drawLayers(ctx, camera, dpr, shift);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.weatherEffects.draw(ctx, camera);
    }
    this.#drawNight();
  }

  /** Katmanları ara resme düz çizer, sonra ekrana küre izdüşümüyle büker. */
  #drawCurved() {
    const { camera, dpr, scene, sceneCamera } = this;
    const width = Math.ceil(camera.width * SCENE_MARGIN);
    const height = Math.ceil(camera.height * SCENE_MARGIN);
    if (scene.width !== width * dpr || scene.height !== height * dpr) {
      scene.width = width * dpr;
      scene.height = height * dpr;
    }
    Object.assign(sceneCamera, { x: camera.x, y: camera.y, zoom: camera.zoom, width, height, sceneStretch: camera.stretch });

    const sceneCtx = scene.getContext('2d');
    sceneCtx.setTransform(1, 0, 0, 1, 0, 0);
    sceneCtx.clearRect(0, 0, scene.width, scene.height);
    for (const shift of sceneCamera.seamShifts) this.#drawLayers(sceneCtx, sceneCamera, dpr, shift);
    if (Math.abs(latitudeOf(camera.y)) > HIGH_LATITUDE) this.globe.drawBase(this.ctx, camera);
    this.#warp();
  }

  /** Ara resimdeki piksel konumu: ekran noktası hangi dünya noktasına düşüyorsa onun yeri. */
  #scenePoint(sx, sy) {
    const { camera, dpr, sceneCamera } = this;
    const world = camera.screenToWorld(sx, sy);
    return {
      x: (sceneCamera.width / 2 + wrapDelta(world.x - camera.x) * camera.zoom * sceneCamera.sceneStretch) * dpr,
      y: (sceneCamera.height / 2 + (world.y - camera.y) * camera.zoom) * dpr,
    };
  }

  /** Ekran parçalara bölünür; her parçaya ara resmin karşılık gelen kısmı afin dönüşümle oturtulur. */
  #warp() {
    const { ctx, camera, dpr, scene } = this;
    const cellW = camera.width / CELL_COLS;
    const cellH = camera.height / CELL_ROWS;
    const nodes = [];
    for (let row = 0; row <= CELL_ROWS; row++) {
      for (let col = 0; col <= CELL_COLS; col++) nodes.push(this.#scenePoint(col * cellW, row * cellH));
    }
    const nodeAt = (col, row) => nodes[row * (CELL_COLS + 1) + col];

    for (let row = 0; row < CELL_ROWS; row++) {
      for (let col = 0; col < CELL_COLS; col++) {
        const a = nodeAt(col, row);
        const b = nodeAt(col + 1, row);
        const c = nodeAt(col + 1, row + 1);
        const d = nodeAt(col, row + 1);
        const ux = b.x - a.x;
        const uy = b.y - a.y;
        const vx = d.x - a.x;
        const vy = d.y - a.y;
        const det = ux * vy - vx * uy;
        if (Math.abs(det) < 1e-6) continue;
        const dx = col * cellW;
        const dy = row * cellH;
        // ara resim → ekran: a köşesi (dx, dy)'ye, u ve v kenarları hücre kenarlarına gider
        const m11 = (cellW * vy) / det;
        const m12 = (-cellW * vx) / det;
        const m21 = (-cellH * uy) / det;
        const m22 = (cellH * ux) / det;
        const left = Math.floor(Math.min(a.x, b.x, c.x, d.x)) - 2;
        const top = Math.floor(Math.min(a.y, b.y, c.y, d.y)) - 2;
        const spanX = Math.ceil(Math.max(a.x, b.x, c.x, d.x)) + 2 - left;
        const spanY = Math.ceil(Math.max(a.y, b.y, c.y, d.y)) + 2 - top;

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        ctx.rect(dx - 0.5, dy - 0.5, cellW + 1, cellH + 1); // parçalar arasında ince boşluk kalmasın
        ctx.clip();
        ctx.setTransform(dpr * m11, dpr * m21, dpr * m12, dpr * m22, dpr * (dx - m11 * a.x - m12 * a.y), dpr * (dy - m21 * a.x - m22 * a.y));
        ctx.drawImage(scene, left, top, spanX, spanY, left, top, spanX, spanY);
        ctx.restore();
      }
    }
  }

  /** Dikiş görünüyorsa dünyanın öbür yanı kaydırılarak yanına çizilir. */
  #drawLayers(ctx, camera, dpr, shift) {
    const { world } = this;
    camera.x += shift;
    // katmanlar harita metresiyle çizer; konumlar kameranın baktığı noktaya göre iletilir
    const origin = { x: camera.x, y: camera.y };
    camera.applyTo(ctx, dpr, origin);
    const local = OffsetContext.wrap(ctx, origin.x, origin.y);
    ctx.save();
    ctx.beginPath();
    local.rect(0, 0, world.width, world.height);
    ctx.clip();
    for (const layer of this.layers) {
      if (this.#isShown(layer)) layer.draw(local, camera);
    }
    ctx.restore();
    camera.x -= shift;
  }

  #isShown(layer) {
    const key = this.optional.get(layer);
    return !key || this.settings[key];
  }

  /** Baktığın yerde güneşin yüksekliğinden karanlık (0: gündüz, 1: gece). */
  #darkness() {
    const { camera, world } = this;
    const latitude = latitudeOf(camera.y);
    const declination = world.weather.declination;
    const hourAngle = (2 * Math.PI * wrapDelta(camera.x - world.sunX)) / world.width;
    const height = Sun.elevation(Math.sin(latitude), Math.cos(latitude), Math.sin(declination), Math.cos(declination), hourAngle);
    return clamp01((DAY_FROM - height) / (DAY_FROM - NIGHT_FROM));
  }

  #drawNight() {
    const darkness = this.#darkness();
    if (darkness <= 0) return;
    const { ctx, camera, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgba(12, 18, 52, ${darkness * NIGHT_MAX_ALPHA})`;
    ctx.fillRect(0, 0, camera.width, camera.height);
  }
}
