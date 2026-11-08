import { CLOUD_FIELD } from '../CloudField.js';
import { frameUniforms } from './glsl.js';

/**
 * Dünyanın ekran kartındaki ızgaraları: yükselti, deniz ve bulut deseni bir kez yüklenir;
 * hava haritaları (bulut eşiği ve rengi, kar, katman) değiştikçe tazelenir.
 */
export class GpuWorld {
  constructor(gpu, world, clouds, maps) {
    this.gpu = gpu;
    this.world = world;
    this.maps = maps;
    const { terrain } = world;
    const { cols, rows } = maps.grid;
    this.textures = {
      u_heights: gpu.floatTexture(terrain.heights, terrain.cols, terrain.rows),
      u_belts: gpu.floatTexture(terrain.belts, terrain.cols, terrain.rows),
      u_cloudField: gpu.floatTexture(clouds.values, CLOUD_FIELD.WIDTH, CLOUD_FIELD.HEIGHT),
      u_cloudThreshold: gpu.floatTexture(maps.threshold, cols, rows),
      u_cloudShade: gpu.floatTexture(maps.shade, cols, rows),
      u_snowCover: gpu.floatTexture(maps.snow, cols, rows),
      u_overlay: gpu.imageTexture(maps.overlayPixels, cols, rows),
    };
    this.synced = -1;
    this.overlay = null; // dokudaki katman resmi
  }

  /** Hava haritaları değiştiyse dokuları tazeler. */
  #sync() {
    const { maps, gpu, textures } = this;
    maps.refresh();
    const source = maps.overlaySource;
    if (this.synced === maps.version && this.overlay === source.pixels) return;
    const { cols, rows } = maps.grid;
    gpu.updateFloatTexture(textures.u_cloudThreshold, maps.threshold, cols, rows);
    gpu.updateFloatTexture(textures.u_cloudShade, maps.shade, cols, rows);
    gpu.updateFloatTexture(textures.u_snowCover, maps.snow, cols, rows);
    gpu.imageTexture(source.pixels, source.width, source.height, textures.u_overlay);
    this.synced = maps.version;
    this.overlay = source.pixels;
  }

  /** Her çizimde güncel olan ortak değerler; konumlar haritanın başlangıcından (küre bunu kullanır). */
  get uniforms() {
    const { terrain, start } = this.world;
    return {
      ...frameUniforms(this.world, 0, 0, 0),
      u_seaLevel: terrain.seaLevel,
      u_icePhase: terrain.icePhase,
      u_start: [start.x, start.y],
      u_sunX: this.world.sunX,
    };
  }

  /** `program`'ı dünyanın dokuları ve ortak değerleriyle `target`'a boyar. */
  paint(target, program, uniforms = {}, textures = {}) {
    this.#sync();
    this.gpu.paint(target, program, { textures: { ...this.textures, ...textures }, uniforms: { ...this.uniforms, ...uniforms } });
  }
}
