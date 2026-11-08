import { COLORS } from '../../../config.js';
import { boundsUniform, fragment, vec3Of } from '../../gpu/glsl.js';

const BODY = `
void main() {
  vec2 p = worldAt(pixelCenter());
  if (isIce(p)) outColor = vec4(${vec3Of(COLORS.ICE)}, 1.0);
  else if (isSea(p)) outColor = vec4(${vec3Of(COLORS.SEA)}, 1.0);
  else outColor = vec4(0.0);
}`;

/** Deniz ve buzulları ekran kartında, tuvalin her pikseli için boyar. */
export class GpuSeaPainter {
  constructor(gpuWorld) {
    this.gpuWorld = gpuWorld;
    this.program = gpuWorld.gpu.program(fragment(gpuWorld.world, BODY));
  }

  get sampleSize() {
    return this.gpuWorld.gpu.sampleSize;
  }

  paint(target, { bounds }) {
    this.gpuWorld.paint(target, this.program, { u_bounds: boundsUniform(bounds) });
  }
}
