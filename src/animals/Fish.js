import { ANIMALS, COLORS } from '../config.js';
import { Season } from '../core/Season.js';
import { Items } from '../items/Items.js';
import { ForageBehavior } from './behavior/ForageBehavior.js';
import { SwimBehavior } from './behavior/SwimBehavior.js';
import { Herd } from './Herd.js';
import { HerdAnimal } from './HerdAnimal.js';
import { CarcassProduct } from './products/CarcassProduct.js';

const F = ANIMALS.FISH;

const GENES = Object.freeze([
  { id: 'size', name: 'Boy' }, // tutulunca verdiği et
  { id: 'fertility', name: 'Doğurganlık' },
  { id: 'hardiness', name: 'Dayanıklılık' },
]);

/** Balık: gölette ya da nehirde sürü halinde yaşar, baharda yumurtlar; oltayla tutulur. */
export class Fish extends HerdAnimal {
  static SPECIES = Object.freeze({
    id: 'fish',
    name: 'Balık',
    names: Object.freeze({ male: 'Balık', female: 'Balık', young: 'Yavru balık' }),
    color: COLORS.FISH,
    dangerous: false,
    huntable: false,
    domestication: null,
    genes: GENES,
    movement: Object.freeze({ walk: F.SWIM_SPEED, run: F.SWIM_SPEED }),
    life: Object.freeze({ adultAge: F.ADULT_AGE, oldAge: F.OLD_AGE, oldAgeRisk: F.OLD_AGE_RISK, wildAge: F.WILD_AGE }),
    needs: Object.freeze({
      foodDuration: F.FOOD_DURATION,
      waterDuration: Infinity, // suyun içinde
      starvationTime: F.STARVATION_TIME,
      freezingTime: F.STARVATION_TIME,
      healTime: F.HEAL_TIME,
      comfortTemperature: -Infinity, // buz altında da yaşar
    }),
    reproduction: Object.freeze({
      matingSeasons: [Season.SPRING],
      conceptionChance: F.CONCEPTION_CHANCE,
      gestationDays: F.GESTATION_DAYS,
      lactationDays: 0,
      litterSize: F.LITTER_SIZE,
      mateRadius: F.MATE_RADIUS,
    }),
    shelterSeasons: Object.freeze([]),
    thinkInterval: F.THINK_INTERVAL, // tehdit algılamaz; seyrek karar vermesi yeter
    maxSleep: F.MAX_SLEEP,
    glides: true, // tehlike algılamaz: yüzüşü uyurken hesaplanır, çizimde kayarak görünür
    maxHerd: 1, // sürü boyunu suyun büyüklüğü belirler (createHerd)

    createProducts: () => [new CarcassProduct(Items.FISH, { amount: (a) => Math.max(1, F.MEAT * a.genome.scale('size', 0.6, 1.4) * (a.isYoung ? 0.4 : 1)) })],
    createBehaviors: () => [new ForageBehavior({ label: 'Besleniyor', feedTime: F.FEED_TIME }), new SwimBehavior()],
  });

  /** Bir suyun balık sürüsü: yerinden ayrılmaz, boyu suyun kapasitesi kadardır. */
  static createHerd(pond) {
    const herd = new Herd(pond.position, { maxSize: pond.fishCapacity, roams: false });
    herd.pond = pond;
    pond.school = herd;
    return herd;
  }

  /** Yaşadığı gölet ya da nehir parçası. */
  get pond() {
    return this.herd?.pond;
  }

  /** Su, havanın sertliğini hissettirmez. */
  feltTemperature(world) {
    return world.weather.temperature;
  }
}
