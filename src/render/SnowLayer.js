/**
 * Yerdeki kar örtüsü: bitkilerin üstüne, göl ve canlıların altına beyazlık.
 * Atmosfer modelinin her hücresinin karı, yumuşatılarak bütün haritaya yayılır.
 */
export class SnowLayer {
  constructor(world, maps) {
    this.world = world;
    this.maps = maps;
  }

  draw(ctx) {
    this.maps.refresh();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.maps.snowCanvas, 0, 0, this.world.width, this.world.height);
  }
}
