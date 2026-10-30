import { DAY, SIM } from '../config.js';

const FRAME_BUDGET_MS = 40; // her karede ileri sarmaya ayrılan süre; arayüz donmaz

/**
 * Simülasyonu belirli gün sayısı kadar, olabildiğince hızlı ama kare kare ilerletir.
 * Her karede bütçe dolana kadar en büyük adımla çalışır; ekran arada çizilmeye devam eder.
 */
export class FastForward {
  constructor(clock, world) {
    this.clock = clock;
    this.world = world;
    this.job = null;
  }

  get isRunning() {
    return this.job !== null;
  }

  /** Sarılan kısmın oranı (0..1). */
  get progress() {
    if (!this.job) return 0;
    return 1 - (this.job.target - this.clock.time) / (this.job.days * DAY);
  }

  get days() {
    return this.job?.days ?? 0;
  }

  /** Sarma sürerken yeniden istenirse süre eklenir. */
  start(days) {
    if (this.job) {
      this.job.target += days * DAY;
      this.job.days += days;
    } else {
      this.job = { target: this.clock.time + days * DAY, days };
    }
  }

  cancel() {
    this.job = null;
  }

  /** Bir karelik iş; bitince false döner. */
  step() {
    if (!this.job) return false;
    const started = performance.now();
    this.world.coarseTime = true;
    try {
      while (performance.now() - started < FRAME_BUDGET_MS) {
        const step = Math.min(SIM.MAX_STEP, this.job.target - this.clock.time);
        if (step <= 0) {
          this.job = null;
          return false;
        }
        this.clock.advance(step);
        this.world.update(step);
      }
      return true;
    } finally {
      this.world.coarseTime = false;
    }
  }
}
