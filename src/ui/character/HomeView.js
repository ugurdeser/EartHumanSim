import { DAY, HOUR } from '../../config.js';
import { el } from '../dom.js';
import { InfoView } from './InfoView.js';
import { InventoryView } from './InventoryView.js';

/** Yakıt süresini okunur yazar: "5 sa" / "3.5 gün". */
function formatDuration(seconds) {
  if (seconds < DAY) return `${Math.round(seconds / HOUR)} sa`;
  return `${(seconds / DAY).toFixed(1)} gün`;
}

/** Bir yuva: barınak, inşaat, ocak, depo ve yaşayanlar. `homeOf()` gösterilecek yuvayı verir. */
export class HomeView {
  constructor(homeOf) {
    this.homeOf = homeOf;
    this.info = el('dl', { class: 'info' });
    this.stored = el('ul', { class: 'items' });
    this.root = el('div', {}, this.info, el('h4', { text: 'Depo' }), this.stored);
  }

  #constructionRow(home) {
    if (home.construction) return `inşaat sürüyor %${Math.round(home.constructionProgress * 100)}`;
    const next = home.nextShelter;
    if (!next) return 'En iyi barınak';
    const needs = next.materials.map(([type, n]) => `${type.icon} ${type.name} ${home.storage.count(type)}/${n}`);
    return `${next.name} için: ${needs.join(', ') || '—'}`;
  }

  update() {
    const home = this.homeOf();
    const shelter = home.shelter;
    const fire = home.fire;
    const residents = [...home.owners];
    const rows = [
      ['Yuva', home.label],
      ['Barınak', `${shelter.name} (+${shelter.insulation}°C yalıtım · dinlenme ×${shelter.restQuality})`],
      ['Sonraki', this.#constructionRow(home)],
      ['Ocak', fire.isLit ? `🔥 Yanıyor (%${Math.round(fire.level * 100)} · ${formatDuration(fire.fuel)})` : 'Sönük'],
      ['Yakacak', home.storage.fuelSeconds > 0 ? `${formatDuration(home.storage.fuelSeconds)} yetecek kadar` : 'Yok'],
      ['Yiyecek', `${home.storage.foodCount} adet`],
      ['Yaşayanlar', residents.length ? residents.flatMap((p, i) => [i > 0 ? ', ' : null, InfoView.link(p, ` (${p.age})`)]) : '—'],
    ];
    this.info.replaceChildren(...rows.flatMap(([key, value]) => [el('dt', { text: key }), el('dd', {}, value)]));

    this.stored.replaceChildren(...InventoryView.items(home.storage));
  }
}
