export class Group {
  constructor(id, color) {
    this.id = id;
    this.name = `Topluluk ${id}`;
    this.color = color;
    this.members = new Set();
  }

  get size() {
    return this.members.size;
  }

  add(person) {
    this.members.add(person);
    person.group = this;
  }

  remove(person) {
    this.members.delete(person);
    if (person.group === this) person.group = null;
  }
}
