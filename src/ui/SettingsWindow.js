import { Overlay } from '../render/WeatherMaps.js';
import { Lod, Quality } from '../settings/DisplaySettings.js';
import { el, startWindowDrag } from './dom.js';

/** Ayarlar penceresi (⚙ / F2): görüntü kalitesi ve ağır katmanların açılıp kapanması. */
export class SettingsWindow {
  constructor(container, settings) {
    this.settings = settings;
    this.quality = el(
      'select',
      { onChange: () => settings.set('quality', this.quality.value) },
      Object.values(Quality).map((q) => el('option', { value: q.id, text: q.label })),
    );
    this.lod = el(
      'select',
      { onChange: () => settings.set('lod', this.lod.value) },
      Object.values(Lod).map((l) => el('option', { value: l.id, text: l.label })),
    );
    this.overlay = el(
      'select',
      { onChange: () => settings.set('overlay', this.overlay.value) },
      Object.values(Overlay).map((o) => el('option', { value: o.id, text: o.label })),
    );
    this.toggles = [
      ['relief', 'Dağ gölgeleri ve kar'],
      ['clouds', 'Bulutlar'],
      ['showFps', 'FPS göstergesi'],
    ].map(([key, label]) => ({ key, label, input: el('input', { type: 'checkbox', onChange: (e) => settings.set(key, e.target.checked) }) }));

    this.root = el(
      'section',
      { class: 'char-window settings-window hidden' },
      el(
        'header',
        { onMouseDown: (e) => startWindowDrag(e, this.root) },
        el('h3', { text: '⚙ Ayarlar' }),
        el('button', { class: 'icon', title: 'Kapat (F2)', onClick: () => this.toggle(false) }, '✕'),
      ),
      el(
        'div',
        { class: 'window-body' },
        el('h4', { text: 'Görüntü' }),
        el('label', { class: 'dev-row' }, 'Kalite', this.quality),
        el('p', { class: 'hint', text: 'Yüksek çözünürlüklü ekranda takılma olursa Orta ya da Düşük seçin: daha az piksel hesaplanır, görüntü biraz yumuşar.' }),
        el('label', { class: 'dev-row' }, 'Ayrıntı düzeyi (LOD)', this.lod),
        el('p', { class: 'hint', text: 'Uzaklaştıkça sırtlar, tepeler, kıyı girintileri ve orman öbekleri ortalamalarına söner. Yüksek düzey ayrıntıyı daha uzaktan gösterir ve zemini pikselde 4 örnekle boyar; düşük düzey daha hızlıdır.' }),
        this.toggles.map(({ label, input }) => el('label', { class: 'dev-row' }, label, input)),
        el('h4', { class: 'settings-gap', text: 'Hava' }),
        el('label', { class: 'dev-row' }, 'Hava katmanı', this.overlay),
        el('p', { class: 'hint', text: 'Sıcaklık, yağış, rüzgâr, basınç, nem ya da bulut örtüsünü haritanın üstünde renkle gösterir. Rüzgâr katmanında hava noktalarla akar.' }),
        el('button', { class: 'new-planet', onClick: () => SettingsWindow.#newPlanet() }, '🌍 Yeni gezegen oluştur'),
      ),
    );
    container.append(this.root);
  }

  /** Bu gezegeni kapatıp açılış ekranına döner (son ayarlar hatırlanır). */
  static #newPlanet() {
    if (window.confirm('Bu gezegen kapanacak. Yeni gezegen oluşturulsun mu?')) window.location.href = window.location.pathname;
  }

  get isOpen() {
    return !this.root.classList.contains('hidden');
  }

  toggle(open = !this.isOpen) {
    this.root.classList.toggle('hidden', !open);
    if (open) this.#sync();
  }

  #sync() {
    this.quality.value = this.settings.quality.id;
    this.lod.value = this.settings.lod.id;
    this.overlay.value = this.settings.overlay;
    for (const { key, input } of this.toggles) input.checked = this.settings[key];
  }
}
