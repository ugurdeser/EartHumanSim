import { el } from './dom.js';

const SAMPLE_MS = 500;

/** Haritanın köşesinde saniyedeki kare sayısı ve en yavaş karenin süresi. */
export class FpsMeter {
  constructor(container, settings) {
    this.settings = settings;
    this.root = el('div', { class: 'fps-meter hidden' });
    this.frames = 0;
    this.worst = 0;
    this.since = null;
    this.last = null;
    container.append(this.root);
    settings.onChange((key) => key === 'showFps' && this.#sync());
    this.#sync();
  }

  #sync() {
    this.root.classList.toggle('hidden', !this.settings.showFps);
    this.since = null;
  }

  tick(timestamp) {
    if (!this.settings.showFps) return;
    if (this.since === null) {
      Object.assign(this, { since: timestamp, last: timestamp, frames: 0, worst: 0 });
      return;
    }
    this.frames++;
    this.worst = Math.max(this.worst, timestamp - this.last);
    this.last = timestamp;
    const elapsed = timestamp - this.since;
    if (elapsed < SAMPLE_MS) return;
    this.root.textContent = `${Math.round((this.frames * 1000) / elapsed)} FPS · en yavaş ${Math.round(this.worst)} ms`;
    Object.assign(this, { since: timestamp, frames: 0, worst: 0 });
  }
}
