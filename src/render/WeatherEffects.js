import { clamp01 } from '../core/MathUtils.js';

const MAX_DROPS = 260;
const MAX_FLAKES = 180;
const CLOUD_ALPHA = 0.28;
const HEAVY_RAIN = 6; // mm/saat: en yoğun yağmur
const HEAVY_SNOW = 2;
const CLOSE_ZOOM = 0.12; // yalnızca yeryüzüne yakınken yağışın içindeyiz

/**
 * Ekrandaki yağış ve kapalı gökyüzü: baktığın yerin havası. Yağmur ve kar rüzgârın yönünde savrulur.
 * Yalnızca görseldir; simülasyonun rastgele sayılarını kullanmaz.
 */
export class WeatherEffects {
  constructor(world) {
    this.world = world;
    this.particles = Array.from({ length: Math.max(MAX_DROPS, MAX_FLAKES) }, () => ({ x: Math.random(), y: Math.random(), speed: 0.7 + Math.random() * 0.6 }));
    this.lastTime = null;
  }

  draw(ctx, camera) {
    const now = performance.now();
    const frame = this.lastTime === null ? 0 : Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    if (camera.zoom < CLOSE_ZOOM) return;

    const local = this.world.weather.at(camera);
    const { width, height } = camera;
    if (local.cover > 0.5) {
      ctx.fillStyle = `rgba(84, 94, 110, ${(local.cover - 0.5) * 2 * CLOUD_ALPHA})`;
      ctx.fillRect(0, 0, width, height);
    }
    const step = this.world.clock.paused ? 0 : frame;
    const drift = local.windEast * 0.02; // doğuya esen rüzgâr yağışı sağa savurur
    if (local.snowfall > local.rain) this.#drawSnow(ctx, width, height, clamp01(local.snowfall / HEAVY_SNOW), drift, step);
    else if (local.rain > 0.05) this.#drawRain(ctx, width, height, clamp01(local.rain / HEAVY_RAIN), drift, step);
  }

  #drawRain(ctx, width, height, strength, drift, step) {
    const count = Math.floor(MAX_DROPS * Math.max(0.15, strength));
    const slant = 3 + drift * 40;
    ctx.strokeStyle = 'rgba(190, 210, 235, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      p.y = (p.y + step * p.speed * 2) % 1;
      p.x = (((p.x + step * p.speed * (0.2 + drift)) % 1) + 1) % 1;
      const x = p.x * width;
      const y = p.y * height;
      ctx.moveTo(x, y);
      ctx.lineTo(x + slant, y + 14);
    }
    ctx.stroke();
  }

  #drawSnow(ctx, width, height, strength, drift, step) {
    const count = Math.floor(MAX_FLAKES * Math.max(0.2, strength));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      p.y = (p.y + step * p.speed * 0.2) % 1;
      p.x = (((p.x + step * (drift + 0.02 * Math.sin(p.y * 12 + i))) % 1) + 1) % 1;
      const x = p.x * width;
      const y = p.y * height;
      const r = 1 + p.speed;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}
