import { COLORS } from '../../../config.js';
import { boundsUniforms, fragment, vec3Of } from '../../gpu/glsl.js';
import { PALETTE_KEYS, hexToRgb } from '../../GroundColor.js';

const BODY = `
uniform float u_footprint; // bir örneğin kapladığı uzunluk (m), ayrıntı düzeyiyle çarpılmış
uniform float u_samples;   // örnek sayısı: 1 ya da 4 (pikselin içinde döndürülmüş ızgara)

vec3 shade(vec2 q, float footprint) {
  if (isIce(q)) return ${vec3Of(COLORS.ICE)};
  if (isSea(q)) return ${vec3Of(COLORS.SEA)};
  return groundColor(q, footprint);
}

void main() {
  vec2 pixel = pixelCenter();
  vec2 span = u_bounds / u_size; // bir çıktı pikselinin boyu (m)
  if (u_samples < 2.0) {
    outColor = vec4(shade(worldAt(pixel), u_footprint), 1.0);
    return;
  }
  // dört örnek; her biri pikselin dörtte birini temsil eder, ayrıntısı da ona göre söner
  vec3 sum = vec3(0.0);
  sum += shade(worldAt(pixel) + span * vec2(-0.375, -0.125), u_footprint * 0.5);
  sum += shade(worldAt(pixel) + span * vec2(0.125, -0.375), u_footprint * 0.5);
  sum += shade(worldAt(pixel) + span * vec2(0.375, 0.125), u_footprint * 0.5);
  sum += shade(worldAt(pixel) + span * vec2(-0.125, 0.375), u_footprint * 0.5);
  outColor = vec4(sum / 4.0, 1.0);
}`;

/** Paletin renkleri sırayla, 0..255. */
const paletteUniform = (season) => PALETTE_KEYS.flatMap((key) => hexToRgb(season.palette[key]));

/**
 * Zemin: bitki yoğunluklarının rengi, deniz ve buzul; ekran kartında, görünen alanın her pikseli
 * için. Ayrıntı pikselin boyuna göre söner (LOD): her yakınlıkta keskin, uzaktan kumlanmasız.
 * Kara ve deniz aynı hesaptan çıkar: kıyıda bulanık şerit kalmaz.
 */
export class GpuGroundPainter {
  constructor(gpuWorld) {
    this.gpuWorld = gpuWorld;
    this.program = gpuWorld.gpu.program(fragment(gpuWorld.world, BODY));
  }

  get #lod() {
    return this.gpuWorld.gpu.settings.lod;
  }

  /** Bir örneğin ekran pikseli: ayrıntı düzeyiyle kalitenin birleşimi. */
  get sampleSize() {
    return this.gpuWorld.gpu.sampleSize * this.#lod.pixel;
  }

  paint(target, { bounds, north, south }) {
    const lod = this.#lod;
    const uniforms = boundsUniforms(this.gpuWorld.world, bounds, target.width, lod.bias);
    this.gpuWorld.paint(target, this.program, {
      ...uniforms,
      u_footprint: ((bounds.maxX - bounds.minX) / target.width) * lod.bias,
      u_samples: lod.samples,
      'u_north[0]': paletteUniform(north),
      'u_south[0]': paletteUniform(south),
    });
  }
}
