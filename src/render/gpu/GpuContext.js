import { GpuProgram } from './GpuProgram.js';

const VERTEX = `#version 300 es
in vec2 a_position;
void main() { gl_Position = vec4(a_position, 0.0, 1.0); }`;

/**
 * Ekran dışı tek bir WebGL2 tuvali: piksel piksel boyanan katmanlar sırayla burada çizilir,
 * sonuç her katmanın kendi resmine kopyalanır. Tarayıcı WebGL2 desteklemiyorsa `create` null döner.
 */
export class GpuContext {
  static create(settings) {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
      return gl ? new GpuContext(canvas, gl, settings) : null;
    } catch {
      return null;
    }
  }

  constructor(canvas, gl, settings) {
    this.canvas = canvas;
    this.gl = gl;
    this.settings = settings;
    this.lost = false;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.lost = true;
    });
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // ekranı örten tek üçgen
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  }

  /** Bir örneğin kapladığı ekran (CSS) pikseli: tuvalin her gerçek pikseli için bir örnek. */
  get sampleSize() {
    return 1 / ((window.devicePixelRatio || 1) * this.settings.resolution);
  }

  program(fragmentSource) {
    return new GpuProgram(this.gl, VERTEX, fragmentSource);
  }

  /** Tek kanallı 32 bit ondalık ızgara; gölgelendirici `texelFetch` ile tam değerini okur. */
  floatTexture(data, width, height) {
    const { gl } = this;
    const texture = this.#create(gl.NEAREST, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, width, height, 0, gl.RED, gl.FLOAT, data);
    return texture;
  }

  /** Daha önce oluşturulmuş ondalık ızgarayı yeni değerlerle doldurur. */
  updateFloatTexture(texture, data, width, height) {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.FLOAT, data);
  }

  /** RGBA resim; doğu-batı sarar, kutuplarda kenara yapışır, komşu pikseller harmanlanır. */
  imageTexture(pixels, width, height, texture = this.#create(this.gl.LINEAR, this.gl.REPEAT)) {
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength));
    return texture;
  }

  #create(filter, wrapS) {
    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  }

  /**
   * `program`'ı `target` boyutunda çalıştırıp sonucu `target` tuvaline kopyalar.
   * `textures`: { uniformAdı: doku }, `uniforms`: { uniformAdı: değer }.
   */
  paint(target, program, { textures = {}, uniforms = {} } = {}) {
    const { gl, canvas } = this;
    const { width, height } = target;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.useProgram(program.program);
    Object.entries(textures).forEach(([name, texture], unit) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      program.set(name, unit);
    });
    program.set('u_size', [width, height]);
    for (const [name, value] of Object.entries(uniforms)) program.set(name, value);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const ctx = target.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(canvas, 0, 0);
  }
}
