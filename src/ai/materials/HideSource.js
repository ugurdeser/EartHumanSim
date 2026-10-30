import { Items } from '../../items/Items.js';
import { HuntingProvider } from '../food/HuntingProvider.js';
import { MaterialSource } from './MaterialSource.js';

/** Post yalnızca avdan çıkar: posta ihtiyaç duyan avlanmaya gider (eti de yanına kâr). */
export class HideSource extends MaterialSource {
  constructor() {
    super(Items.HIDE);
  }

  static #findPreyWithHide(person, world) {
    const found = HuntingProvider.findPrey(person, world);
    return found && found.animal.slaughterYields().some((y) => y.type === Items.HIDE) ? found : null;
  }

  canGather(person, world) {
    return Boolean(HideSource.#findPreyWithHide(person, world));
  }

  createAction(person, world) {
    const found = HideSource.#findPreyWithHide(person, world);
    return found ? HuntingProvider.huntAction(found.animal) : null;
  }
}
