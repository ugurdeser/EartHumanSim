/** Açılan katman (ısı, yağış, basınç, yükselti...): resmi yumuşatılarak haritanın üstüne gerilir. */
export class OverlayLayer {
  constructor(world, maps) {
    this.world = world;
    this.maps = maps;
  }

  draw(ctx) {
    this.maps.refresh();
    if (this.maps.overlay.id === 'none') return;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.maps.overlaySource.canvas, 0, 0, this.world.width, this.world.height);
  }
}
