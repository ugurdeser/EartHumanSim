import { FIRE, HOUR } from '../config.js';
import { CallbackAction } from '../actions/CallbackAction.js';
import { MoveToAction } from '../actions/MoveToAction.js';
import { PerformAction } from '../actions/PerformAction.js';
import { SequenceAction } from '../actions/SequenceAction.js';
import { WanderAction } from '../actions/WanderAction.js';
import { Inventory } from '../items/Inventory.js';
import { FUEL_TYPES, Items } from '../items/Items.js';
import { Technologies } from '../tech/Technologies.js';
import { MaterialSources } from './materials/MaterialSources.js';

const HOME_FETCH_RANGE = 2000;
const COMMUNAL_FUEL_PIECES = 3; // bir günlük odun
const UNLOAD_AT_HOME_RANGE = 500;

/** Birden çok güdünün ortak kullandığı eylem kalıpları. */
export class ActionFactory {
  static goTo(label, position, options) {
    return new MoveToAction(label, position, options);
  }

  static goToPerson(label, target, arriveDistance = 3) {
    return new MoveToAction(label, () => (target.alive ? target.position : null), { arriveDistance });
  }

  static goHome(person, label = 'Eve dönüyor') {
    return new MoveToAction(label, () => person.home.position, { arriveDistance: 2 });
  }

  static isNearHome(person, range = HOME_FETCH_RANGE) {
    return person.position.distanceTo(person.home.position) < range;
  }

  /** Yuvadaki depodan filtreye uyan eşyaları alır. */
  static fetchFromHome(person, label, filter, limit = Infinity) {
    return new SequenceAction(label, [
      ActionFactory.goHome(person, 'Depoya gidiyor'),
      new CallbackAction('Depodan alıyor', (p) => p.home.storage.transferTo(p.inventory, filter, limit) > 0),
    ]);
  }

  /** Üzerindeki filtreye uyan eşyaları yuvadaki depoya bırakır. */
  static depositAtHome(person, label, filter, onDone = null) {
    return new SequenceAction(label, [
      ActionFactory.goHome(person, 'Yuvasına taşıyor'),
      new CallbackAction('Depoya koyuyor', (p) => {
        p.inventory.transferTo(p.home.storage, filter);
        onDone?.(p);
      }),
    ]);
  }

  /**
   * Üzerinde `amount` adet olacak şekilde malzeme edinir: önce depodan, yoksa doğadan.
   * Null dönerse elde etmenin yolu yok demektir.
   */
  static obtainMaterial(person, world, type, amount) {
    const needed = amount - person.inventory.count(type);
    if (needed <= 0) return null;
    if (person.home.storage.has(type) && ActionFactory.isNearHome(person)) {
      return ActionFactory.fetchFromHome(person, `Depodan ${type.name.toLocaleLowerCase('tr')} alıyor`, (t) => t === type, needed);
    }
    return MaterialSources.gather(person, world, type);
  }

  /**
   * Yuvadaki ocağa yakıt atar (önce üzerindekinden, sonra depodan); yakıt yoksa da devam edilir.
   * Sönük ocağı yalnızca ateş yakmayı bilen tutuşturabilir.
   */
  static feedFire(person) {
    const feed = new CallbackAction('Ateşe odun atıyor', (p) => {
      const fire = p.home.fire;
      if (!ActionFactory.canKindle(p)) return;
      for (const type of FUEL_TYPES) {
        for (const inventory of [p.inventory, p.home.storage]) inventory.remove(type, fire.feed(type, inventory.count(type)));
      }
    });
    const hasFuel = person.inventory.fuelSeconds > 0 || person.home.storage.fuelSeconds > 0;
    if (person.home.fire.isLit || !hasFuel || !ActionFactory.canKindle(person)) return feed;
    return new SequenceAction('Ocağı yakıyor', [
      new PerformAction('Ateş yakıyor', FIRE.LIGHT_TIME / person.workSpeed('crafting', 'agility')),
      feed,
    ]);
  }

  /** Ocak zaten yanıyorsa ya da kişi ateş yakmayı biliyorsa ateşe yakıt atılabilir. */
  static canKindle(person) {
    return person.home.fire.isLit || person.knowledge.knows(Technologies.FIRE_MAKING);
  }

  /** Sırtı doluysa yiyeceğe yer açar: ev yakınsa yükünü depoya koyar, uzaksa yere bırakır. */
  static makeRoom(person) {
    const isLoad = (t) => !t.isFood && t !== Items.WATER;
    if (ActionFactory.isNearHome(person, UNLOAD_AT_HOME_RANGE)) return ActionFactory.depositAtHome(person, 'Yükünü eve bırakıyor', isLoad);
    return new CallbackAction('Yükünü yere bırakıyor', (p) => p.inventory.transferTo(new Inventory(), isLoad) > 0);
  }

  /** Topluluğun bölüşülmeyi bekleyen payından köy merkezine gidip yakıt alır (yoksa null). */
  static fetchCommunalFuel(person) {
    const group = person.group;
    if (!group || group.pot.fuelSeconds === 0) return null;
    return new SequenceAction('Ortak paydan yakacak alıyor', [
      new MoveToAction('Köy merkezine gidiyor', group.center.clone(), { arriveDistance: 3 }),
      new CallbackAction('Yakacak alıyor', (p) => group.pot.transferTo(p.inventory, (t) => t.isFuel, COMMUNAL_FUEL_PIECES) > 0),
    ]);
  }

  /** Yakıt bul: baltası varsa odun, yoksa dal. */
  static gatherFuel(person, world) {
    return MaterialSources.gather(person, world, Items.WOOD) ?? MaterialSources.gather(person, world, Items.BRANCH);
  }

  static searchFar(person, world, label) {
    return new MoveToAction(label, world.randomPointNear(person.position, 900), { arriveDistance: 5 });
  }

  static idle(person, world) {
    if (person.needsCare) {
      const { center, radius } = person.roamArea(world);
      const label = person.isConfined ? 'Evde bebeğiyle' : center === person.group?.center ? 'Bakıcısının yanında oynuyor' : 'Evin çevresinde oynuyor';
      return new WanderAction(label, center, radius, 0.5 * HOUR);
    }
    const center = person.isChild && person.mother?.alive ? person.mother.position : person.home.position;
    return new WanderAction('Dolaşıyor', center, person.isChild ? 40 : 150, 0.5 * HOUR);
  }
}
