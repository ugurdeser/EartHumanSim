import { DAY, HOUR } from '../config.js';

export class SimulationClock {
  constructor(startTime = 0) {
    this.time = startTime;
    this.timeScale = 1;
    this.paused = false;
  }

  advance(dt) {
    this.time += dt;
  }

  get hourOfDay() {
    return (this.time % DAY) / HOUR;
  }

  get isNight() {
    const h = this.hourOfDay;
    return h >= 21 || h < 6;
  }

  /** 0 = tam gündüz, 1 = tam gece. */
  get darkness() {
    const h = this.hourOfDay;
    if (h >= 8 && h < 19) return 0;
    if (h >= 6 && h < 8) return 1 - (h - 6) / 2;
    if (h >= 19 && h < 21) return (h - 19) / 2;
    return 1;
  }

  formatTime() {
    const h = Math.floor(this.hourOfDay);
    const m = Math.floor((this.hourOfDay - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
