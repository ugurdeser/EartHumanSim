const MAX_DROPS = 260;
const MAX_FLAKES = 180;
const CLOUD_ALPHA = 0.28;

/**
 * Ekrandaki yağış ve bulut: kameraya bağlıdır, haritanın boyutundan etkilenmez.
 * Yalnızca görseldir; simülasyonun rastgele sayılarını kullanmaz.
 */
export class WeatherEffects {
  constructor(world) {
    this.world = world;
    this.particles = Array.from({ length: Math.max(MAX_DROPS, MAX_FLAKES) }, () => ({ x: Math.random(), y: Math.random(), speed: 0.7 + Math.random() * 0.6 }));
    this.lastTime = null;
  }

  draw(ctx, width, height) {
    const now = performance.now();
    const frame = this.lastTime === null ? 0 : Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    const weather = this.world.weather;
    const { current, intensity } = weather;
    if (current.clouds > 0) {
      ctx.fillStyle = `rgba(84, 94, 110, ${current.clouds * intensity * CLOUD_ALPHA})`;
      ctx.fillRect(0, 0, width, height);
    }
    const step = this.world.clock.paused ? 0 : frame;
    if (current.snowfall > 0) this.#drawSnow(ctx, width, height, weather, step);
    else if (current.precipitation > 0) this.#drawRain(ctx, width, height, weather, step);
  }

  #drawRain(ctx, width, height, weather, step) {
    const strength = weather.precipitation;
    const count = Math.floor(MAX_DROPS * strength);
    ctx.strokeStyle = 'rgba(190, 210, 235, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      p.y = (p.y + step * p.speed * 2) % 1;
      p.x = (p.x + step * p.speed * 0.2) % 1;
      const x = p.x * width;
      const y = p.y * height;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 3, y + 14);
    }
    ctx.stroke();
  }

  #drawSnow(ctx, width, height, weather, step) {
    const wind = weather.current.windChill * 0.08;
    const count = Math.floor(MAX_FLAKES * weather.intensity * Math.min(1, 0.4 + wind * 2));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      p.y = (p.y + step * p.speed * 0.2) % 1;
      p.x = (p.x + step * (wind + 0.02 * Math.sin(p.y * 12 + i))) % 1;
      if (p.x < 0) p.x += 1;
      const x = p.x * width;
      const y = p.y * height;
      const r = 1 + p.speed;
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}
