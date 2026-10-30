import { PLANTS } from '../config.js';
import { Items } from '../items/Items.js';
import { FoodSource } from './FoodSource.js';

export class Bush extends FoodSource {
  constructor(x, y, { radius }) {
    super(x, y, { capacity: PLANTS.BUSH_CAPACITY, regrowTime: PLANTS.BUSH_REGROW, food: Items.BERRY });
    this.radius = radius;
  }
}
