import { ANIMALS } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { Turkish } from '../core/Turkish.js';
import { Capability, Items } from '../items/Items.js';

/** İnsan–hayvan çatışmalarının kuralları (saldırı araçları yalnızca hayvanlara karşı). */
export class Combat {
  /** Kurt saldırısı: mızrağı olan kendini savunabilir, hatta kurdu öldürebilir. */
  static wolfAttacksPerson(wolf, person, world) {
    const weapon = person.inventory.toolFor(Capability.DEFEND);
    if (weapon) {
      const chance = 0.25 + weapon.type.power + person.traits.strength * 0.25 + person.skills.get('hunting') * 0.25;
      Combat.#wearWeapon(person, Capability.DEFEND, world);
      if (world.rng.chance(chance)) {
        wolf.die();
        person.inventory.add(Items.MEAT, ANIMALS.WOLF.MEAT);
        person.skills.improve('hunting', 0.05, person.traits.intelligence);
        person.changeStatus(0.1);
        world.log.add(`🗡 ${person.name} saldıran kurdu mızrağıyla öldürdü!`, LogType.DANGER, [person]);
        return;
      }
    }
    world.log.add(`🐺 Bir kurt ${Turkish.dative(person.name)} saldırdı!`, LogType.DANGER, [person]);
    const toughness = 1 - person.traits.endurance * 0.3;
    person.takeDamage(ANIMALS.WOLF.ATTACK_DAMAGE * toughness, world, 'kurt saldırısı');
  }

  /** Av: başarı mızrağa, beceriye ve çevikliğe bağlı. Başarılıysa eti verir. */
  static hunt(person, animal, world) {
    const weapon = person.inventory.toolFor(Capability.HUNT);
    if (!weapon || !animal.alive) return false;
    const chance = 0.3 + weapon.type.power * 0.5 + person.skills.get('hunting') * 0.3 + person.traits.agility * 0.2;
    Combat.#wearWeapon(person, Capability.HUNT, world);
    person.skills.improve('hunting', 0.02, person.traits.intelligence);
    if (!world.rng.chance(chance)) return false;

    animal.die();
    const { type, amount } = animal.meat;
    person.inventory.add(type, amount);
    return true;
  }

  static #wearWeapon(person, capability, world) {
    const broken = person.inventory.wearTool(capability);
    if (broken) world.log.personal([person], `💥 ${broken.name} kırıldı`, LogType.INFO);
  }
}
