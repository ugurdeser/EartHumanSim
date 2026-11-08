import { PLANTS } from '../config.js';

const MIN_SEASON_FORAGE = 0.15; // kışın bile kar altında biraz ot kalır

/** Otlak: hayvanların bulduğu ot ve otlanmanın araziye etkisi. */
export class Pasture {
  constructor(world) {
    this.world = world;
  }

  /**
   * Otlayan hayvanlar için ot bolluğu (0..1): çayırlık × mevsim × parçadaki otun durumu
   * (otlanıp seyrelen yer daha az doyurur).
   */
  forageAt(position) {
    const season = this.world.calendar.seasonAt(position);
    const cover = this.world.chunks.peek(this.world.chunks.coordX(position.x), this.world.chunks.coordY(position.y))?.ecology?.grassCover ?? 1;
    const meadow = Math.min(1, this.world.biomes.grassChance(position.x, position.y) * cover) * Math.max(MIN_SEASON_FORAGE, Math.min(1, season.growth));
    return meadow * this.world.weather.at(position).forageFactor;
  }

  /**
   * Hayvan otladı: yakındaki ot öbeklerini `food` tokluk karşılığı kadar kısaltır.
   * Ot kökünden yeniden büyür; çok otlanan yer seyrelir (forageAt düşer).
   */
  graze(position, food) {
    const chunk = this.world.chunks.peek(this.world.chunks.coordX(position.x), this.world.chunks.coordY(position.y));
    if (!chunk?.ecology) return;
    const { GRAZE_PER_FOOD, GRAZE_REACH, MIN_GROWTH } = PLANTS.GRASS;
    let left = food * GRAZE_PER_FOOD;
    const reachSq = GRAZE_REACH * GRAZE_REACH;
    for (const grass of chunk.grass) {
      if (left <= 0) break;
      if (grass.alive && grass.position.distanceSqTo(position) <= reachSq) left -= grass.browse(left, MIN_GROWTH);
    }
  }
}
