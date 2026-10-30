import { COMMUNITY, CONFLICT } from '../config.js';
import { Season } from '../core/Season.js';
import { CallbackAction } from '../actions/CallbackAction.js';
import { SequenceAction } from '../actions/SequenceAction.js';
import { ActionFactory } from '../ai/ActionFactory.js';
import { FoodPlanner } from '../ai/food/FoodPlanner.js';
import { MaterialSources } from '../ai/materials/MaterialSources.js';
import { Items } from '../items/Items.js';
import { Technologies } from '../tech/Technologies.js';
import { Laws } from './laws/Laws.js';

const winterIsNear = (world) => world.calendar.daysUntil(Season.WINTER) <= COMMUNITY.WINTER_WATCH;

/** Bir teknoloji biliniyorsa o malzemeyi depoda biriktirme emri. */
const materialOrder = (id, type, shout, skill, technologies, target) => ({
  id,
  shout,
  skills: [skill],
  need: (group) => (technologies.some((t) => group.knows(t)) ? (1 - group.stock.count(type) / target) * COMMUNITY.MATERIAL_WEIGHT : 0),
  work: (person, world) => MaterialSources.gather(person, world, type),
  keeps: (t) => t === type,
});

/**
 * Liderin verebileceği emirler. Her emir:
 *  - `need`  : topluluğun buna ne kadar ihtiyacı var (0..)
 *  - `skills`: emir sürerken hızlanan beceriler
 *  - `work`  : üyenin yapacağı iş, `keeps`: yuvaya taşınacak eşyalar
 * Yeni emir eklemek için listeye bir kayıt yeterli.
 */
export const COMMUNITY_ORDERS = Object.freeze([
  {
    id: 'food',
    shout: 'Yiyecek toplayın!',
    skills: ['gathering', 'hunting', 'fishing'],
    need: (group, world) => {
      const shortage = 1 - group.stock.food / (group.size * COMMUNITY.FOOD_PER_HEAD);
      return winterIsNear(world) ? shortage * COMMUNITY.WINTER_FOOD_WEIGHT : shortage;
    },
    work: (person, world) => FoodPlanner.bestAcquisition(person, world, { excludeHome: true }),
    keeps: (t) => t.isFood,
  },
  {
    id: 'wood',
    shout: 'Odun kesin!',
    skills: ['woodcutting', 'gathering'],
    need: (group, world) => {
      const { fuelSeconds, homes } = group.stock;
      const shortage = 1 - fuelSeconds / (homes * COMMUNITY.FUEL_PER_HOME);
      return winterIsNear(world) ? shortage : shortage * COMMUNITY.SUMMER_FUEL_WEIGHT;
    },
    work: (person, world) => ActionFactory.gatherFuel(person, world),
    keeps: (t) => t.isFuel,
  },
  {
    id: 'raid',
    shout: 'Rakiplerin deposuna baskın yapın!',
    skills: ['hunting'],
    need: (group, world) => {
      const shortage = 1 - group.stock.food / (group.size * COMMUNITY.FOOD_PER_HEAD);
      if (group.constitution.is(Laws.RAIDS, 'forbidden')) return 0;
      const desperate = world.calendar.year >= CONFLICT.RAID_YEAR && shortage > CONFLICT.RAID_SHORTAGE;
      return desperate && group.raidTarget() ? shortage * COMMUNITY.WINTER_FOOD_WEIGHT : 0;
    },
    work: (person) => {
      const home = person.group.raidTarget();
      if (!home) return null;
      return new SequenceAction('Baskına gidiyor', [
        ActionFactory.goTo('Baskın için yola çıktı', home.position, { arriveDistance: 3 }),
        new CallbackAction('Baskın yapıyor', (p, w) => w.social.conflicts.raid(p, home)),
      ]);
    },
    keeps: (t) => t.isFood,
  },
  materialOrder('stone', Items.STONE, 'Taş çıkarın!', 'mining', [Technologies.STONE_HOUSE, Technologies.STONE_ROAD], COMMUNITY.STONE_TARGET),
  materialOrder('clay', Items.CLAY, 'Kil çıkarın!', 'mining', [Technologies.POTTERY], COMMUNITY.CLAY_TARGET),
]);
