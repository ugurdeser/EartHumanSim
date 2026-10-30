/** Seçili kişi + kamera takibi; değişiklikleri dinleyicilere bildirir. */
export class Selection {
  constructor() {
    this.person = null;
    this.follow = false;
    this.listeners = new Set();
  }

  select(person, { follow = this.follow } = {}) {
    this.person = person;
    this.follow = Boolean(person) && follow;
    this.listeners.forEach((listener) => listener(person));
  }

  clear() {
    this.select(null);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
