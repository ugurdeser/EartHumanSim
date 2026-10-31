import { latitudeOf, wrapDelta, wrapX } from '../core/Planet.js';
import { AgentLayer } from './AgentLayer.js';
import { Camera } from './Camera.js';
import { CloudLayer } from './CloudLayer.js';
import { ChunkLayer } from './ChunkLayer.js';
import { CloudField } from './CloudField.js';
import { FeatureLayer } from './FeatureLayer.js';
import { GlobeLayer } from './GlobeLayer.js';
import { Hillshade } from './Hillshade.js';
import { OverviewLayer } from './OverviewLayer.js';
import { PlantLayer } from './PlantLayer.js';
import { ReliefLayer } from './ReliefLayer.js';
import { SeaLayer } from './SeaLayer.js';
import { SpaceLayer } from './SpaceLayer.js';
import { SnowLayer } from './SnowLayer.js';
import { WeatherEffects } from './WeatherEffects.js';

const NIGHT_MAX_ALPHA = 0.45;
const SPACE_COLOR = '#05070f';
const SCENE_MARGIN = 1.3; // ara resim ekrandan bu kadar geniş: kenarlar kavisle içeri çekilir
const CELL_COLS = 28; // kavis ekranda bu kadar küçük parçaya bölünerek uygulanır
const CELL_ROWS = 18;
const HIGH_LATITUDE = 0.75; // rad: bundan yukarıda boylamlar ara resme sığmaz, taban küre görünür

/**
 * Katmanları sırayla çizer: uzak görünüm → dağ gölgeleri → parça resimleri → tek tek bitkiler →
 * kar → deniz → göl/maden/yuva/yol → canlılar → bulutlar → hava → gece. Her katman kendi zoom aralığını bilir.
 * Gezegen her yakınlıkta küredir: uzaktan küre resmi, orta yakınlıkta katmanlar ara resme çizilip
 * küreye bükülür, eğriliğin görünmediği yakınlıkta doğrudan çizilir.
 */
export class Renderer {
  constructor(canvas, world, camera, selection) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.camera = camera;
    this.scene = document.createElement('canvas');
    this.sceneCamera = new Camera(world.width, world.height);
    const overview = new OverviewLayer(world);
    const clouds = new CloudField();
    const hillshade = new Hillshade(world);
    this.globe = new GlobeLayer(world, overview, clouds, hillshade);
    this.space = new SpaceLayer(world);
    this.layers = [
      overview,
      new ReliefLayer(world, hillshade),
      new ChunkLayer(world),
      new PlantLayer(world),
      new SnowLayer(world),
      new SeaLayer(world),
      new FeatureLayer(world),
      new AgentLayer(world, selection),
      new CloudLayer(world, clouds),
    ];
    this.weatherEffects = new WeatherEffects(world);
    this.spin = null; // küredeyken: { offset: güneşe göre bakış, x: son boylam }
    this.dpr = 1;
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.camera.resize(rect.width, rect.height);
  }

  /** Uzaktan bakınca güneş ve yıldızlar sabittir, zaman geçtikçe gezegen kendi ekseninde döner. */
  #spinPlanet() {
    const { camera, world } = this;
    if (!camera.isGlobe) {
      this.spin = null;
      return;
    }
    if (!this.spin) this.spin = { offset: wrapDelta(camera.x - world.sunX), x: camera.x };
    this.spin.offset += wrapDelta(camera.x - this.spin.x); // sürükleyen uzayda bakışını değiştirir
    camera.x = wrapX(world.sunX + this.spin.offset);
    this.spin.x = camera.x;
  }

  render() {
    const { ctx, camera, dpr } = this;
    this.#spinPlanet();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = SPACE_COLOR;
    ctx.fillRect(0, 0, camera.width, camera.height);

    if (camera.isGlobe) {
      this.space.draw(ctx, camera);
      this.globe.draw(ctx, camera);
      this.space.drawGlare(ctx, camera);
      return; // küre kendi gece-gündüz gölgesini taşır
    } else {
      if (camera.curvature > 0) this.#drawCurved();
      else for (const shift of camera.seamShifts) this.#drawLayers(ctx, camera, dpr, shift);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.weatherEffects.draw(ctx, camera.width, camera.height);
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
    camera.applyTo(ctx, dpr);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, world.width, world.height);
    ctx.clip();
    for (const layer of this.layers) layer.draw(ctx, camera);
    ctx.restore();
    camera.x -= shift;
  }

  #drawNight() {
    const darkness = this.world.clock.darkness;
    if (darkness <= 0) return;
    const { ctx, camera, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgba(12, 18, 52, ${darkness * NIGHT_MAX_ALPHA})`;
    ctx.fillRect(0, 0, camera.width, camera.height);
  }
}
