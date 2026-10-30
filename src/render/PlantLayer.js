import { COLORS } from '../config.js';
import { ChunkLayer } from './ChunkLayer.js';
import { DotPainter } from './DotPainter.js';

const FOOD_MARK_ZOOM = 4; // bu zoomdan sonra meyve/yemiş noktaları görünür
const MIN_DOT_PX = 1.5;

/** Yakın görünüm: görünür parçalardaki her bitki tek tek nokta olarak çizilir. */
export class PlantLayer {
  constructor(world) {
    this.world = world;
  }

  draw(ctx, camera) {
    if (camera.zoom < ChunkLayer.maxZoom) return;
    const palette = this.world.calendar.season.palette;
    const { minX, minY, maxX, maxY } = camera.visibleBounds;
    const grass = [];
    const bushes = [];
    const trees = [];
    this.world.chunks.forEachInRect(minX, minY, maxX, maxY, (chunk) => {
      grass.push(...chunk.grass);
      bushes.push(...chunk.bushes);
      trees.push(...chunk.standingTrees);
    });

    ctx.fillStyle = palette.ground;
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
    const minRadius = camera.pixels(MIN_DOT_PX);
    const radiusOf = (p) => Math.max(p.radius, minRadius);
    DotPainter.batch(ctx, grass, palette.grass, radiusOf);
    DotPainter.batch(ctx, bushes, palette.bush, radiusOf);
    DotPainter.batch(ctx, trees, palette.tree, radiusOf);

    if (camera.zoom >= FOOD_MARK_ZOOM) this.#drawFoodMarks(ctx, bushes, trees);
  }

  #drawFoodMarks(ctx, bushes, trees) {
    const now = this.world.now;
    const markRadius = (p) => p.radius * 0.35;
    DotPainter.batch(ctx, bushes.filter((b) => b.available(now) > 0), COLORS.BERRY, markRadius);
    DotPainter.batch(ctx, trees.filter((t) => t.available(now) > 0), COLORS.FRUIT, markRadius);
  }
}
