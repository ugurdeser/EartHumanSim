const MAX_ALPHA = 0.55;

/** Yerdeki kar örtüsü: bitkilerin üstüne, göl ve canlıların altına beyazlık. */
export class SnowLayer {
  constructor(world) {
    this.world = world;
  }

  draw(ctx, camera) {
    const cover = this.world.weather.snowCover;
    if (cover < 0.02) return;
    const { minX, minY, maxX, maxY } = camera.visibleBounds;
    ctx.fillStyle = `rgba(246, 249, 252, ${cover * MAX_ALPHA})`;
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);
  }
}
