import { FAMILY } from '../config.js';
import { DeathReport } from '../agents/DeathReport.js';
import { LogType } from '../core/EventLog.js';
import { Vector2 } from '../core/Vector2.js';
import { Kinship } from '../society/Kinship.js';
import { Home } from './Home.js';

/** Nüfus olayları: doğum, erginlik, yeni yuva ve ölüm. */
export class Demography {
  constructor(world) {
    this.world = world;
  }

  birth(mother, father) {
    const child = this.world.personFactory.createChild(mother, father);
    this.world.addPerson(child);
    this.world.social.families.registerBirth(child, mother);
    this.world.log.add(`👶 ${mother.name} ve ${father?.name ?? '?'} bir çocuk sahibi oldu: ${child.fullName}`, LogType.LIFE, [mother, father, child]);
    const gifts = child.traits.sharedParentalStrengths(mother.traits, father?.traits);
    if (gifts.length) this.world.log.personal([child], `🧬 Anne ve babasının ortak özelliğini aldı: ${gifts.join(', ')}`, LogType.LIFE);
    this.#notifyRelatives(child, () => `👶 ${Kinship.siblingWord(child)} ${child.name} doğdu`, [...child.siblings]);
    return child;
  }

  /** Yetişkin olan kişi ailesinin yakınında kendi yuvasını kurar; artık kendi ailesini kurabilir. */
  comeOfAge(person) {
    this.world.social.families.leave(person);
    this.world.settleAlone(person);
    this.world.log.add(`🧑 ${person.fullName} ${person.age} yaşına girdi ve kendi yuvasını kurdu`, LogType.LIFE, [person]);
  }

  /** Kişi eski yuvasının yakınında kendine yeni bir yuva kurar. */
  settleAlone(person) {
    const spot = this.world.spotNear(person.group?.center ?? person.home.position);
    person.moveHome(this.world.addHome(new Home(spot.x, spot.y)));
  }

  /** Bir noktanın yakınında yuva kurulabilecek kuru bir yer. */
  spotNear(origin) {
    const [min, max] = FAMILY.OWN_HOME_DISTANCE;
    let spot;
    do {
      spot = origin.clone().add(Vector2.fromAngle(this.world.rng.angle(), this.world.rng.range(min, max)));
      this.world.clampPosition(spot);
    } while (this.world.isWater(spot.x, spot.y, 5));
    return spot;
  }

  killPerson(person, cause) {
    if (!person.alive) return;
    person.deathReport = new DeathReport(person, this.world);
    person.die(cause, this.world.now);
    this.world.people = this.world.people.filter((p) => p !== person);
    this.world.deceased.push(person);
    this.world.social.handleDeath(person);
    if (person.home.owners.size === 0) this.world.removeHome(person.home);
    this.world.log.add(`✝ ${person.fullName} ${person.age} yaşında öldü (${cause})`, LogType.DANGER, [person]);
    this.#notifyRelatives(person, (relative) => `✝ ${Kinship.describe(person, relative)} ${person.name} öldü (${cause})`);
  }

  /** Kişinin yaşayan yakınlarının hikâyesine kişisel not düşer. */
  #notifyRelatives(person, messageFor, relatives = Kinship.closeRelatives(person)) {
    for (const relative of relatives) {
      if (relative.alive) this.world.log.personal([relative], messageFor(relative), LogType.LIFE);
    }
  }
}
