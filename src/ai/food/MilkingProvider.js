import { MINUTE } from '../../config.js';
import { Items } from '../../items/Items.js';
import { AnimalHandling } from '../husbandry/AnimalHandling.js';
import { FoodProvider } from './FoodProvider.js';

const SEARCH_RADIUS = 1200;
const WORK_TIME = 20 * MINUTE;

/** Emziren bir hayvanı sağıp süt almak; hayvan ölmez, süt yeniden birikir. */
export class MilkingProvider extends FoodProvider {
  constructor() {
    super('milking');
  }

  plan(person, world) {
    if (!person.isAdult) return null;
    const found = AnimalHandling.findReady(person, world, Items.MILK, SEARCH_RADIUS);
    if (!found) return null;
    const animal = found.animal;
    const amount = animal.products.for(Items.MILK).available(animal, world);
    const expected = amount * Items.MILK.nutrition * AnimalHandling.successChance(person, animal);
    const cost = (found.distance / person.walkSpeed + WORK_TIME) / expected;
    const action = AnimalHandling.harvestAction(person, animal, Items.MILK, { label: `${animal.displayName} sağıyor`, duration: WORK_TIME });
    return { cost, action };
  }
}
