/**
 * Bir kişinin zaman içinde yürüttüğü eylemin soyut temel sınıfı.
 * Alt sınıflar `tick()` içinde işi yapar ve `complete()` / `fail()` ile biter.
 */
export class Action {
  constructor(label) {
    if (new.target === Action) throw new Error('Action soyut bir sınıftır');
    this.label = label;
    this.done = false;
    this.succeeded = false;
    this.started = false;
  }

  get isDone() {
    return this.done;
  }

  /** Arayüzde gösterilecek açıklama. */
  get description() {
    return this.label;
  }

  update(person, world, dt) {
    if (this.done) return;
    if (!this.started) {
      this.started = true;
      this.onStart(person, world);
    }
    if (!this.done) this.tick(person, world, dt);
  }

  onStart(_person, _world) {}

  tick(_person, _world, _dt) {
    throw new Error(`${this.constructor.name}.tick() uygulanmalı`);
  }

  complete() {
    this.done = true;
    this.succeeded = true;
  }

  fail() {
    this.done = true;
    this.succeeded = false;
  }

  cancel() {
    this.done = true;
  }
}
