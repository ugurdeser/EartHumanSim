import { SIM } from '../config.js';
import { el, percent } from './dom.js';

const SKIP_DAYS = [1, 5, 10, 50, 100];

export class TimeControls {
  constructor(game) {
    this.game = game;
    this.clockLabel = el('div', { class: 'clock' });
    this.weatherLabel = el('div', { class: 'weather' });
    this.pauseButton = el('button', { onClick: () => game.togglePause() });
    this.speedButtons = SIM.SPEEDS.map((speed, i) =>
      el('button', { text: speed.label, title: `${speed.title ? `${speed.title} · ` : ''}Kısayol: ${speed.key.slice(5)}`, onClick: () => game.setSpeedIndex(i) }),
    );
    this.skipButtons = SKIP_DAYS.map((days) => el('button', { text: `+${days}g`, title: `${days} gün ileri sar`, onClick: () => game.skipDays(days) }));
    this.skipStatus = el('div', { class: 'skip-status' });
    this.cancelButton = el('button', { class: 'icon', title: 'İleri sarmayı durdur', onClick: () => game.cancelSkip() }, '✕');
    this.root = el(
      'section',
      { class: 'panel time-controls' },
      this.clockLabel,
      this.weatherLabel,
      el(
        'div',
        { class: 'buttons' },
        this.pauseButton,
        ...this.speedButtons,
        el('button', { class: 'settings-button', title: 'Ayarlar (F2)', onClick: () => game.settingsWindow.toggle() }, '⚙'),
      ),
      el('div', { class: 'buttons skip' }, ...this.skipButtons),
      el('div', { class: 'skip-row hidden' }, this.skipStatus, this.cancelButton),
    );
  }

  update() {
    const { clock, calendar, camera } = this.game;
    const season = calendar.seasonAt(camera); // baktığın yarıkürenin mevsimi
    this.clockLabel.textContent = `${calendar.date}, Yıl ${calendar.year} · ${season.icon} ${season.name}`;
    const { weather } = this.game.world;
    const local = weather.at(camera);
    const temperature = weather.temperatureAt(camera); // baktığın yerin sıcaklığı
    this.weatherLabel.textContent = `${clock.formatTime()} ${clock.isNight ? '🌙' : '🕑'} · ${temperature.toFixed(0)}°C · ${local.describe()}`;
    this.weatherLabel.title = `Baktığın yer · rüzgâr ${local.wind.toFixed(0)} m/s ${local.windFrom} · ${local.pressure.toFixed(0)} hPa · bulut %${Math.round(local.cover * 100)}`;
    this.pauseButton.textContent = clock.paused ? '▶' : '⏸';
    this.speedButtons.forEach((button, i) => button.classList.toggle('active', SIM.SPEEDS[i].scale === clock.timeScale));
    this.#updateSkip();
  }

  #updateSkip() {
    const skip = this.game.fastForward;
    this.skipStatus.textContent = skip.isRunning ? `⏩ ${skip.days} gün ileri sarılıyor… ${percent(skip.progress)}` : '';
    this.skipStatus.parentElement.classList.toggle('hidden', !skip.isRunning);
  }
}
