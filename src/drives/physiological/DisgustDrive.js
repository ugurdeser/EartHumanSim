import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

/** Şimdilik yalnızca kirli sudan kaçınmayı belirler; kendi başına bir eyleme dönüşmez. */
export class DisgustDrive extends Drive {
  static ID = 'disgust';
  static NAME = 'Tiksinme';
  static CATEGORY = DriveCategory.PHYSIOLOGICAL;
  static DESCRIPTION = 'Kirletici maddelere veya patojenlere maruz kalmaktan kaçınmayı amaçlamak.';

  /** Tiksinme duyarlılığı yüksek kişiler kirli suyu içmez. */
  get avoidsDirtyWater() {
    return this.weight >= 0.7;
  }

  computeRaw() {
    return 0;
  }
}
