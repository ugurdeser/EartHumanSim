import { PLANTS } from '../config.js';
import { Items } from '../items/Items.js';
import { FoodSource } from './FoodSource.js';

export class Tree extends FoodSource {
  constructor(x, y, { radius, fruitful }) {
    super(x, y, { capacity: fruitful ? PLANTS.TREE_CAPACITY : 0, regrowTime: PLANTS.TREE_REGROW, food: Items.FRUIT });
    this.radius = radius;
    this.fruitful = fruitful;
    this.felled = false;
  }

  /** Baltayla kesilir; odun verir ve haritadan kalkar. */
  fell() {
    this.felled = true;
    this.capacity = 0;
    this.touched = true;
    return PLANTS.WOOD_PER_TREE;
  }
}
