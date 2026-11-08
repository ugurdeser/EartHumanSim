import { HILLSHADE } from '../../Hillshade.js';
import { boundsUniforms, f, fragment } from '../../gpu/glsl.js';

const BODY = `
void main() {
  vec2 p = worldAt(pixelCenter());
  float light = lightAt(p);
  float snow = snowAt(p);
  float color = light < 0.0 ? ${f(HILLSHADE.SNOW_BRIGHTNESS / 255)} * snow * (1.0 + light) : 1.0;
  float alpha = max(snow, abs(light));
  vec3 rgb = vec3(color, color, color + (1.0 - color) * 0.12); // gölgeler hafif mavidir
  outColor = vec4(rgb * alpha, alpha);
}`;

/** Dağ gölgesi ve karı ekran kartında, tuvalin her pikseli için boyar. */
export class GpuReliefPainter {
  constructor(gpuWorld) {
    this.gpuWorld = gpuWorld;
    this.program = gpuWorld.gpu.program(fragment(gpuWorld.world, BODY));
  }

  get sampleSize() {
    return this.gpuWorld.gpu.sampleSize;
  }

  paint(target, { bounds }) {
    this.gpuWorld.paint(target, this.program, boundsUniforms(this.gpuWorld.world, bounds, target.width, this.gpuWorld.gpu.settings.lod.bias));
  }
}
