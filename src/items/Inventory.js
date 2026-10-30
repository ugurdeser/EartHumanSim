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

  get weight() {
    let total = this.tools.reduce((sum, t) => sum + t.type.weight, 0);
    for (const [type, count] of this.stacks) total += type.weight * count;
    return total;
  }

  get freeWeight() {
    return Math.max(0, this.capacity - this.weight);
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
