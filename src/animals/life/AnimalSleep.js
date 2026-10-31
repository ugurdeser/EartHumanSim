import { wrapDelta } from '../../core/Planet.js';
const MIN_SLEEP = 10; // bundan kısa uykuya değmez (sn)
const DEFAULT_MAX_SLEEP = 10 * 60; // tür belirtmezse en uzun uyku (sn)

/** Olay tabanlı zaman: hayvan yapacak işi yokken uyur, World.scheduler uyandırır. */
export class AnimalSleep {
  constructor(animal) {
    this.animal = animal;
  }

  /** Davranışların izin verdiği kadar, türün sınırını aşmadan uyur. */
  trySleep(world) {
    let rest = Math.min(this.animal.brain.restTime(this.animal, world), this.animal.species.maxSleep ?? DEFAULT_MAX_SLEEP);
    if (this.animal.reproduction.pregnancy) rest = Math.min(rest, this.animal.reproduction.pregnancy.due - world.now);
    if (rest < MIN_SLEEP) return;
    this.animal.catchUp(world); // uyku boyunca tahminler güncel değerlerden yapılsın
    const target = this.animal.brain.current?.movingTo;
    this.animal.glide = target ? { from: this.animal.position.clone(), to: target.clone(), start: world.now, end: world.now + rest } : null;
    this.animal.sleeping = true;
    this.animal.sleepStart = world.now;
    world.scheduler.schedule(this.animal, world.now + rest);
  }

  /** Uykudan uyanır: geçen süre işlenir, yürüyen davranış uyunan süre kadar ilerler. */
  wake(world) {
    if (!this.animal.sleeping || !this.animal.alive) return;
    this.animal.sleeping = false;
    world.scheduler.cancel(this.animal);
    const slept = world.now - this.animal.sleepStart;
    this.animal.herd?.update(world);
    this.animal.catchUp(world);
    if (!this.animal.alive) return;
    this.animal.brain.resume(this.animal, world, slept);
    this.animal.glide = null;
  }

  /** Tehlike: hayvan (ve sürüsü) hemen uyanır. */
  alert(world) {
    if (this.animal.herd) this.animal.herd.wakeAll(world);
    else this.animal.wake(world);
  }

  /** Çizim için konum: süzülürken yolun o anki noktası. */
  displayPosition(now) {
    const glide = this.animal.glide;
    if (!glide) return this.animal.position;
    const t = Math.min(1, Math.max(0, (now - glide.start) / (glide.end - glide.start)));
    return { x: glide.from.x + wrapDelta(glide.to.x - glide.from.x) * t, y: glide.from.y + (glide.to.y - glide.from.y) * t };
  }
}
