import { CLOTHING } from '../config.js';

/** Yıpranabilen tek bir alet. */
class ToolInstance {
  constructor(type) {
    this.type = type;
    this.durability = type.durability;
  }

  get condition() {
    return this.durability / this.type.durability;
  }
}

/**
 * Ağırlık kapasiteli eşya deposu: kişinin üstündekiler ya da yuvanın deposu.
 * Yığılabilir eşyalar sayı olarak, aletler tek tek (yıpranmalarıyla) tutulur.
 */
export class Inventory {
  constructor(capacity = Infinity) {
    this.capacity = capacity;
    this.stacks = new Map(); // ItemType -> adet
    this.tools = [];
  }

  // ---------- Sorgular ----------

  /** Taşınan ağırlık: giyilenler yük sayılmaz. */
  get weight() {
    const worn = this.worn;
    let total = this.tools.reduce((sum, t) => (worn.includes(t) ? sum : sum + t.type.weight), 0);
    for (const [type, count] of this.stacks) total += type.weight * count;
    return total;
  }

  /** Sırt çantasıyla birlikte taşıma sınırı. */
  get carryLimit() {
    return this.capacity + this.worn.reduce((sum, t) => sum + (t.type.carryBonus ?? 0), 0);
  }

  get freeWeight() {
    return Math.max(0, this.carryLimit - this.weight);
  }

  count(type) {
    return type.isTool ? this.tools.filter((t) => t.type === type).length : this.stacks.get(type) ?? 0;
  }

  has(type, amount = 1) {
    return this.count(type) >= amount;
  }

  /** Taşınabilecek en fazla adet. */
  roomFor(type) {
    return Math.floor(this.freeWeight / type.weight + 1e-9);
  }

  get foodCount() {
    let total = 0;
    for (const [type, count] of this.stacks) if (type.isFood) total += count;
    return total;
  }

  get fuelSeconds() {
    let total = 0;
    for (const [type, count] of this.stacks) if (type.isFuel) total += type.fuelSeconds * count;
    return total;
  }

  /** [{type, count}] — arayüz ve aktarımlar için. */
  entries() {
    const list = [...this.stacks].map(([type, count]) => ({ type, count }));
    for (const tool of this.tools) list.push({ type: tool.type, count: 1, condition: tool.condition });
    return list;
  }

  /** Üzerinde giyili olanlar. */
  get wornEntries() {
    return this.worn.map((t) => ({ type: t.type, count: 1, condition: t.condition }));
  }

  /** Giyilmeyip taşınanlar (yedek giysiler dahil). */
  get carriedEntries() {
    const worn = this.worn;
    const list = [...this.stacks].map(([type, count]) => ({ type, count }));
    for (const tool of this.tools) if (!worn.includes(tool)) list.push({ type: tool.type, count: 1, condition: tool.condition });
    return list;
  }

  // ---------- Değişiklik ----------

  /** Sığdığı kadarını ekler, eklenen adedi döndürür. */
  add(type, amount = 1) {
    const added = Math.min(amount, this.roomFor(type));
    if (added <= 0) return 0;
    if (type.isTool) {
      for (let i = 0; i < added; i++) this.tools.push(new ToolInstance(type));
    } else {
      this.stacks.set(type, this.count(type) + added);
    }
    return added;
  }

  remove(type, amount = 1) {
    if (type.isTool) {
      let removed = 0;
      this.tools = this.tools.filter((t) => (t.type === type && removed < amount ? (removed++, false) : true));
      return removed;
    }
    const removed = Math.min(amount, this.count(type));
    const left = this.count(type) - removed;
    if (left > 0) this.stacks.set(type, left);
    else this.stacks.delete(type);
    return removed;
  }

  /** Bu depodan diğerine, filtreye uyan eşyaları sığdığı kadar aktarır. */
  transferTo(other, filter = () => true, limit = Infinity) {
    let moved = 0;
    for (const [type, count] of [...this.stacks]) {
      if (!filter(type) || moved >= limit) continue;
      const n = other.add(type, Math.min(count, limit - moved));
      this.remove(type, n);
      moved += n;
    }
    return moved;
  }

  /** En besleyici yiyeceği çıkarır (pişirme imkânı hesaba katılarak). */
  takeBestFood(cooked) {
    let best = null;
    for (const type of this.stacks.keys()) {
      if (type.isFood && (!best || type.nutritionFor(cooked) > best.nutritionFor(cooked))) best = type;
    }
    if (best) this.remove(best, 1);
    return best;
  }

  // ---------- Aletler ----------

  /** Eskidikçe koruma azalır. */
  static #warmth(tool) {
    return tool.type.insulation * (CLOTHING.WORN_WARMTH + (1 - CLOTHING.WORN_WARMTH) * tool.condition);
  }

  /** Her yerde en iyi olan giyilir (sırtta en büyük çanta); fazlası yedektir. */
  get worn() {
    const value = (t) => t.type.carryBonus ?? Inventory.#warmth(t);
    const best = new Map();
    for (const tool of this.tools) {
      const { slot } = tool.type;
      if (!slot) continue;
      const current = best.get(slot);
      if (!current || value(tool) > value(current)) best.set(slot, tool);
    }
    return [...best.values()];
  }

  /** Giyilenlerin toplam koruması (°C). */
  get bestInsulation() {
    return this.worn.reduce((sum, t) => sum + Inventory.#warmth(t), 0);
  }

  /** Giyilenler `days` gün yıpranır; eskiyip parçalananların türlerini döndürür. */
  wearClothes(days) {
    const torn = [];
    for (const tool of this.worn) {
      tool.durability -= days;
      if (tool.durability > 0) continue;
      this.tools.splice(this.tools.indexOf(tool), 1);
      torn.push(tool.type);
    }
    return torn;
  }

  /** Bu eşya elindekilerden daha iyi mi? Eskimiş giysi yenisi yapılmadan önce parçalanana kadar kullanılır. */
  isUpgrade(type) {
    const rival = (t) => t.type.slot === type.slot;
    if (type.carryBonus) return !this.tools.some((t) => rival(t) && t.type.carryBonus >= type.carryBonus);
    if (type.slot) return !this.tools.some((t) => rival(t) && t.type.insulation >= type.insulation);
    return !this.has(type);
  }

  toolFor(capability) {
    return this.tools.find((t) => t.type.can(capability)) ?? null;
  }

  hasCapability(capability) {
    return this.toolFor(capability) !== null;
  }

  /** Aleti bir kez kullanır; kırılırsa envanterden çıkar ve kırılan türü döndürür. */
  wearTool(capability) {
    const tool = this.toolFor(capability);
    if (!tool) return null;
    tool.durability--;
    if (tool.durability > 0) return null;
    this.tools.splice(this.tools.indexOf(tool), 1);
    return tool.type;
  }
}
