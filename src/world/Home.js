import { Turkish } from '../core/Turkish.js';
import { Inventory } from '../items/Inventory.js';
import { Entity } from './Entity.js';
import { Fire } from './Fire.js';
import { MAX_SHELTER_LEVEL, SHELTER_LEVELS } from './ShelterLevels.js';

/** Bir kişinin (ya da ailenin) yuvası: depo, ocak ve geliştirilebilir barınak. */
export class Home extends Entity {
  constructor(x, y) {
    super(x, y);
    this.owners = new Set(); // burada yaşayanlar
    this.family = null; // varsa yuvanın sahibi olan aile
    this.storage = new Inventory();
    this.fire = new Fire();
    this.shelterLevel = 0;
    this.construction = null; // { level, progress } — malzemesi ödenmiş inşaat
  }

  /** Haritada ve panelde görünen sahiplik etiketi. */
  get label() {
    if (this.family) return this.family.name;
    const [owner] = this.owners;
    return owner ? `${Turkish.genitive(owner.name)} yuvası` : 'Terk edilmiş yuva';
  }

  get shelter() {
    return SHELTER_LEVELS[this.shelterLevel];
  }

  get hasShelter() {
    return this.shelterLevel > 0;
  }

  get restQuality() {
    return this.shelter.restQuality;
  }

  get insulation() {
    return this.shelter.insulation;
  }

  /** Sıradaki barınak basamağı (en üstteyse null). */
  get nextShelter() {
    return this.shelterLevel < MAX_SHELTER_LEVEL ? SHELTER_LEVELS[this.shelterLevel + 1] : null;
  }

  get constructionProgress() {
    return this.construction ? this.construction.progress / SHELTER_LEVELS[this.construction.level].work : 0;
  }

  addOwner(person) {
    this.owners.add(person);
  }

  removeOwner(person) {
    this.owners.delete(person);
  }

  /** Depoda malzeme varsa düşer ve inşaatı başlatır. */
  startConstruction() {
    const next = this.nextShelter;
    if (this.construction || !next) return Boolean(this.construction);
    if (!next.materials.every(([type, n]) => this.storage.has(type, n))) return false;
    for (const [type, n] of next.materials) this.storage.remove(type, n);
    this.construction = { level: next.level, progress: 0 };
    return true;
  }

  /** İnşaat ilerletir; basamak tamamlandıysa true döner. */
  build(amount) {
    if (!this.construction) return false;
    this.construction.progress += amount;
    if (this.construction.progress < SHELTER_LEVELS[this.construction.level].work) return false;
    this.shelterLevel = this.construction.level;
    this.construction = null;
    return true;
  }

  update(dt) {
    this.fire.update(dt);
  }
}
