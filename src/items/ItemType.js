/** Giysinin giyildiği yer: her yerden en sıcak olan giyilir, korumalar toplanır. */
export const ClothingSlot = Object.freeze({
  HEAD: 'Baş',
  HANDS: 'Eller',
  INNER: 'İç giyim',
  MIDDLE: 'Üst giyim',
  LEGS: 'Bacaklar',
  FEET: 'Ayaklar',
  OUTER: 'Dış giyim',
  BACK: 'Sırt',
});

/** Bir eşya türünün değişmez tanımı (soyut). */
export class ItemType {
  constructor(id, name, { weight, icon = '•' }) {
    if (new.target === ItemType) throw new Error('ItemType soyut bir sınıftır');
    this.id = id;
    this.name = name;
    this.weight = weight;
    this.icon = icon;
  }

  get isFood() {
    return false;
  }

  get isTool() {
    return false;
  }

  get isFuel() {
    return false;
  }

  get isSeed() {
    return false;
  }
}

export class FoodType extends ItemType {
  /** cookedNutrition null ise pişirilmez (yemiş, meyve). */
  constructor(id, name, { nutrition, cookedNutrition = null, ...rest }) {
    super(id, name, rest);
    this.nutrition = nutrition;
    this.cookedNutrition = cookedNutrition;
  }

  get isFood() {
    return true;
  }

  get cookable() {
    return this.cookedNutrition !== null;
  }

  nutritionFor(cooked) {
    return cooked && this.cookable ? this.cookedNutrition : this.nutrition;
  }
}

export class MaterialType extends ItemType {
  /** fuelSeconds > 0 ise ateşe yakıt olarak atılabilir. */
  constructor(id, name, { fuelSeconds = 0, ...rest }) {
    super(id, name, rest);
    this.fuelSeconds = fuelSeconds;
  }

  get isFuel() {
    return this.fuelSeconds > 0;
  }
}

/** Tohum: ekilince hangi bitkiye dönüşeceğini bitki türünün `seed` alanı belirler. */
export class SeedType extends MaterialType {
  get isSeed() {
    return true;
  }
}

/** Aletler: yetenekleri (capability) sayesinde yeni eylemlerin önünü açar. */
export class ToolType extends ItemType {
  constructor(id, name, { durability, capabilities, power = 0, ...rest }) {
    super(id, name, rest);
    this.durability = durability;
    this.capabilities = new Set(capabilities);
    this.power = power;
  }

  get isTool() {
    return true;
  }

  can(capability) {
    return this.capabilities.has(capability);
  }
}

/** Giyilen eşya: soğuktan korur (insulation °C), giyildikçe yıpranır (durability: gün). */
export class ClothingType extends ToolType {
  constructor(id, name, { insulation, slot, ...rest }) {
    super(id, name, { durability: 1, capabilities: [], ...rest });
    this.insulation = insulation;
    this.slot = slot;
  }
}

/** Sırt çantası: sırta takılır, taşıma kapasitesini artırır (carryBonus kg). */
export class BagType extends ClothingType {
  constructor(id, name, { carryBonus, ...rest }) {
    super(id, name, { insulation: 0, slot: ClothingSlot.BACK, ...rest });
    this.carryBonus = carryBonus;
  }
}
