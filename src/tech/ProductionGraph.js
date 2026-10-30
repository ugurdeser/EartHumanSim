import { HOUR, ROAD } from '../config.js';
import { ClothingType, ToolType } from '../items/ItemType.js';
import { Capability, FOOD_TYPES, FUEL_TYPES, Items } from '../items/Items.js';
import { SHELTER_LEVELS } from '../world/ShelterLevels.js';
import { ALL_RECIPES } from './Recipes.js';
import { ALL_TECHNOLOGIES, Technologies } from './Technologies.js';

/** Düğüm türleri: arayüzdeki rengi ve listedeki yeri bunlara göre belirlenir. */
export const NodeKind = Object.freeze({
  NATURE: 'nature',
  MATERIAL: 'material',
  FOOD: 'food',
  TOOL: 'tool',
  CLOTHING: 'clothing',
  STRUCTURE: 'structure',
  TECHNOLOGY: 'technology',
});

/** Bağ türleri: malzeme harcanır, alet gerekir ama harcanmaz, bilgi öğrenilmiş olmalıdır. */
export const LinkKind = Object.freeze({
  NATURE: 'nature',
  INPUT: 'input',
  TOOL: 'tool',
  KNOWLEDGE: 'knowledge',
});

const Nature = Object.freeze({
  TREE: { id: 'nature:tree', name: 'Ağaç', icon: '🌳', detail: 'dal, odun, meyve' },
  BUSH: { id: 'nature:bush', name: 'Çalı', icon: '🌿', detail: 'yemiş' },
  STONE_MINE: { id: 'nature:stone_mine', name: 'Taş ocağı', icon: '⛰', detail: 'taş' },
  FLINT_MINE: { id: 'nature:flint_mine', name: 'Çakmaktaşı yatağı', icon: '⛰', detail: 'çakmaktaşı' },
  CLAY_PIT: { id: 'nature:clay_pit', name: 'Kil yatağı', icon: '⛰', detail: 'kil' },
  SHEEP: { id: 'nature:sheep', name: 'Koyun', icon: '🐑', detail: 'et, süt, yün, post' },
  WOLF: { id: 'nature:wolf', name: 'Kurt', icon: '🐺', detail: 'et, post' },
  WATER: { id: 'nature:water', name: 'Gölet / nehir', icon: '💧', detail: 'balık, su' },
});

/** Eşyanın doğadaki kaynağı: [eşya, kaynaklar, gereken alet yeteneği]. */
const ORIGINS = [
  [Items.BRANCH, [Nature.TREE]],
  [Items.WOOD, [Nature.TREE], Capability.CHOP],
  [Items.STONE, [Nature.STONE_MINE]],
  [Items.FLINT, [Nature.FLINT_MINE]],
  [Items.CLAY, [Nature.CLAY_PIT]],
  [Items.WATER, [Nature.WATER], Capability.CARRY_WATER],
  [Items.WOOL, [Nature.SHEEP], Capability.CUT],
  [Items.HIDE, [Nature.SHEEP, Nature.WOLF], Capability.HUNT],
  [Items.MEAT, [Nature.SHEEP, Nature.WOLF], Capability.HUNT],
  [Items.MILK, [Nature.SHEEP]],
  [Items.FISH, [Nature.WATER], Capability.FISH],
  [Items.FRUIT, [Nature.TREE]],
  [Items.BLUEBERRY, [Nature.BUSH]],
  [Items.STRAWBERRY, [Nature.BUSH]],
  [Items.BLACKBERRY, [Nature.BUSH]],
  [Items.RASPBERRY, [Nature.BUSH]],
];

const FIRE = { id: 'structure:fire', name: 'Ocak', icon: '🔥', detail: 'ısıtır, yemek pişirir' };
const COOKED = { id: 'structure:cooked', name: 'Pişmiş yemek', icon: '🍲', detail: 'et ve balık daha çok doyurur' };
const ROAD_NODE = { id: 'structure:road', name: 'Taş yol', icon: '🛣', detail: `yürüyüş ×${ROAD.SPEED_BONUS}` };

const itemKind = (type) => {
  if (type.isFood) return NodeKind.FOOD;
  if (type instanceof ClothingType) return NodeKind.CLOTHING;
  if (type instanceof ToolType) return NodeKind.TOOL;
  return NodeKind.MATERIAL;
};

const itemDetail = (type) => {
  if (type.isFood) return type.cookable ? `besin ${type.nutrition} · pişince ${type.cookedNutrition}` : `besin ${type.nutrition}`;
  if (type instanceof ClothingType) return `soğuğa +${type.insulation}°C`;
  if (type.isTool) return `${type.durability} kullanım`;
  return type.isFuel ? `yakıt ${type.fuelSeconds / HOUR} saat` : '';
};

/**
 * Üretim zinciri: ne neyden yapılır, neye dönüşür. Tarif, barınak ve teknoloji
 * tanımlarından kurulur; yeni bir tarif eklenince burada kendiliğinden görünür.
 */
