import { HOUR } from '../../config.js';
import { MoveToAction } from '../../actions/MoveToAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { clamp01 } from '../../core/MathUtils.js';

const REACH = 2;
const MAX_DRIFT = 6; // iş sırasında hayvan bundan fazla uzaklaşırsa ürün alınamaz
const HOLD = 10; // sn: tutulan hayvan bu süre kıpırdamaz (her adımda yenilenir)

/**
 * Canlı hayvandan ürün almanın ortak kuralları (süt sağmak, yün kırkmak ...):
 * hazır hayvanı bulmak, sakince yaklaşmak, işi yapmak. Başarı hayvanın uysallığına
 * ve kişinin hayvancılık becerisine bağlı.
 */
export class AnimalHandling {
  /** Ürünü en az `minAmount` adet hazır olan en yakın hayvan: { animal, distance } ya da null. */
  static findReady(person, world, item, radius, minAmount = 1) {
    return world.nearestAnimal(person.position, radius, (a) => a.species.domesticable && a.products.for(item)?.available(a, world) >= minAmount);
  }

  static successChance(person, animal) {
    return clamp01(0.35 + animal.genome.get('tameness') * 0.35 + person.skills.get('husbandry') * 0.3);
  }

  /** Yaklaş → işi yap → ürünü al. `onHarvest(person, world, amount)` alınca çağrılır. */
  static harvestAction(person, animal, item, { label, duration, onHarvest = null }) {
    return new SequenceAction(label, [
      new MoveToAction(`${animal.displayName} yanına yaklaşıyor`, () => (animal.alive ? animal.position : null), { arriveDistance: REACH }),
      new PerformAction(label, duration / person.workSpeed('husbandry', 'agility'), {
        onTick: (_p, w) => animal.holdUntil(w.now + HOLD),
        onComplete: (p, w) => {
          if (!animal.alive || animal.position.distanceTo(p.position) > MAX_DRIFT) return;
          p.improveSkill('husbandry', duration / HOUR, w);
          if (!w.rng.chance(AnimalHandling.successChance(p, animal))) return;
          const amount = p.inventory.add(item, animal.products.for(item).harvest(animal, w, p.inventory.roomFor(item)));
          if (amount > 0) onHarvest?.(p, w, amount);
        },
      }),
    ]);
  }
}
