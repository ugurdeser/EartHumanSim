import { DAY } from '../config.js';
import { latitudeOf, wrapX } from '../core/Planet.js';
import { OverviewLayer } from './OverviewLayer.js';

const PIXEL = 2; // ekran pikseli başına örnek
const ATMOSPHERE = 1.07;
const LIMB_SHADE = 0.25; // kenara doğru kararma
const NIGHT_LIGHT = 0.1; // gece yüzünün aydınlığı
const TWILIGHT = 0.07; // atmosferin yaydığı alacakaranlık şeridi
const CLOUD_BRIGHTNESS = 248;
const SPIN_STEPS = 3000; // ekvator bu kadar adıma bölünür: dönüş bir adım ilerleyince resim yenilenir
const PERSON_PX = 3;

/** Uzaktan görünüm: uzak harita resmi küreye sarılır, baktığın boylam ortada durur. */
export class GlobeLayer {
  constructor(world, overview, clouds) {
    this.world = world;
    this.overview = overview;
    this.clouds = clouds;
    this.canvas = document.createElement('canvas');
    this.painted = '';
  }

  #paint(camera) {
    const width = Math.ceil(camera.width / PIXEL);
    const height = Math.ceil(camera.height / PIXEL);
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    const ctx = this.canvas.getContext('2d');
    const image = ctx.createImageData(width, height);
    const unit = camera.globeRadius / PIXEL; // yarıçap, resim pikseliyle
    const source = this.overview.pixels;
    const { width: texWidth, height: texHeight } = OverviewLayer;
    const center = latitudeOf(camera.y);
    const sinC = Math.sin(center);
    const cosC = Math.cos(center);
    const centerU = camera.x / camera.worldWidth;
    const sun = camera.viewDirection(0, camera.eastOf(this.world.sunX));
    const days = this.world.now / DAY;
    const threshold = this.clouds.threshold(this.clouds.coverage(this.world.weather));
    for (let py = 0; py < height; py++) {
      const ny = (height / 2 - py - 0.5) / unit;
      for (let px = 0; px < width; px++) {
        const nx = (px + 0.5 - width / 2) / unit;
        const rest = 1 - nx * nx - ny * ny;
        if (rest <= 0) continue;
        const nz = Math.sqrt(rest);
        const up = ny * cosC + nz * sinC;
        const forward = nz * cosC - ny * sinC;
        const u = wrapX((centerU + Math.atan2(nx, forward) / (Math.PI * 2)) * camera.worldWidth) / camera.worldWidth;
        const v = 0.5 - Math.asin(up) / Math.PI;
        // komşu dört doku pikseli harmanlanır: kıyılar ve kenarlar dişli görünmez
        const tx = u * texWidth - 0.5;
        const ty = Math.max(0, Math.min(texHeight - 1.001, v * texHeight - 0.5));
        const x0 = (Math.floor(tx) + texWidth) % texWidth;
        const x1 = (x0 + 1) % texWidth;
        const y0 = Math.floor(ty);
        const fx = tx - Math.floor(tx);
        const fy = ty - y0;
        const a = (y0 * texWidth + x0) * 4;
        const b = (y0 * texWidth + x1) * 4;
        const c = a + texWidth * 4;
        const d = b + texWidth * 4;
        const wa = (1 - fx) * (1 - fy);
        const wb = fx * (1 - fy);
        const wc = (1 - fx) * fy;
        const wd = fx * fy;
        const facing = nx * sun.x + ny * sun.y + nz * sun.z;
        const daylight = Math.min(1, Math.max(0, (facing + TWILIGHT) / (TWILIGHT * 2)));
        const light = (NIGHT_LIGHT + (1 - NIGHT_LIGHT) * daylight) * (1 - LIMB_SHADE * (1 - nz));
        const to = (py * width + px) * 4;
        const cloud = this.clouds.opacity(u, v, days, threshold);
        for (let channel = 0; channel < 3; channel++) {
          const ground = source[a + channel] * wa + source[b + channel] * wb + source[c + channel] * wc + source[d + channel] * wd;
          image.data[to + channel] = (ground * (1 - cloud) + CLOUD_BRIGHTNESS * cloud) * light;
        }
        image.data[to + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }

  /** Yalnızca yüzey: kavisli görünümün taban resmi olarak da kullanılır. */
  #drawSurface(ctx, camera) {
    this.overview.refresh();
    const view = `${Math.round((camera.x / camera.worldWidth) * SPIN_STEPS)}|${camera.y}|${camera.zoom}|${camera.width}|${camera.height}|${this.overview.season.name}|${Math.round(this.clouds.coverage(this.world.weather) * 40)}|${Math.round((this.world.now / DAY) * 200)}`;
    if (view !== this.painted) {
      this.#paint(camera);
      this.painted = view;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.canvas, 0, 0, camera.width, camera.height);
  }

  drawBase(ctx, camera) {
    this.#drawSurface(ctx, camera);
  }

  draw(ctx, camera) {
    const radius = camera.globeRadius;
    const cx = camera.width / 2;
    const cy = camera.height / 2;
    const glow = ctx.createRadialGradient(cx, cy, radius * 0.96, cx, cy, radius * ATMOSPHERE);
    glow.addColorStop(0, 'rgba(120, 180, 255, 0.55)');
    glow.addColorStop(1, 'rgba(120, 180, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * ATMOSPHERE, 0, Math.PI * 2);
    ctx.fill();
    this.#drawSurface(ctx, camera);

    ctx.fillStyle = '#ffd166';
    for (const person of this.world.people) {
      const point = camera.projectToGlobe(person.position);
      if (point) ctx.fillRect(point.x - PERSON_PX / 2, point.y - PERSON_PX / 2, PERSON_PX, PERSON_PX);
    }
  }
}
