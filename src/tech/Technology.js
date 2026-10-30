/** İcat edilebilir / öğretilebilir bir bilgi. */
export class Technology {
  constructor(id, { name, skill, difficulty, kind, prerequisites = [], locked = false }) {
    this.id = id;
    this.name = name; // "taş balta yapmak"
    this.skill = skill; // "taş balta yapmayı" (öğrendi / icat etti cümleleri için)
    this.difficulty = difficulty; // 0..1
    this.kind = kind; // TechnologyKind
    this.locked = locked; // henüz oyunda yok: icat edilemez, öğretilemez
    this.prerequisites = prerequisites;
  }
}
