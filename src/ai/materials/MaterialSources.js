import { Items } from '../../items/Items.js';
import { BranchSource } from './BranchSource.js';
import { MineSource } from './MineSource.js';
import { WoodSource } from './WoodSource.js';

/** Malzeme türü → doğadan elde etme stratejisi. */
const SOURCES = new Map([
  [Items.BRANCH, new BranchSource()],
  [Items.WOOD, new WoodSource()],
  [Items.STONE, new MineSource(Items.STONE)],
  [Items.FLINT, new MineSource(Items.FLINT, { yieldScale: 0.6 })],
]);

export class MaterialSources {
  static for(type) {
    return SOURCES.get(type) ?? null;
  }

  static canGather(person, world, type) {
    return Boolean(MaterialSources.for(type)?.canGather(person, world));
  }

  static gather(person, world, type) {
    return MaterialSources.for(type)?.createAction(person, world) ?? null;
  }
}
