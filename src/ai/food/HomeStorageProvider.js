import { ActionFactory } from '../ActionFactory.js';
import { FoodProvider } from './FoodProvider.js';

const RANGE = 2000;
const PORTIONS = 4;

/** Yuvadaki depodan yiyecek almak. */
export class HomeStorageProvider extends FoodProvider {
  constructor() {
    super('home');
  }

  plan(person) {
    const storage = person.home.storage;
    if (storage.foodCount === 0 || !ActionFactory.isNearHome(person, RANGE)) return null;
    const cost = FoodProvider.travelTime(person, person.position, person.home.position) / PORTIONS;
    return { cost, action: ActionFactory.fetchFromHome(person, 'Depodan yiyecek alıyor', (t) => t.isFood, PORTIONS) };
  }
}
