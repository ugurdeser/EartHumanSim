import { Turkish } from '../../core/Turkish.js';
import { MINUTE } from '../../config.js';
import { CallbackAction } from '../../actions/CallbackAction.js';
import { PerformAction } from '../../actions/PerformAction.js';
import { SequenceAction } from '../../actions/SequenceAction.js';
import { ActionFactory } from '../../ai/ActionFactory.js';
import { FoodPlanner } from '../../ai/food/FoodPlanner.js';
import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

const HUNGRY_THRESHOLD = 0.35;
const FAR_DISTANCE = 150;
const MEAL_PORTIONS = 3;

/** Çocukları beslemek, yanlarında olmak ve onlara bildiklerini öğretmek. */
export class NurtureDrive extends Drive {
  static ID = 'nurture';
  static NAME = 'Yetiştirmek / Beslemek';
  static CATEGORY = DriveCategory.REPRODUCTIVE;
  static DESCRIPTION = 'Kişinin yavrularının/gen kopyalarının çıkarlarını desteklemeye çalışmak.';

  constructor(weight) {
    super(weight);
    this.focus = null;
  }

  isApplicable(person) {
    return person.isAdult && person.dependentChildren.length > 0;
  }

  computeRaw(person) {
    let best = 0;
    this.focus = null;
    for (const child of person.dependentChildren) {
      const hunger = 1 - child.needs.food;
      const distance = person.position.distanceTo(child.position);
      const score = Math.max(
        hunger > HUNGRY_THRESHOLD ? hunger * 1.3 : 0,
        distance > FAR_DISTANCE ? 0.55 : 0,
        child.needs.health < 0.5 ? 0.8 : 0,
        child.needs.warmth < 0.5 ? 0.9 : 0,
      );
      if (score > best) {
        best = score;
        this.focus = child;
      }
    }
    return best;
  }

  createAction(person, world) {
    const child = this.focus;
    if (!child?.alive) return null;
    return 1 - child.needs.food > HUNGRY_THRESHOLD ? this.#feed(person, world, child) : this.#care(person, child);
  }

  #feed(person, world, child) {
    const fetch = person.inventory.foodCount > 0 ? null : FoodPlanner.bestAcquisition(person, world);
    if (person.inventory.foodCount === 0 && !fetch) return null;
    return new SequenceAction(`${Turkish.accusative(child.name)} besliyor`, [
      fetch,
      ActionFactory.goToPerson(`${Turkish.dative(child.name)} yiyecek götürüyor`, child, 2),
      new CallbackAction(`${Turkish.accusative(child.name)} besliyor`, (p) => {
        if (p.inventory.transferTo(child.inventory, (t) => t.isFood, MEAL_PORTIONS) === 0) return false;
        this.relieve(0.5);
        return true;
      }),
    ]);
  }

  /** Çocuğun yanında vakit geçirir; zekâsına göre ona bir şeyler öğretebilir. */
  #care(person, child) {
    return new SequenceAction(`${Turkish.dative(child.name)} bakıyor`, [
      ActionFactory.goToPerson(`${Turkish.genitive(child.name)} yanına gidiyor`, child, 4),
      new PerformAction(`${child.name} ile ilgileniyor`, 15 * MINUTE, {
        onComplete: (p, w) => {
          child.drives.get('affiliation').relieve(0.5);
          child.relationTo(p).changeAffinity(0.05);
          p.relationTo(child).changeAffinity(0.05);
          w.invention.tryTeach(p, child);
          this.relieve(0.5);
        },
      }),
    ]);
  }
}
