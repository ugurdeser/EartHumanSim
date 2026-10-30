import { PLANTS } from '../config.js';
import { Season } from '../core/Season.js';
import { Items } from '../items/Items.js';
import { Bush, bushProfile } from './Bush.js';

const { BLUEBERRY, STRAWBERRY, BLACKBERRY, RASPBERRY } = PLANTS.BUSHES;
const inBushes = (world, x, y) => world.biomes.bushChance(x, y);

/** Yaban mersini: alçak, uzun ömürlü; yavaş yetişir. */
export class Blueberry extends Bush {
  static SPECIES = bushProfile(BLUEBERRY, {
    name: 'Yaban mersini',
    food: Items.BLUEBERRY,
    fruitColor: '#3f4fa8',
    seedSeasons: [Season.SUMMER, Season.AUTUMN],
    germination: inBushes,
  });
}

/** Yaban çileği: yere yakın, kısa ömürlü; çabuk yayılır, açıklıkları da sever. */
export class Strawberry extends Bush {
  static SPECIES = bushProfile(STRAWBERRY, {
    name: 'Yaban çileği',
    food: Items.STRAWBERRY,
    fruitColor: '#e0314a',
    seedSeasons: [Season.SPRING, Season.SUMMER],
    germination: (world, x, y) => Math.max(world.biomes.bushChance(x, y), world.biomes.grassChance(x, y) * 0.5),
  });
}

/** Böğürtlen: iri, dikenli; bol yemiş verir. */
export class Blackberry extends Bush {
  static SPECIES = bushProfile(BLACKBERRY, {
    name: 'Böğürtlen',
    food: Items.BLACKBERRY,
    fruitColor: '#2b1b3d',
    seedSeasons: [Season.SUMMER, Season.AUTUMN],
    germination: inBushes,
  });
}

/** Ahududu: orta boy, ömrü kısa; yemişi çabuk yenilenir. */
export class Raspberry extends Bush {
  static SPECIES = bushProfile(RASPBERRY, {
    name: 'Ahududu',
    food: Items.RASPBERRY,
    fruitColor: '#c2185b',
    seedSeasons: [Season.SUMMER],
    germination: inBushes,
  });
}

/** Haritadaki çalı türleri. Yeni çalı: sınıfını yaz, buraya ekle. */
export const BERRY_BUSHES = Object.freeze([Blueberry, Strawberry, Blackberry, Raspberry]);
