/** Seçili kişi, bitki, hayvan, yuva ya da topluluk + kamera takibi; değişiklikleri dinleyicilere bildirir. */
export class Selection {
  constructor() {
    this.person = null;
    this.plant = null;
    this.home = null;
    this.group = null;
    this.animal = null;
    this.follow = false;
    this.listeners = new Set();
  }

  select(person, { follow = this.follow } = {}) {
    this.#focus({ person });
    this.follow = Boolean(person) && follow;
    this.listeners.forEach((listener) => listener(person));
  }

  selectPlant(plant) {
    this.#focus({ plant });
    this.follow = false;
    this.listeners.forEach((listener) => listener(null));
  }

  selectHome(home) {
    this.#focus({ home });
    this.follow = false;
    this.listeners.forEach((listener) => listener(null));
  }

  selectAnimal(animal) {
    this.#focus({ animal });
    this.follow = false;
    this.listeners.forEach((listener) => listener(null));
  }

  selectGroup(group) {
    this.#focus({ group });
    this.follow = false;
    this.listeners.forEach((listener) => listener(null));
  }

  /** Aynı anda tek şey seçilidir. */
  #focus({ person = null, plant = null, home = null, group = null, animal = null }) {
    this.person = person;
    this.plant = plant;
    this.home = home;
    this.group = group;
    this.animal = animal;
  }

  clear() {
    this.select(null);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
