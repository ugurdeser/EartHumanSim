import { latitudeOf } from '../core/Planet.js';
import { Overlay } from '../render/WeatherMaps.js';
import { Surface } from '../world/Terrain.js';
import { el } from './dom.js';

const OFFSET = 16; // px: kutucuk farenin bu kadar sağ altında

/**
 * Hava haritası açıkken farenin üstünde durduğu yerin havası: sıcaklık, hissedilen, hava türü,
 * rüzgâr, nem, basınç, yağış, kar ve mevsim. Fare durursa da hava değiştikçe tazelenir.
 */
export class WeatherProbe {
  constructor(container, canvas, camera, world, settings) {
    Object.assign(this, { container, canvas, camera, world, settings });
    this.root = el('div', { class: 'weather-probe hidden' });
    this.point = null; // farenin ekran konumu (tuvale göre)
    container.append(this.root);
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      this.update();
    });
    canvas.addEventListener('mouseleave', () => {
      this.point = null;
      this.update();
    });
  }

  /** Fare kürenin dışındaysa (uzayda) yer yoktur. */
  #worldPoint() {
    const { camera, point } = this;
    if (!point) return null;
    if (camera.isGlobe && Math.hypot(point.x - camera.width / 2, point.y - camera.height / 2) > camera.globeRadius) return null;
    return camera.screenToWorld(point.x, point.y);
  }

  update() {
    const place = this.settings.overlay !== Overlay.NONE.id ? this.#worldPoint() : null;
    this.root.classList.toggle('hidden', !place);
    if (!place) return;
    const { weather, calendar } = this.world;
    const local = weather.at(place);
    const latitude = (latitudeOf(place.y) * 180) / Math.PI;
    const season = calendar.seasonAt(place);
    const { terrain } = this.world;
    const surface = terrain.surfaceAt(place.x, place.y);
    const ground = surface === Surface.SEA ? '🌊 Deniz' : surface === Surface.ICE ? '🧊 Buzul' : `⛰️ Yükseklik ${Math.round(terrain.elevationAt(place.x, place.y) * weather.peakAltitude)} m`;
    const rows = [
      `📍 ${Math.abs(latitude).toFixed(1)}° ${latitude >= 0 ? 'K' : 'G'} · ${season.icon} ${season.name}`,
      ground,
      `🌡️ ${weather.temperatureAt(place).toFixed(1)}°C · açıkta ${weather.exposedTemperatureAt(place).toFixed(1)}°C`,
      `${local.current.icon} ${local.current.name} · bulut %${Math.round(local.cover * 100)}`,
      `💨 ${local.wind.toFixed(1)} m/s ${local.windFrom}`,
      `💧 Nem %${Math.round(local.humidity * 100)} · ${local.pressure.toFixed(0)} hPa`,
    ];
    if (local.rain + local.snowfall >= 0.05) rows.push(`${local.snowfall > local.rain ? '🌨️ Kar' : '🌧️ Yağmur'} ${(local.rain + local.snowfall).toFixed(1)} mm/saat`);
    if (local.snowCover >= 0.05) rows.push(`❄ Yerde kar %${Math.round(local.snowCover * 100)}`);
    this.root.replaceChildren(...rows.map((text) => el('div', { text })));
    const { x, y } = this.point;
    const left = Math.min(x + OFFSET, this.container.clientWidth - this.root.offsetWidth - 8);
    const top = Math.min(y + OFFSET, this.container.clientHeight - this.root.offsetHeight - 8);
    Object.assign(this.root.style, { left: `${left}px`, top: `${top}px` });
  }
}
