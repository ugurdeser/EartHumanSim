import { Items } from '../../items/Items.js';
import { HuntingProvider } from '../food/HuntingProvider.js';
import { SlaughterProvider } from '../food/SlaughterProvider.js';
import { MaterialSource } from './MaterialSource.js';

/** Post avdan ya da ağıldaki fazla hayvandan çıkar: önce ağıla bakılır (eti de yanına kâr). */
export class HideSource extends MaterialSource {
  constructor() {
    super(Items.HIDE);
  }

  static #findPreyWithHide(person, world) {
    const found = HuntingProvider.findPrey(person, world);
    return found && found.animal.slaughterYields().some((y) => y.type === Items.HIDE) ? found : null;
  }

  canGather(person, world) {
    return Boolean(SlaughterProvider.findSurplus(person, world) || HideSource.#findPreyWithHide(person, world));
  }

  createAction(person, world) {
    const surplus = SlaughterProvider.findSurplus(person, world);
    if (surplus) return SlaughterProvider.slaughterAction(person, surplus);
    const found = HideSource.#findPreyWithHide(person, world);
    return found ? HuntingProvider.huntAction(found.animal) : null;
  }
}
