import { CloudField } from '../../CloudField.js';
import { boundsUniform, fragment } from '../../gpu/glsl.js';

const BODY = `
uniform float u_shadow;     // 1: gölge geçişi, 0: bulut geçişi
uniform vec2 u_offset;      // gölgenin buluta göre kayması (m)

void main() {
  vec2 p = worldAt(pixelCenter());
  if (u_shadow > 0.5) {
    // gölge, güneşin ters yönünde kaymış buluttur
    float shade = cloudOpacity(mod(p.x - u_offset.x, WORLD_W) / WORLD_W, clamp((p.y - u_offset.y) / WORLD_H, 0.0, 1.0));
    outColor = vec4(0.0, 0.0, 0.0, shade);
    return;
  }
  float u = mod(p.x, WORLD_W) / WORLD_W;
  float v = clamp(p.y / WORLD_H, 0.0, 1.0);
  float opacity = cloudOpacity(u, v);
  float shade = cloudShade(u, v); // yağmur bulutunun altı koyu
  vec3 rgb = min(vec3(shade, shade, shade + 4.0 / 255.0), 1.0);
  outColor = vec4(rgb * opacity, opacity);
}`;

/** Bulutları ve yere düşen gölgelerini ekran kartında, tuvalin her pikseli için boyar. */
export class GpuCloudPainter {
  constructor(gpuWorld) {
    this.gpuWorld = gpuWorld;
    this.program = gpuWorld.gpu.program(fragment(gpuWorld.world, BODY));
  }

  get sampleSize() {
    return this.gpuWorld.gpu.sampleSize;
  }

  paint(targets, { bounds, days, offset }) {
    const uniforms = {
      u_bounds: boundsUniform(bounds),
      u_drift: CloudField.drift(days),
      u_offset: [offset.x, offset.y],
    };
    this.gpuWorld.paint(targets.shadow, this.program, { ...uniforms, u_shadow: 1 });
    this.gpuWorld.paint(targets.cloud, this.program, { ...uniforms, u_shadow: 0 });
  }
}
