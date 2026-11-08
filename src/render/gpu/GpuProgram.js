/** Derlenmiş bir gölgelendirici çifti; uniform'ları adlarıyla, türüne göre bağlar. */
export class GpuProgram {
  constructor(gl, vertexSource, fragmentSource) {
    this.gl = gl;
    this.program = gl.createProgram();
    gl.attachShader(this.program, GpuProgram.#compile(gl, gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(this.program, GpuProgram.#compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
    gl.bindAttribLocation(this.program, 0, 'a_position');
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error(`Gölgelendirici bağlanamadı: ${gl.getProgramInfoLog(this.program)}`);
    this.uniforms = new Map();
    const count = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const { name, type } = gl.getActiveUniform(this.program, i);
      this.uniforms.set(name, { location: gl.getUniformLocation(this.program, name), type });
    }
  }

  static #compile(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`Gölgelendirici derlenemedi: ${gl.getShaderInfoLog(shader)}`);
    return shader;
  }

  /** Kullanılmayan (derleyicinin attığı) uniform sessizce geçilir. */
  set(name, value) {
    const uniform = this.uniforms.get(name);
    if (!uniform) return;
    const { gl } = this;
    const { location, type } = uniform;
    if (type === gl.FLOAT) gl.uniform1f(location, value);
    else if (type === gl.FLOAT_VEC2) gl.uniform2fv(location, value);
    else if (type === gl.FLOAT_VEC3) gl.uniform3fv(location, value);
    else if (type === gl.FLOAT_VEC4) gl.uniform4fv(location, value);
    else if (type === gl.INT || type === gl.BOOL || type === gl.SAMPLER_2D) gl.uniform1i(location, value);
    else throw new Error(`Desteklenmeyen uniform türü: ${name}`);
  }
}
