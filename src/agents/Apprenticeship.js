import { SKILLS } from '../config.js';
import { LogType } from '../core/EventLog.js';
import { SKILL_DEFINITIONS } from './Skills.js';

/** Beceri kazanmak: yaparak öğrenme, ustanın yanında çıraklık. */
export class Apprenticeship {
  constructor(person) {
    this.person = person;
  }

  /** `hours` saat çalıştı: zekâ öğrenmeyi hızlandırır, yanında usta varsa iki kat öğrenir. */
  improveSkill(skill, hours, world) {
    const before = this.person.skills.get(skill);
    const mentor = this.#mentorFor(skill, before, world);
    if (mentor) this.person.relationTo(mentor).changeRespect(SKILLS.APPRENTICE_RESPECT);
    this.person.skills.practice(skill, hours * (0.5 + this.person.traits.intelligence) * (mentor ? SKILLS.APPRENTICE_RATE : 1));
    if (before < SKILLS.MASTER_LEVEL && this.person.skills.get(skill) >= SKILLS.MASTER_LEVEL) {
      const { name } = SKILL_DEFINITIONS.find((s) => s.id === skill);
      world.log.add(`🎓 ${this.person.name}, ${name} ustası oldu`, LogType.BUILD, [this.person]);
    }
  }

  /** Yakında bu işi kendisinden iyi bilen bir usta. */
  #mentorFor(skill, level, world) {
    if (level >= SKILLS.MASTER_LEVEL) return null;
    const reachable = (p) => (this.person.group && p.group === this.person.group) || p.position.distanceTo(this.person.position) <= SKILLS.APPRENTICE_RANGE;
    return world.peopleNear(this.person.position, SKILLS.COMMUNITY_APPRENTICE_RANGE, this.person).find((p) => p.skills.get(skill) >= SKILLS.MASTER_LEVEL && reachable(p)) ?? null;
  }

  improveRandomSkill(hours, world) {
    this.person.improveSkill(this.person.rng.pick(SKILL_DEFINITIONS).id, hours, world);
  }
}
