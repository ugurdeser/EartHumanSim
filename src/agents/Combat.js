import { ANIMALS, COMMUNITY } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { Turkish } from '../core/Turkish.js';
import { Capability } from '../items/Items.js';

/** İnsan–hayvan çatışmalarının kuralları (saldırı araçları yalnızca hayvanlara karşı). */
export class Combat {
  /** Yakındaki silahlı topluluk üyeleri. */
  static #allies(person) {
    return (person.group?.adults ?? []).filter((m) => m !== person && m.position.distanceTo(person.position) <= COMMUNITY.HELP_RANGE && m.inventory.hasCapability(Capability.DEFEND));
  }

  /** Kurt saldırısı: mızrağı olan savunur, hatta kurdu öldürebilir; topluluk üyeleri yardıma koşar. */
  static wolfAttacksPerson(wolf, person, world) {
    const allies = Combat.#allies(person);
    const defender = person.inventory.hasCapability(Capability.DEFEND) ? person : allies[0];
    if (defender) {
      const weapon = defender.inventory.toolFor(Capability.DEFEND);
      const support = (defender === person ? allies.length : allies.length - 1) * COMMUNITY.ALLY_BONUS;
      const chance = 0.25 + weapon.type.power + defender.traits.strength * 0.25 + defender.skills.get('hunting') * 0.25 + support;
      Combat.#wearWeapon(defender, Capability.DEFEND, world);
      if (world.rng.chance(chance)) {
        const yields = wolf.slaughterYields();
        wolf.die('insan');
        for (const { type, amount } of yields) defender.inventory.add(type, amount);
        defender.improveSkill('hunting', 1, world);
        defender.changeStatus(0.1);
        const saved = defender === person ? '' : ` ve ${Turkish.accusative(person.name)} kurtardı`;
        world.log.add(`🗡 ${defender.name} saldıran kurdu mızrağıyla öldürdü${saved}!`, LogType.DANGER, [defender, person]);
        return;
      }
    }
    world.log.add(`🐺 Bir kurt ${Turkish.dative(person.name)} saldırdı!`, LogType.DANGER, [person]);
    const toughness = 1 - person.traits.endurance * 0.3;
    const bite = ANIMALS.WOLF.ATTACK_DAMAGE * wolf.genome.scale('ferocity', 0.7, 1.3);
    person.takeDamage(bite * toughness, world, 'kurt saldırısı');
  }

  /** Av: başarı mızrağa, beceriye ve çevikliğe bağlı. Başarılıysa et, post ... ne çıkıyorsa verir. */
  static hunt(person, animal, world) {
    const weapon = person.inventory.toolFor(Capability.HUNT);
    if (!weapon || !animal.alive) return false;
    const chance = 0.3 + weapon.type.power * 0.5 + person.skills.get('hunting') * 0.3 + person.traits.agility * 0.2;
    Combat.#wearWeapon(person, Capability.HUNT, world);
    person.improveSkill('hunting', 1, world);
    animal.onHunted(world);
    if (!world.rng.chance(chance)) return false;

    const yields = animal.slaughterYields();
    animal.die('av');
    for (const { type, amount } of yields) person.inventory.add(type, amount);
    return true;
  }

  static #wearWeapon(person, capability, world) {
    const broken = person.inventory.wearTool(capability);
    if (broken) world.log.personal([person], `💥 ${broken.name} kırıldı`, LogType.INFO);
  }
}
