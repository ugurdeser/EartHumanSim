import { ANIMALS, AGING, COLORS } from '../config.js';
import { Season } from '../core/Season.js';
import { Items } from '../items/Items.js';
import { DrinkBehavior } from './behavior/DrinkBehavior.js';
import { FleeBehavior } from './behavior/FleeBehavior.js';
import { GrazeBehavior } from './behavior/GrazeBehavior.js';
import { IdleBehavior } from './behavior/IdleBehavior.js';
import { HerdAnimal } from './HerdAnimal.js';
import { CarcassProduct } from './products/CarcassProduct.js';
import { GrowingProduct } from './products/GrowingProduct.js';
import { WoolCoat } from './products/WoolCoat.js';

const S = ANIMALS.SHEEP;
const GRAZE_RADIUS = 25;

/** Kalıtsal özellikler: yavrular anne-babadan alır. */
const GENES = Object.freeze([
  { id: 'size', name: 'Boy' }, // et miktarı
  { id: 'woolGrowth', name: 'Yün verimi' },
  { id: 'milkYield', name: 'Süt verimi' },
  { id: 'fertility', name: 'Doğurganlık' },
  { id: 'hardiness', name: 'Dayanıklılık' }, // açlık ve soğuğa karşı
  { id: 'tameness', name: 'Uysallık', mean: 0.35 }, // insandan ne kadar ürktüğü
]);

/** Koyun: otlar, su içer, kışın yamaca sığınır; et, süt, yün ve post verir. */
export class Sheep extends HerdAnimal {
  static SPECIES = Object.freeze({
    id: 'sheep',
    name: 'Koyun',
    names: Object.freeze({ male: 'Koç', female: 'Koyun', young: 'Kuzu' }),
    color: COLORS.SHEEP,
    dangerous: false,
    huntable: true,
    domestication: Object.freeze({ captureChance: S.CAPTURE_CHANCE, tameSessions: S.TAME_SESSIONS }),
    genes: GENES,
    movement: Object.freeze({ walk: S.WALK_SPEED, run: S.FLEE_SPEED }),
    life: Object.freeze({ adultAge: S.ADULT_AGE, oldAge: S.OLD_AGE, oldAgeRisk: S.OLD_AGE_RISK, wildAge: S.WILD_AGE }),
    needs: Object.freeze({
      foodDuration: S.FOOD_DURATION,
      waterDuration: S.WATER_DURATION,
      starvationTime: S.STARVATION_TIME,
      freezingTime: S.FREEZING_TIME,
      healTime: S.HEAL_TIME,
      comfortTemperature: S.COMFORT_TEMPERATURE,
    }),
    reproduction: Object.freeze({
      matingSeasons: [Season.AUTUMN],
      conceptionChance: S.CONCEPTION_CHANCE,
      gestationDays: S.GESTATION_DAYS,
      lactationDays: S.LACTATION_DAYS,
      litterSize: S.LITTER_SIZE,
      mateRadius: GRAZE_RADIUS * 4,
    }),
    maxHerd: S.MAX_HERD,
    maxSleep: S.MAX_SLEEP,

    createProducts: () => [
      new WoolCoat(Items.WOOL, {
        perDay: (a) => S.WOOL_PER_YEAR * AGING.YEARS_PER_DAY * a.genome.scale('woolGrowth', 0.5, 1.5),
        max: (a) => S.WOOL_PER_YEAR * a.genome.scale('woolGrowth', 0.5, 1.5),
        maxInsulation: S.WOOL_INSULATION,
      }),
      new GrowingProduct(Items.MILK, {
        perDay: (a) => S.MILK_PER_DAY * a.genome.scale('milkYield', 0.5, 1.5),
        max: (a) => 2 * S.MILK_PER_DAY * a.genome.scale('milkYield', 0.5, 1.5),
        isProducing: (a, world) => a.reproduction.isLactating(world.now),
        dropsWhenIdle: true,
      }),
      new CarcassProduct(Items.MEAT, { amount: (a) => S.MEAT * a.genome.scale('size', 0.6, 1.4) * (a.isYoung ? 0.4 : 1) }),
      new CarcassProduct(Items.HIDE, { amount: () => S.HIDE }),
    ],

    createBehaviors: () => [
      new FleeBehavior({ radius: S.FLEE_RADIUS }),
      new DrinkBehavior(),
      new GrazeBehavior({ radius: GRAZE_RADIUS, grazeTime: S.GRAZE_TIME }),
      new IdleBehavior({ radius: GRAZE_RADIUS }),
    ],
  });
}
