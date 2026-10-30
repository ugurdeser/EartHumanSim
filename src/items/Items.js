import { HOUR } from '../config.js';
import { FoodType, MaterialType, ToolType } from './ItemType.js';

/** Alet yetenekleri. */
export const Capability = Object.freeze({
  CHOP: 'chop', // ağaç kesmek
  FISH: 'fish', // balık tutmak
  HUNT: 'hunt', // avlanmak
  DEFEND: 'defend', // yırtıcılara karşı savunma
});

/** Oyundaki tüm eşya türleri. Yeni eşya eklemek için buraya bir satır yeterli. */
export const Items = Object.freeze({
  // Yiyecekler
  BERRY: new FoodType('berry', 'Yemiş', { weight: 0.2, nutrition: 0.25, icon: '🫐' }),
  FRUIT: new FoodType('fruit', 'Meyve', { weight: 0.3, nutrition: 0.3, icon: '🍎' }),
  MEAT: new FoodType('meat', 'Et', { weight: 1, nutrition: 0.3, cookedNutrition: 0.6, icon: '🍖' }),
  FISH: new FoodType('fish', 'Balık', { weight: 0.6, nutrition: 0.25, cookedNutrition: 0.45, icon: '🐟' }),

  // Malzemeler
  BRANCH: new MaterialType('branch', 'Dal', { weight: 0.5, fuelSeconds: 1 * HOUR, icon: '🌿' }),
  WOOD: new MaterialType('wood', 'Odun', { weight: 2, fuelSeconds: 4 * HOUR, icon: '🪵' }),
  STONE: new MaterialType('stone', 'Taş', { weight: 3, icon: '🪨' }),
  FLINT: new MaterialType('flint', 'Çakmaktaşı', { weight: 0.5, icon: '◆' }),

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
});

export const FOOD_TYPES = Object.freeze(Object.values(Items).filter((t) => t.isFood));
export const FUEL_TYPES = Object.freeze(Object.values(Items).filter((t) => t.isFuel));
