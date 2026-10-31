import { Drive } from '../Drive.js';
import { DriveCategory } from '../DriveCategory.js';

/** Kendi başına bir eyleme dönüşmez; topluluğun yasa görüşlerini etkiler. */
export class DisgustDrive extends Drive {
  static ID = 'disgust';
  static NAME = 'Tiksinme';
  static CATEGORY = DriveCategory.PHYSIOLOGICAL;
  static DESCRIPTION = 'Kirletici maddelere veya patojenlere maruz kalmaktan kaçınmayı amaçlamak.';

  computeRaw() {
    return 0;
  }
}
