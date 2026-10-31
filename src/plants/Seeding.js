const POLLEN_TRIES = 6; // rastgele bakılan komşu sayısı

/**
 * Tohum: anne bitkinin çevresine düşer, yer uygunsa ve parça dolu değilse fide olur.
 * Baba, annenin yakınındaki aynı türden yetişkin bir bitkidir (bulunamazsa kendi kendini tozlar).
 */
export class Seeding {
  /** Bir tohum saçar; fide çıkarsa onu döndürür. */
  static scatter(mother, chunk, world) {
    const species = mother.species;
    const point = world.randomPointNear(mother.position, species.seedRadius);
    const chunks = world.chunks;
    const target = chunks.peek(chunks.coordX(point.x), chunks.coordY(point.y));
    if (!target?.ecology) return null; // henüz izlenmeyen parçaya düşen tohum kaybolur

    const list = target[species.layer];
    const capacity = target.ecology.capacity[species.layer];
    const room = 1 - list.length / capacity;
    if (room <= 0 || !world.rng.chance(species.germination(world, point.x, point.y) * room)) return null;
    if (world.isWater(point.x, point.y, species.waterMargin)) return null;
    const spacingSq = species.spacing * species.spacing;
    if (list.some((p) => p.alive && p.position.distanceSqTo(point) < spacingSq)) return null;

    const father = Seeding.#pollinator(mother, chunk[species.layer], world.rng);
    const seedling = mother.constructor.sprout(point.x, point.y, mother, father, world.rng);
    list.push(seedling);
    target.markChanged();
    return seedling;
  }

  static #pollinator(mother, neighbours, rng) {
    if (neighbours.length < 2) return null;
    const radiusSq = mother.species.pollenRadius ** 2;
    for (let i = 0; i < POLLEN_TRIES; i++) {
      const candidate = rng.pick(neighbours);
      if (
        candidate !== mother &&
        candidate.alive &&
        candidate.isMature &&
        candidate.constructor === mother.constructor &&
        candidate.position.distanceSqTo(mother.position) <= radiusSq
      ) {
        return candidate;
      }
    }
    return null;
  }
}
