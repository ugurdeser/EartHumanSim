import { LogType } from '../core/EventLog.js';
import { Turkish } from '../core/Turkish.js';

const BASE_INVENTION_CHANCE = 0.02;
const BASE_TEACH_CHANCE = 0.1;
const MIN_LEARNING_AGE = 6;

/** Zekânın asıl işe yaradığı yer: yeni teknikleri icat etmek ve başkalarından öğrenmek. */
export class InventionService {
  constructor(world) {
    this.world = world;
  }

  /** Deneme/oyun/keşif sonrası icat şansı. `effort` 1 = tam bir deneme oturumu. */
  tryInvent(person, effort = 1) {
    if (person.ageYears < MIN_LEARNING_AGE) return null;
    const candidates = person.knowledge.researchable;
    if (candidates.length === 0) return null;
    const technology = this.world.rng.pick(candidates);
    const brilliance = Math.pow(0.3 + person.traits.intelligence, 2);
    const chance = BASE_INVENTION_CHANCE * effort * brilliance * (1 - technology.difficulty);
    if (!this.world.rng.chance(chance)) return null;

    person.knowledge.learn(technology);
    person.changeStatus(0.1);
    this.world.log.add(`💡 ${person.name} ${technology.skill} keşfetti!`, LogType.BUILD, [person]);
    return technology;
  }

  /** Sohbet ya da çocuk bakımı sırasında bilgi aktarımı. */
  tryTeach(teacher, learner) {
    if (learner.ageYears < MIN_LEARNING_AGE) return null;
    const teachable = teacher.knowledge.teachableTo(learner.knowledge);
    if (teachable.length === 0) return null;
    const technology = this.world.rng.pick(teachable);
    const chance = BASE_TEACH_CHANCE + learner.traits.intelligence * 0.3;
    if (!this.world.rng.chance(chance)) return null;

    learner.knowledge.learn(technology);
    this.world.log.add(
      `📚 ${learner.name}, ${Turkish.ablative(teacher.name)} ${technology.skill} öğrendi`,
      LogType.SOCIAL,
      [teacher, learner],
    );
    return technology;
  }
}
