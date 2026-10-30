import { COLORS, FIRE, ROAD } from '../config.js';
import { DotPainter } from './DotPainter.js';

const LABEL_ZOOM = 0.5;
const POND_REACH = 90;

/** Yamaçlar, yollar, göletler, madenler ve yuvalar (yalnızca görünür olanlar). */
export class FeatureLayer {
  constructor(world) {
    this.world = world;
  }

  draw(ctx, camera) {
    const { minX, minY, maxX, maxY } = camera.visibleBounds;
    const inView = (grid, cb, margin = POND_REACH) => grid.forEachInRect(minX - margin, minY - margin, maxX + margin, maxY + margin, cb);

    inView(this.world.hillsideGrid, (hill) => this.#drawHillside(ctx, camera, hill), 120);
    this.#drawRoads(ctx, camera, minX, minY, maxX, maxY);
    const waters = [];
    inView(this.world.pondGrid, (pond) => {
      DotPainter.dot(ctx, pond.position.x, pond.position.y, pond.radius, pond.contaminated ? COLORS.WATER_DIRTY : COLORS.WATER);
      if (pond.mapLabel) waters.push(pond);
    });
    // yazılar suyun üstünde kalsın diye tüm sular çizildikten sonra
    if (camera.zoom >= LABEL_ZOOM) {
      for (const pond of waters) this.#label(ctx, camera, pond.mapLabel, pond.position.x, pond.position.y, pond.contaminated ? '#4a4720' : '#1f5f96');
    }
    inView(this.world.mineGrid, (mine) => this.#drawMine(ctx, camera, mine));
    inView(this.world.homeGrid, (home) => this.#drawHome(ctx, camera, home), 50);
    for (const group of this.world.social.groups.groups) this.#drawVillage(ctx, camera, group);
  }

  /** Köy merkezi: topluluk renginde halka ve adı. */
  #drawVillage(ctx, camera, group) {
    const { x, y } = group.center;
    DotPainter.ring(ctx, x, y, camera.pixels(9), group.color, camera.pixels(3));
    if (camera.zoom >= LABEL_ZOOM) this.#label(ctx, camera, group.name, x, y, group.color);
  }

  #drawRoads(ctx, camera, minX, minY, maxX, maxY) {
    if (this.world.roads.size === 0) return;
    const tiles = [];
    this.world.roads.forEachInRect(minX, minY, maxX, maxY, (tile) => tiles.push({ position: tile }));
    const radius = Math.max(ROAD.TILE * 0.45, camera.pixels(1.5));
    DotPainter.batch(ctx, tiles, COLORS.ROAD, () => radius);
  }

  #drawHillside(ctx, camera, hill) {
    const { x, y } = hill.position;
    DotPainter.dot(ctx, x, y, hill.radius, COLORS.HILLSIDE);
    if (camera.zoom >= LABEL_ZOOM) this.#label(ctx, camera, 'Yamaç', x, y, '#5e4a33');
  }

  #drawMine(ctx, camera, mine) {
    const radius = Math.max(mine.radius, camera.pixels(3));
    DotPainter.dot(ctx, mine.position.x, mine.position.y, radius, mine.color);
    if (camera.zoom >= LABEL_ZOOM) this.#label(ctx, camera, mine.name, mine.position.x, mine.position.y + radius + camera.pixels(11), '#3d4048');
  }

  #drawHome(ctx, camera, home) {
    const { x, y } = home.position;
    const radius = Math.max(2 + home.shelterLevel * 1.5, camera.pixels(3 + home.shelterLevel * 1.5));
    if (home.fire.isLit) {
      DotPainter.dot(ctx, x, y, Math.max(FIRE.RADIUS * 0.6, camera.pixels(6)), 'rgba(255, 140, 40, 0.18)');
    }
    if (home.hasShelter) DotPainter.dot(ctx, x, y, radius, COLORS.HOME);
    else DotPainter.ring(ctx, x, y, radius, COLORS.HOME, camera.pixels(1.5));
    if (home.fire.isLit) DotPainter.dot(ctx, x + radius * 0.9, y - radius * 0.9, Math.max(0.8, camera.pixels(2)), COLORS.FIRE);

    if (camera.zoom >= LABEL_ZOOM) {
      this.#label(ctx, camera, `${home.label} · ${home.shelter.name}`, x, y + radius + camera.pixels(12), COLORS.HOME);
    }
  }

  #label(ctx, camera, text, x, y, color) {
    ctx.font = `${camera.pixels(10)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    ctx.lineWidth = camera.pixels(3);
    ctx.strokeStyle = 'rgba(255, 250, 235, 0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
}
