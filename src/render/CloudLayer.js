import { CLOUDS } from '../config.js';
import { clamp01, lerp, smoothstep } from '../core/MathUtils.js';
import { OvercastSheet } from './OvercastSheet.js';

const SPRITE_SIZE = 192; // bir bulut resminin piksel boyutu
const SPRITE_VARIANTS = 6;
const PUFFS = [9, 16]; // bir bulutu oluşturan yumuşak nokta sayısı
const MAX_TIME_SCALE = 10;

/** Yumuşak, iç içe noktalardan bir bulut resmi (beyaz; gölgesi aynı resimden koyu çizilir). */
function createCloudSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  const center = SPRITE_SIZE / 2;
  const puffs = PUFFS[0] + Math.floor(Math.random() * (PUFFS[1] - PUFFS[0]));
  for (let i = 0; i < puffs; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * SPRITE_SIZE * 0.22;
    const x = center + Math.cos(angle) * distance * 1.3; // biraz yatay uzun
    const y = center + Math.sin(angle) * distance * 0.8;
    const r = SPRITE_SIZE * (0.12 + Math.random() * 0.12);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

/** Aynı resmin renklendirilmiş kopyası (gölge ve fırtına bulutu için). */
function tint(sprite, color) {
  const canvas = document.createElement('canvas');
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(sprite, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Haritanın üstünde rüzgârla süzülen bulutlar. Kapalılık havaya göre değişir; bulutlar
 * yukarıdan (uzak zoom) belirgin görünür, yere yaklaştıkça silikleşir. Gölgeleri yere düşer.
 * Yalnızca görseldir; simülasyonun rastgele sayılarını kullanmaz.
 */
export class CloudLayer {
  constructor(world) {
    this.world = world;
    this.sprites = Array.from({ length: SPRITE_VARIANTS }, () => {
      const white = createCloudSprite();
      return { white, grey: tint(white, 'rgb(130, 138, 150)'), dark: tint(white, 'rgb(58, 64, 76)'), shadow: tint(white, 'rgb(10, 16, 24)') };
    });
    this.clouds = Array.from({ length: CLOUDS.COUNT }, (_, i) => ({
      x: Math.random() * world.size,
      y: Math.random() * world.size,
      size: lerp(CLOUDS.SIZE[0], CLOUDS.SIZE[1], Math.random()),
      threshold: (i + Math.random()) / CLOUDS.COUNT, // kapalılık bunu geçince görünür
      sprite: this.sprites[i % SPRITE_VARIANTS],
      dark: Math.random() < CLOUDS.DARK_SHARE, // yağmur bulutu: yağışta koyulaşır
    }));
    this.overcast = new OvercastSheet(world.size);
    this.offsetX = 0; // örtünün toplam kayması
    this.offsetY = 0;
    this.windAngle = Math.random() * Math.PI * 2;
    this.lastTime = null;
  }

  /** Gökyüzünün ne kadar kapalı olduğu (0..1). */
  get #cover() {
    const { current, intensity } = this.world.weather;
    return Math.max(CLOUDS.CLEAR_COVER, current.clouds * intensity);
  }

  /** Yukarıdan bakınca 1, yere yaklaştıkça 0. */
  #altitudeAlpha(camera) {
    const [high, low] = CLOUDS.FADE_ZOOM;
    return 1 - smoothstep(Math.log(high), Math.log(low), Math.log(camera.zoom));
  }

  #drift() {
    const now = performance.now();
    const frame = this.lastTime === null ? 0 : Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    const clock = this.world.clock;
    if (clock.paused) return;
    const distance = frame * CLOUDS.DRIFT * Math.min(clock.timeScale, MAX_TIME_SCALE);
    this.windAngle += frame * 0.002; // rüzgâr yönü çok yavaş döner
    const dx = Math.cos(this.windAngle) * distance;
    const dy = Math.sin(this.windAngle) * distance;
    this.offsetX += dx;
    this.offsetY += dy;
    const size = this.world.size;
    for (const cloud of this.clouds) {
      cloud.x = (cloud.x + dx + size) % size;
      cloud.y = (cloud.y + dy + size) % size;
    }
  }

  draw(ctx, camera) {
    this.#drift();
    const altitude = this.#altitudeAlpha(camera);
    if (altitude <= 0.01) return;
    const cover = this.#cover;
    const rain = this.world.weather.precipitation;
    this.#drawOvercast(ctx, cover, rain, altitude);
    const sizeFactor = 0.8 + cover * 0.5 + rain * CLOUDS.RAIN_SIZE_BOOST;
    const maxAlpha = Math.min(1, CLOUDS.MAX_ALPHA + rain * CLOUDS.RAIN_ALPHA_BOOST);
    const { minX, minY, maxX, maxY } = camera.visibleBounds;
    const offset = CLOUDS.SHADOW_OFFSET;
    const visible = [];
    for (const cloud of this.clouds) {
      const presence = clamp01((cover - cloud.threshold) * 8);
      if (presence <= 0) continue;
      const half = (cloud.size * sizeFactor) / 2;
      if (cloud.x + half + offset < minX || cloud.x - half > maxX || cloud.y + half + offset < minY || cloud.y - half > maxY) continue;
      visible.push({ cloud, half, presence });
    }

    for (const { cloud, half, presence } of visible) {
      ctx.globalAlpha = presence * CLOUDS.SHADOW_ALPHA * altitude;
      ctx.drawImage(cloud.sprite.shadow, cloud.x - half + offset, cloud.y - half + offset, half * 2, half * 2);
    }
    for (const { cloud, half, presence } of visible) {
      const alpha = presence * maxAlpha * altitude;
      const grey = clamp01(rain * (cloud.dark ? 2 : 0.8));
      ctx.globalAlpha = alpha * (1 - grey);
      ctx.drawImage(cloud.sprite.white, cloud.x - half, cloud.y - half, half * 2, half * 2);
      if (grey <= 0) continue;
      ctx.globalAlpha = alpha * grey;
      ctx.drawImage(cloud.dark ? cloud.sprite.dark : cloud.sprite.grey, cloud.x - half, cloud.y - half, half * 2, half * 2);
    }
    ctx.globalAlpha = 1;
  }

  /** Yağışlı havada haritanın büyük kısmını kapatan sürekli örtü (tek tek bulutların altında). */
  #drawOvercast(ctx, cover, rain, altitude) {
    const strength = smoothstep(CLOUDS.OVERCAST_FROM[0], CLOUDS.OVERCAST_FROM[1], cover);
    if (strength <= 0) return;
    this.overcast.draw(ctx, {
      coverage: lerp(CLOUDS.OVERCAST_COVER, CLOUDS.STORM_COVER, clamp01((rain - 0.5) * 2)),
      darkness: clamp01(rain * 1.3),
      alpha: strength * CLOUDS.OVERCAST_ALPHA * altitude,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
    });
  }
}
