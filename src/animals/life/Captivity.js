import { PEN } from '../../config.js';
import { Domestication } from './Domestication.js';

/** Hayvanın insanla ilişkisi: ağıl güvenliği, sahiplik, yakalanma ve kaçış. */
export class Captivity {
  constructor(animal) {
    this.animal = animal;
  }

  /** Gece ağılındaysa yırtıcı ulaşamaz; gündüz yakınında insan varken yaklaşmaz. */
  isSheltered(world) {
    const pen = this.animal.domestication?.pen;
    if (!pen) return false;
    if (world.clock.isNight && this.animal.position.distanceTo(pen.position) <= PEN.SAFE_DISTANCE) return true;
    return world.peopleNear(this.animal.position, PEN.GUARD_RANGE).length > 0;
  }

  /** Bu kişi ürününü alabilir mi: kendi ağılı ya da aynı topluluktakinin ağılı. */
  canBeHandledBy(person) {
    if (!this.animal.isTamed) return false;
    const { owner } = this.animal.domestication;
    return owner === person.home || (Boolean(person.group) && [...owner.owners].some((o) => o.group === person.group));
  }

  /** Yakalanıp ağıla katılır; yabani sürüsünden ayrılır, kendi ayağıyla ağıla yürür. */
  capture(world, pen) {
    this.animal.wake(world);
    this.animal.herd?.remove(this.animal);
    pen.herd.add(this.animal);
    this.animal.domestication = new Domestication(pen);
    world.forgetPredator(this.animal);
  }

  /** Kaçar ya da ağılı terk edilir: yabana döner, tek başına yeni bir sürü olur. */
  release(world) {
    this.animal.herd?.remove(this.animal);
    this.animal.domestication = null;
    this.animal.constructor.createHerd(this.animal.position).add(this.animal);
    world.rememberPredator(this.animal);
  }
}
