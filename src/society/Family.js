/** Aynı yuvayı paylaşan, soyadı ortak hane: bir çift ve bakmakla yükümlü oldukları çocuklar. */
export class Family {
  constructor(id, { surname, husband, wife, home }) {
    this.id = id;
    this.surname = surname;
    this.husband = husband;
    this.wife = wife;
    this.members = new Set();
    this.home = null;
    this.setHome(home);
  }

  /** Aynı soyadlı aileleri ayırt etmek için kurucu çiftin adlarını da içerir. */
  get name() {
    return `${this.surname} ailesi (${this.husband.name} & ${this.wife.name})`;
  }

  get livingMembers() {
    return [...this.members].filter((m) => m.alive);
  }

  get isEmpty() {
    return this.livingMembers.length === 0;
  }

  setHome(home) {
    if (this.home?.family === this) this.home.family = null;
    this.home = home;
    home.family = this;
  }

  add(person) {
    if (person.family === this) return;
    person.family?.remove(person);
    this.members.add(person);
    person.family = this;
    person.moveHome(this.home);
  }

  remove(person) {
    this.members.delete(person);
    if (person.family === this) person.family = null;
  }
}
