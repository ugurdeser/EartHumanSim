import { ANIMALS, COLORS } from '../config.js';
import { Sex } from '../agents/Sex.js';
import { Season } from '../core/Season.js';
import { Items } from '../items/Items.js';
import { DrinkBehavior } from './behavior/DrinkBehavior.js';
import { ForageBehavior } from './behavior/ForageBehavior.js';
import { HuntBehavior } from './behavior/HuntBehavior.js';
import { IdleBehavior } from './behavior/IdleBehavior.js';
import { HerdAnimal } from './HerdAnimal.js';
import { CarcassProduct } from './products/CarcassProduct.js';

const W = ANIMALS.WOLF;
const PACK_RANGE = 120;

const GENES = Object.freeze([
  { id: 'size', name: 'Boy' },
  { id: 'speed', name: 'Hız' },
  { id: 'ferocity', name: 'Saldırganlık', mean: 0.4 }, // insana saldırma isteği, ısırık gücü
  { id: 'fertility', name: 'Doğurganlık' },
  { id: 'hardiness', name: 'Dayanıklılık' },
]);

/**
 * Kurt: sürü halinde yaşar, koyun avlar, yalnız kalan insana saldırır, kalabalıktan çekinir.
 * Vahşidir: evcilleştirilemez, sağılamaz, kırkılamaz; öldürülürse et ve post verir.
 */
export class Wolf extends HerdAnimal {
  static SPECIES = Object.freeze({
    id: 'wolf',
    name: 'Kurt',
    names: Object.freeze({ male: 'Kurt', female: 'Dişi kurt', young: 'Kurt yavrusu' }),
    color: COLORS.WOLF,
    dangerous: true,
    huntable: false,
    // yalnızca yavrusu, deneyimli bir hayvancının elinde, binde bir: uzun soluklu bir iş
    domestication: Object.freeze({ captureChance: W.CAPTURE_CHANCE, tameSessions: W.TAME_SESSIONS, minSkill: W.TAME_MIN_SKILL, youngOnly: true }),
    genes: GENES,
    movement: Object.freeze({ walk: W.ROAM_SPEED, run: W.CHASE_SPEED }),
    life: Object.freeze({ adultAge: W.ADULT_AGE, oldAge: W.OLD_AGE, oldAgeRisk: W.OLD_AGE_RISK, wildAge: W.WILD_AGE }),
    needs: Object.freeze({
      foodDuration: W.FOOD_DURATION,
      waterDuration: W.WATER_DURATION,
      starvationTime: W.STARVATION_TIME,
      freezingTime: W.FREEZING_TIME,
      healTime: W.HEAL_TIME,
      comfortTemperature: W.COMFORT_TEMPERATURE,
    }),
    reproduction: Object.freeze({
      matingSeasons: [Season.WINTER],
      conceptionChance: W.CONCEPTION_CHANCE,
      gestationDays: W.GESTATION_DAYS,
      lactationDays: W.LACTATION_DAYS,
      litterSize: W.LITTER_SIZE,
      mateRadius: PACK_RANGE * 2,
    }),
    shelterSeasons: Object.freeze([]),
    maxHerd: W.MAX_PACK,
    maxSleep: W.MAX_SLEEP,

    createProducts: () => [
      new CarcassProduct(Items.MEAT, { amount: (a) => W.MEAT * a.genome.scale('size', 0.6, 1.4) * (a.isYoung ? 0.4 : 1) }),
      new CarcassProduct(Items.HIDE, { amount: () => W.HIDE }),
    ],

    createBehaviors: () => [
      new HuntBehavior({ detectRadius: W.DETECT_RADIUS, chaseTime: W.CHASE_TIME, threshold: W.HUNT_BELOW, cooldown: W.COOLDOWN, deterrence: W.GROUP_DETERRENCE }),
      new DrinkBehavior(),
      new ForageBehavior({ label: 'Küçük av arıyor', feedTime: W.SMALL_GAME_TIME, threshold: W.HUNT_BELOW * 0.6, radius: PACK_RANGE }),
      new IdleBehavior({ radius: PACK_RANGE }),
    ],
  });

  /** Yeni sürü: üreyebilmesi için en az bir erkek ve bir dişi içerir. */
  static createPack(world, center, count) {
    const pack = Wolf.createHerd(center);
    for (let i = 0; i < count; i++) {
      const p = world.randomPointNear(center, 20);
      const wolf = Wolf.createWild(p.x, p.y, world.rng);
      if (i < 2) wolf.sex = i === 0 ? Sex.MALE : Sex.FEMALE;
      pack.add(wolf);
      world.addAnimal(wolf);
    }
    return pack;
  }

  get runSpeed() {
    return super.runSpeed * this.genome.scale('speed', 0.85, 1.15);
  }

  get isChasing() {
    return Boolean(this.brain.current?.isChasing);
  }
}
