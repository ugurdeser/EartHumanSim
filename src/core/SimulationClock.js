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


  formatTime() {
    const h = Math.floor(this.hourOfDay);
    const m = Math.floor((this.hourOfDay - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
