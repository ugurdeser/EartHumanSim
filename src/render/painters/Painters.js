import { GpuContext } from '../gpu/GpuContext.js';
import { GpuWorld } from '../gpu/GpuWorld.js';
import { CpuCloudPainter } from './cpu/CpuCloudPainter.js';
import { CpuGlobePainter } from './cpu/CpuGlobePainter.js';
import { CpuReliefPainter } from './cpu/CpuReliefPainter.js';
import { CpuSeaPainter } from './cpu/CpuSeaPainter.js';
import { GpuCloudPainter } from './gpu/GpuCloudPainter.js';
import { GpuGlobePainter } from './gpu/GpuGlobePainter.js';
import { GpuGroundPainter } from './gpu/GpuGroundPainter.js';
import { GpuReliefPainter } from './gpu/GpuReliefPainter.js';
import { GpuSeaPainter } from './gpu/GpuSeaPainter.js';

/**
 * Piksel piksel boyanan katmanların boyayıcıları: tarayıcı WebGL2 destekliyorsa ekran kartı,
 * desteklemiyorsa (ya da gölgelendirici derlenemezse) işlemci. Seçim bir kez, açılışta yapılır.
 */
export class Painters {
  static create({ world, overview, clouds, hillshade, maps, settings }) {
    const gpu = GpuContext.create(settings);
    if (gpu) {
      try {
        const gpuWorld = new GpuWorld(gpu, world, clouds, maps);
        return {
          kind: 'gpu',
          relief: new GpuReliefPainter(gpuWorld),
          sea: new GpuSeaPainter(gpuWorld),
          cloud: new GpuCloudPainter(gpuWorld),
          globe: new GpuGlobePainter(gpuWorld, overview),
          ground: new GpuGroundPainter(gpuWorld),
        };
      } catch (error) {
        console.warn('WebGL boyayıcıları kurulamadı, işlemciyle çizilecek:', error);
      }
    }
    return {
      kind: 'cpu',
      relief: new CpuReliefPainter(hillshade, settings),
      sea: new CpuSeaPainter(world, settings),
      cloud: new CpuCloudPainter(world, clouds, maps, settings),
      globe: new CpuGlobePainter(world, overview, clouds, hillshade, maps, settings),
      ground: null, // işlemcide zemin her karede boyanamaz: uzak haritanın resmi kullanılır
    };
  }
}