export class ProductionGraph {
  constructor() {
    this.nodes = new Map();
    this.needsOf = new Map();
    this.usesOf = new Map();

    for (const nature of Object.values(Nature)) this.#addNode({ ...nature, kind: NodeKind.NATURE });
    for (const type of Object.values(Items)) this.#addNode({ id: type.id, name: type.name, icon: type.icon, kind: itemKind(type), detail: itemDetail(type) });
    for (const tech of ALL_TECHNOLOGIES) this.#addNode({ id: ProductionGraph.#techId(tech), name: tech.name, icon: '💡', kind: NodeKind.TECHNOLOGY, detail: tech.locked ? 'henüz kapalı' : `zorluk ${tech.difficulty}` });

    this.#addNode({ ...FIRE, kind: NodeKind.STRUCTURE });
    this.#linkOrigins();
    this.#linkTechnologies();
    this.#linkRecipes();
    this.#linkStructures();
  }

  static #techId(tech) {
    return `tech:${tech.id}`;
  }

  static #toolFor(capability) {
    return Object.values(Items).find((type) => type.isTool && type.can(capability));
  }

  needs(id) {
    return this.needsOf.get(id) ?? [];
  }

  uses(id) {
    return this.usesOf.get(id) ?? [];
  }

  ofKind(...kinds) {
    return [...this.nodes.values()].filter((node) => kinds.includes(node.kind));
  }

  #addNode(node) {
    this.nodes.set(node.id, node);
    this.needsOf.set(node.id, []);
    this.usesOf.set(node.id, []);
  }

  /** `from` olmadan `to` olmaz; aynı bağ iki kez eklenmez. */
  #link(fromId, toId, kind, label = '') {
    const needs = this.needsOf.get(toId);
    if (needs.some((l) => l.node.id === fromId && l.kind === kind)) return;
    needs.push({ node: this.nodes.get(fromId), kind, label });
    this.usesOf.get(fromId).push({ node: this.nodes.get(toId), kind, label });
  }

  #linkOrigins() {
    for (const [type, sources, capability] of ORIGINS) {
      for (const source of sources) this.#link(source.id, type.id, LinkKind.NATURE, 'doğadan');
      if (capability) this.#link(ProductionGraph.#toolFor(capability).id, type.id, LinkKind.TOOL, 'alet');
    }
  }

  #linkTechnologies() {
    for (const tech of ALL_TECHNOLOGIES) {
      for (const prerequisite of tech.prerequisites) this.#link(`tech:${prerequisite}`, ProductionGraph.#techId(tech), LinkKind.KNOWLEDGE, 'önce');
    }
  }

  #linkRecipes() {
    for (const recipe of ALL_RECIPES) {
      for (const [type, amount] of recipe.inputs) this.#link(type.id, recipe.output.id, LinkKind.INPUT, `×${amount}`);
      this.#link(ProductionGraph.#techId(recipe.technology), recipe.output.id, LinkKind.KNOWLEDGE, 'bilgi');
      if (recipe.needsFire) this.#link(FIRE.id, recipe.output.id, LinkKind.TOOL, 'ateş');
    }
  }

  #linkStructures() {
    let previous = null;
    for (const level of SHELTER_LEVELS.filter((l) => l.level > 0)) {
      const id = `structure:shelter${level.level}`;
      this.#addNode({ id, name: level.name, icon: '🛖', kind: NodeKind.STRUCTURE, detail: `soğuğa +${level.insulation}°C · dinlenme ×${level.restQuality}` });
      for (const [type, amount] of level.materials) this.#link(type.id, id, LinkKind.INPUT, `×${amount}`);
      if (level.technology) this.#link(ProductionGraph.#techId(level.technology), id, LinkKind.KNOWLEDGE, 'bilgi');
      if (previous) this.#link(previous, id, LinkKind.INPUT, 'üstüne');
      previous = id;
    }

    this.#addNode({ ...ROAD_NODE, kind: NodeKind.STRUCTURE });
    this.#link(Items.STONE.id, ROAD_NODE.id, LinkKind.INPUT, '×1 / kare');
    this.#link(ProductionGraph.#techId(Technologies.STONE_ROAD), ROAD_NODE.id, LinkKind.KNOWLEDGE, 'bilgi');

    for (const type of FUEL_TYPES) this.#link(type.id, FIRE.id, LinkKind.INPUT, `${type.fuelSeconds / HOUR} saat`);
    this.#link(ProductionGraph.#techId(Technologies.FIRE_MAKING), FIRE.id, LinkKind.KNOWLEDGE, 'bilgi');

    this.#addNode({ ...COOKED, kind: NodeKind.STRUCTURE });
    for (const type of FOOD_TYPES.filter((t) => t.cookable)) this.#link(type.id, COOKED.id, LinkKind.INPUT, 'çiğ');
    this.#link(FIRE.id, COOKED.id, LinkKind.TOOL, 'ateş');
    this.#link(ProductionGraph.#techId(Technologies.COOKING), COOKED.id, LinkKind.KNOWLEDGE, 'bilgi');
  }
}
