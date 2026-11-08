import { SystemKind } from '../../weather/atmosphere/PressureSystems.js';
import { el, percent } from '../dom.js';

const KM = 1000;

/**
 * Geliştirici panelinde havayı izleme ve değiştirme: kameranın baktığı yerin havası, oraya basınç
 * sistemi bırakma, oranın karını ve toprak nemini ayarlama, modeli durdurma.
 */
export class WeatherDevSection {
  constructor(weather, camera) {
    this.weather = weather;
    this.camera = camera;
    this.title = '🌦️ Hava durumu (baktığın yer)';
    this.info = el('dl', { class: 'info' });
    this.buttons = [SystemKind.CYCLONE, SystemKind.ANTICYCLONE, SystemKind.HURRICANE].map((kind) =>
      el('button', { title: `${kind.name} buraya`, onClick: () => weather.spawnSystem(kind, this.camera) }, kind.name),
    );
    this.pause = el('input', { type: 'checkbox', onChange: () => (weather.paused = this.pause.checked) });
    this.snow = this.#slider((value) => weather.setSnowAt(this.camera, value));
    this.soil = this.#slider((value) => weather.setSoilAt(this.camera, value));
    this.root = el(
      'div',
      { class: 'dev-weather' },
      this.info,
      el('h4', { text: 'Basınç sistemi bırak' }),
      el('div', { class: 'dev-buttons' }, this.buttons),
      el('label', { class: 'dev-row' }, 'Havayı durdur', this.pause),
      el('h4', { text: 'Bu hücrenin zemini' }),
      el('label', { class: 'dev-row' }, 'Kar örtüsü', this.snow),
      el('label', { class: 'dev-row' }, 'Toprak nemi', this.soil),
    );
  }

  #slider(onInput) {
    const input = el('input', { type: 'range', min: '0', max: '1', step: '0.01' });
    input.addEventListener('input', () => onInput(Number(input.value)));
    return input;
  }

  /** Kullanıcı elle değiştirirken kontrolün değerini ezme. */
  static #sync(input, value) {
    if (document.activeElement !== input) input.value = value;
  }

  update() {
    const { weather, camera } = this;
    const local = weather.at(camera);
    const nearest = weather.atmosphere.systems.nearest(camera.x, camera.y);
    const rows = [
      ['Hava', `${local.current.icon} ${local.current.name} · güç ${percent(local.intensity)}`],
      ['Sıcaklık', `${weather.temperatureAt(camera).toFixed(1)}°C (açıkta ${weather.exposedTemperatureAt(camera).toFixed(1)}°C)`],
      ['Rüzgâr', `${local.wind.toFixed(1)} m/s ${local.windFrom}`],
      ['Basınç', `${local.pressure.toFixed(0)} hPa`],
      ['Bulut / yağmur / kar', `${percent(local.cover)} / ${local.rain.toFixed(1)} / ${local.snowfall.toFixed(1)} mm/sa`],
      ['Yükselme / kümülüs', `${weather.atmosphere.state.lift[local.cell].toFixed(2)} / ${percent(local.convection)}`],
      ['Kar örtüsü / toprak', `${percent(local.snowCover)} / ${percent(local.soilWetness)}`],
      ['Büyüme / hareket', `×${local.growthFactor.toFixed(2)} / ×${local.moveFactor.toFixed(2)}`],
      ['Sığınma isteği', percent(local.shelterUrge)],
      ['En yakın sistem', nearest ? `${nearest.system.kind.name} · ${Math.round(nearest.distance / KM)} km (Dünya ölçeği)` : 'yok'],
      ['Gezegende', `${weather.atmosphere.systems.list.length} basınç sistemi`],
    ];
    this.info.replaceChildren(...rows.flatMap(([key, value]) => [el('dt', { text: key }), el('dd', { text: value })]));
    this.pause.checked = weather.paused;
    WeatherDevSection.#sync(this.snow, local.snowCover);
    WeatherDevSection.#sync(this.soil, local.soilWetness);
  }
}
