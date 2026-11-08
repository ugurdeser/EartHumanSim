import { CloudField } from '../../CloudField.js';
import { GLOBE_SHADING } from '../../GlobeLayer.js';
import { HILLSHADE } from '../../Hillshade.js';
import { OverviewLayer } from '../../OverviewLayer.js';
import { f, fragment } from '../../gpu/glsl.js';

const { LIMB_SHADE, NIGHT_LIGHT, TWILIGHT, OVERLAY_LIGHT } = GLOBE_SHADING;

const BODY = `
uniform sampler2D u_overview; // uzak harita resmi
uniform float u_unit;         // kürenin yarıçapı, çıktı pikseliyle
uniform vec2 u_center;        // baktığın enlemin sinüsü ve kosinüsü
uniform float u_centerU;      // baktığın boylam (0..1)
uniform vec3 u_sun;           // güneşin yönü, kameraya göre
uniform sampler2D u_overlay;  // açılan hava katmanı (ısı, yağış...)

void main() {
  vec2 pixel = pixelCenter();
  float nx = (pixel.x - u_size.x / 2.0) / u_unit;
  float ny = (u_size.y / 2.0 - pixel.y) / u_unit;
  float rest = 1.0 - nx * nx - ny * ny;
  if (rest <= 0.0) {
    outColor = vec4(0.0);
    return;
  }
  float nz = sqrt(rest);
  float up = ny * u_center.y + nz * u_center.x;
  float forward = nz * u_center.y - ny * u_center.x;
  float u = fract(u_centerU + atan(nx, forward) / (PI * 2.0));
  float v = 0.5 - asin(clamp(up, -1.0, 1.0)) / PI;
  vec3 texel = texture(u_overview, vec2(u, v)).rgb * 255.0;

  float facing = dot(vec3(nx, ny, nz), u_sun);
  float daylight = clamp((facing + ${f(TWILIGHT)}) / ${f(TWILIGHT * 2)}, 0.0, 1.0);
  float light = (${f(NIGHT_LIGHT)} + ${f(1 - NIGHT_LIGHT)} * daylight) * (1.0 - ${f(LIMB_SHADE)} * (1.0 - nz));
  float cloud = cloudOpacity(u, v);
  vec2 p = vec2(u * WORLD_W, v * WORLD_H);
  float snow = max(snowAt(p), gridAt(u_snowCover, u, v)); // dağın kalıcı karı ya da yağan kar
  float relief = 1.0 + lightAt(p);
  vec3 ground = (texel + (${f(HILLSHADE.SNOW_BRIGHTNESS)} - texel) * snow) * relief;
  vec3 color = (ground * (1.0 - cloud) + cloudShade(u, v) * 255.0 * cloud) * light / 255.0;
  vec4 overlay = texture(u_overlay, vec2(u, v));
  color = mix(color, overlay.rgb * max(light, ${f(OVERLAY_LIGHT)}), overlay.a); // katman gece de okunur
  outColor = vec4(min(color, 1.0), 1.0);
}`;

/** Küre yüzeyini ekran kartında, tuvalin her pikseli için boyar. */
export class GpuGlobePainter {
  constructor(gpuWorld, overview) {
    this.gpuWorld = gpuWorld;
    this.overview = overview;
    this.program = gpuWorld.gpu.program(fragment(gpuWorld.world, BODY));
    this.texture = null;
    this.uploaded = null; // dokuya son yüklenen uzak harita (mevsim değişince yenilenir)
  }

  get sampleSize() {
    return this.gpuWorld.gpu.sampleSize;
  }

  #overviewTexture() {
    const { pixels } = this.overview;
    if (pixels !== this.uploaded) {
      this.texture = this.gpuWorld.gpu.imageTexture(pixels, OverviewLayer.width, OverviewLayer.height, this.texture ?? undefined);
      this.uploaded = pixels;
    }
    return this.texture;
  }

  paint(target, { unit, sinC, cosC, centerU, sun, days }) {
    const uniforms = {
      u_unit: unit,
      u_center: [sinC, cosC],
      u_centerU: centerU,
      u_sun: [sun.x, sun.y, sun.z],
      u_drift: CloudField.drift(days),
    };
    this.gpuWorld.paint(target, this.program, uniforms, { u_overview: this.#overviewTexture() });
  }
}
