import { SIM } from '../config.js';
import { el } from './dom.js';

export class TimeControls {
  constructor(game) {
    this.game = game;
    this.clockLabel = el('div', { class: 'clock' });
    this.weatherLabel = el('div', { class: 'weather' });
    this.pauseButton = el('button', { onClick: () => game.togglePause() });
    this.speedButtons = SIM.SPEEDS.map((speed, i) =>
      el('button', { text: `${speed}x`, title: `Kısayol: ${i + 1}`, onClick: () => game.setSpeedIndex(i) }),
    );
    this.root = el(
      'section',
      { class: 'panel time-controls' },
      this.clockLabel,
      this.weatherLabel,
      el('div', { class: 'buttons' }, this.pauseButton, ...this.speedButtons),
    );
  }

  update() {
    const { clock, calendar } = this.game;
    const season = calendar.season;
    this.clockLabel.textContent = `${calendar.date}, Yıl ${calendar.year} · ${season.icon} ${season.name}`;
    const { weather } = this.game.world;
    this.weatherLabel.textContent = `${clock.formatTime()} ${clock.isNight ? '🌙' : '🕑'} · ${weather.temperature.toFixed(0)}°C · ${weather.describe()}`;
    this.pauseButton.textContent = clock.paused ? '▶' : '⏸';
    this.speedButtons.forEach((button, i) => button.classList.toggle('active', SIM.SPEEDS[i] === clock.timeScale));
  }
}
