import { AgentLayer } from './AgentLayer.js';
import { ChunkLayer } from './ChunkLayer.js';
import { FeatureLayer } from './FeatureLayer.js';
import { OverviewLayer } from './OverviewLayer.js';
import { PlantLayer } from './PlantLayer.js';

const NIGHT_MAX_ALPHA = 0.45;

/**
 * Katmanları sırayla çizer: uzak görünüm → parça resimleri → tek tek bitkiler →
 * göl/maden/yuva/yol → canlılar → gece. Her katman kendi zoom aralığını bilir.
 */
export class Renderer {
  constructor(canvas, world, camera, selection) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = world;
    this.camera = camera;
    this.layers = [
      new OverviewLayer(world),
      new ChunkLayer(world),
      new PlantLayer(world),
      new FeatureLayer(world),
      new AgentLayer(world, selection),
    ];
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

  render() {
    const { ctx, camera, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#20251c';
    ctx.fillRect(0, 0, camera.width, camera.height);

    camera.applyTo(ctx, dpr);
    for (const layer of this.layers) layer.draw(ctx, camera);

    this.#drawNight();
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
