import { el } from '../dom.js';
import { PlanetForm } from './PlanetForm.js';
import { PlanetPreview } from './PlanetPreview.js';
import { Starfield } from './Starfield.js';

/**
 * Oyunun açılış ekranı: gezegenin ayarları ve önizlemesi. "Gezegeni oluştur" ile ayarlar
 * saklanır ve `onCreate(planet, önizlemenin yükselti haritası)` çağrılır.
 */
export class StartScreen {
  constructor(container, planet, onCreate) {
    this.planet = planet;
    this.preview = new PlanetPreview(planet, () => this.form.sync());
    this.form = new PlanetForm(planet, () => this.preview.refresh());
    this.createButton = el('button', { class: 'create-planet', onClick: () => this.#create(onCreate) }, '🌍 Gezegeni oluştur');
    this.root = el(
      'div',
      { class: 'start-screen' },
      new Starfield().canvas,
      el(
        'div',
        { class: 'start-layout' },
        el(
          'section',
          { class: 'start-map' },
          el('header', {}, el('h1', { text: 'Takılmaca' }), el('p', { text: 'Yeni gezegen: ayarları seçin, haritada başlangıç yerini işaretleyin.' })),
          this.preview.root,
        ),
        el('aside', { class: 'start-panel' }, el('div', { class: 'start-panel-body' }, this.form.root), this.createButton),
      ),
    );
    container.append(this.root);
    this.form.sync();
    this.preview.refresh();
  }

  #create(onCreate) {
    this.planet.save();
    this.root.remove();
    onCreate(this.planet, this.preview.elevation);
  }
}
