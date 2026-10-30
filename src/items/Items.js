import { HOUR } from '../config.js';
import { BagType, ClothingSlot, ClothingType, FoodType, MaterialType, SeedType, ToolType } from './ItemType.js';

const WOOL_LIFE = 360; // giysi ömrü: giyildiği gün sayısı
const LEATHER_LIFE = 720;
const CLOAK_LIFE = 540;

/** Alet yetenekleri. */
export const Capability = Object.freeze({
  CHOP: 'chop', // ağaç kesmek
  FISH: 'fish', // balık tutmak
  HUNT: 'hunt', // avlanmak
  DEFEND: 'defend', // yırtıcılara karşı savunma
  CUT: 'cut', // kesmek (yün kırkmak)
  CARRY_WATER: 'carry_water', // yanında su taşımak
});

/** Oyundaki tüm eşya türleri. Yeni eşya eklemek için buraya bir satır yeterli. */
export const Items = Object.freeze({
  // Yiyecekler
  BLUEBERRY: new FoodType('blueberry', 'Yaban mersini', { weight: 0.2, nutrition: 0.25, icon: '🫐' }),
  STRAWBERRY: new FoodType('strawberry', 'Yaban çileği', { weight: 0.15, nutrition: 0.2, icon: '🍓' }),
  BLACKBERRY: new FoodType('blackberry', 'Böğürtlen', { weight: 0.2, nutrition: 0.25, icon: '🍇' }),
  RASPBERRY: new FoodType('raspberry', 'Ahududu', { weight: 0.15, nutrition: 0.25, icon: '🍒' }),
  FRUIT: new FoodType('fruit', 'Meyve', { weight: 0.3, nutrition: 0.3, icon: '🍎' }),
  MEAT: new FoodType('meat', 'Et', { weight: 1, nutrition: 0.3, cookedNutrition: 0.6, icon: '🍖' }),
  FISH: new FoodType('fish', 'Balık', { weight: 0.6, nutrition: 0.25, cookedNutrition: 0.45, icon: '🐟' }),
  MILK: new FoodType('milk', 'Süt', { weight: 0.5, nutrition: 0.25, icon: '🥛' }),

  // Malzemeler
  BRANCH: new MaterialType('branch', 'Dal', { weight: 0.5, fuelSeconds: 2 * HOUR, icon: '🌿' }),
  WOOD: new MaterialType('wood', 'Odun', { weight: 2, fuelSeconds: 8 * HOUR, icon: '🪵' }),
  STONE: new MaterialType('stone', 'Taş', { weight: 3, icon: '🪨' }),
  FLINT: new MaterialType('flint', 'Çakmaktaşı', { weight: 0.5, icon: '◆' }),
  WOOL: new MaterialType('wool', 'Yün', { weight: 0.4, icon: '🧶' }),
  HIDE: new MaterialType('hide', 'Post', { weight: 1.5, icon: '🐑' }),
  CLAY: new MaterialType('clay', 'Kil', { weight: 2, icon: '🟤' }),
  THIN_YARN: new MaterialType('thin_yarn', 'İnce yün ipi', { weight: 0.1, icon: '🧵' }),
  THICK_YARN: new MaterialType('thick_yarn', 'Kalın yün ipi', { weight: 0.2, icon: '🧶' }),
  LEATHER: new MaterialType('leather', 'İşlenmiş deri', { weight: 1, icon: '🟫' }),
  THONG: new MaterialType('thong', 'Deri sırım', { weight: 0.05, icon: '➰' }),
  WATER: new MaterialType('water', 'Su', { weight: 0.5, icon: '💧' }),

  // Tohumlar
  BLUEBERRY_SEED: new SeedType('blueberry_seed', 'Yaban mersini tohumu', { weight: 0.02, icon: '🌱' }),
  STRAWBERRY_SEED: new SeedType('strawberry_seed', 'Yaban çileği tohumu', { weight: 0.02, icon: '🌱' }),
  BLACKBERRY_SEED: new SeedType('blackberry_seed', 'Böğürtlen tohumu', { weight: 0.02, icon: '🌱' }),
  RASPBERRY_SEED: new SeedType('raspberry_seed', 'Ahududu tohumu', { weight: 0.02, icon: '🌱' }),
  FRUIT_SEED: new SeedType('fruit_seed', 'Meyve çekirdeği', { weight: 0.05, icon: '🌰' }),

  // Aletler ve silahlar
  STONE_AXE: new ToolType('stone_axe', 'Taş balta', { weight: 2, durability: 40, capabilities: [Capability.CHOP], icon: '🪓' }),
  FISHING_ROD: new ToolType('fishing_rod', 'Olta', { weight: 0.5, durability: 30, capabilities: [Capability.FISH], icon: '🎣' }),
  SPEAR: new ToolType('spear', 'Çakmaktaşı mızrak', {
    weight: 1.5,
    durability: 25,
    capabilities: [Capability.HUNT, Capability.DEFEND],
    power: 0.35,
    icon: '🗡',
  }),
  FLINT_KNIFE: new ToolType('flint_knife', 'Çakmaktaşı bıçak', { weight: 0.3, durability: 30, capabilities: [Capability.CUT], icon: '🔪' }),
  WATER_JAR: new ToolType('water_jar', 'Su testisi', { weight: 1, durability: 40, capabilities: [Capability.CARRY_WATER], icon: '🏺' }),

  // Giysiler (üzerinde taşınınca soğuktan korur)
  HIDE_CLOAK: new ClothingType('hide_cloak', 'Post pelerin', { durability: CLOAK_LIFE, weight: 2, insulation: 7, slot: ClothingSlot.OUTER, icon: '🧥' }),

  // Yün giysiler
  WOOL_SOCKS: new ClothingType('wool_socks', 'Yün çorap', { durability: WOOL_LIFE, weight: 0.1, insulation: 2, slot: ClothingSlot.FEET, icon: '🧦' }),
  WOOL_HAT: new ClothingType('wool_hat', 'Yün bere', { durability: WOOL_LIFE, weight: 0.2, insulation: 2, slot: ClothingSlot.HEAD, icon: '🧢' }),
  WOOL_GLOVES: new ClothingType('wool_gloves', 'Yün eldiven', { durability: WOOL_LIFE, weight: 0.2, insulation: 2, slot: ClothingSlot.HANDS, icon: '🧤' }),
  WOOL_TSHIRT: new ClothingType('wool_tshirt', 'Yün tişört', { durability: WOOL_LIFE, weight: 0.3, insulation: 3, slot: ClothingSlot.INNER, icon: '👕' }),
  WOOL_SHIRT: new ClothingType('wool_shirt', 'Yün gömlek', { durability: WOOL_LIFE, weight: 0.4, insulation: 4, slot: ClothingSlot.INNER, icon: '👔' }),
  WOOL_SWEATER: new ClothingType('wool_sweater', 'Yün kazak', { durability: WOOL_LIFE, weight: 0.8, insulation: 8, slot: ClothingSlot.MIDDLE, icon: '🧶' }),
  WOOL_PANTS: new ClothingType('wool_pants', 'Yün pantolon', { durability: WOOL_LIFE, weight: 0.6, insulation: 4, slot: ClothingSlot.LEGS, icon: '👖' }),
  WOOL_BAG: new BagType('wool_bag', 'Yün sırt çantası', { durability: WOOL_LIFE, weight: 0.5, carryBonus: 6, icon: '🎒' }),

  // Deri giysiler
  LEATHER_BOOTS: new ClothingType('leather_boots', 'Deri çarık', { durability: LEATHER_LIFE, weight: 0.5, insulation: 3, slot: ClothingSlot.FEET, icon: '👢' }),
  LEATHER_HAT: new ClothingType('leather_hat', 'Deri bere', { durability: LEATHER_LIFE, weight: 0.3, insulation: 2, slot: ClothingSlot.HEAD, icon: '🧢' }),
  LEATHER_GLOVES: new ClothingType('leather_gloves', 'Deri eldiven', { durability: LEATHER_LIFE, weight: 0.3, insulation: 3, slot: ClothingSlot.HANDS, icon: '🧤' }),
  LEATHER_VEST: new ClothingType('leather_vest', 'Deri yelek', { durability: LEATHER_LIFE, weight: 0.8, insulation: 3, slot: ClothingSlot.INNER, icon: '🦺' }),
  LEATHER_SHIRT: new ClothingType('leather_shirt', 'Deri gömlek', { durability: LEATHER_LIFE, weight: 1, insulation: 5, slot: ClothingSlot.INNER, icon: '👔' }),
  LEATHER_JACKET: new ClothingType('leather_jacket', 'Deri ceket', { durability: LEATHER_LIFE, weight: 1.5, insulation: 9, slot: ClothingSlot.MIDDLE, icon: '🧥' }),
  LEATHER_PANTS: new ClothingType('leather_pants', 'Deri pantolon', { durability: LEATHER_LIFE, weight: 1.2, insulation: 5, slot: ClothingSlot.LEGS, icon: '👖' }),
  LEATHER_BAG: new BagType('leather_bag', 'Deri sırt çantası', { durability: LEATHER_LIFE, weight: 1, carryBonus: 10, icon: '🎒' }),
});

export const FOOD_TYPES = Object.freeze(Object.values(Items).filter((t) => t.isFood));
export const FUEL_TYPES = Object.freeze(Object.values(Items).filter((t) => t.isFuel));
export const SEED_TYPES = Object.freeze(Object.values(Items).filter((t) => t.isSeed));
