import { DAY, HOUR, MINUTE } from '../../config.js';
import { el } from '../dom.js';

function formatFuel(seconds) {
  if (seconds === 0) return 'yok';
  return seconds < DAY ? `${Math.round(seconds / HOUR)} saatlik` : `${(seconds / DAY).toFixed(1)} günlük`;
}

function formatAgo(seconds) {
  if (seconds < HOUR) return `${Math.round(seconds / MINUTE)} dk önce`;
  if (seconds < DAY) return `${Math.round(seconds / HOUR)} saat önce`;
  return `${(seconds / DAY).toFixed(1)} gün önce`;
}

/** Ölüm anında elinin altında ne vardı, ne yapıyordu: sebebi görmek için. */
export class DeathReportView {
  constructor(person) {
    this.person = person;
    this.rendered = false;
    this.root = el('div');
  }

  /** Ölümcül ihtiyaç elinin altındaysa bunu açıkça söyler. */
  #verdict(report, cause) {
    const food = report.carried.food + report.home.food;
    if (cause.includes('açlık') && food > 0) return `⚠ Yiyecek vardı (${report.carried.food} üzerinde, ${report.home.food} evde) ama yemedi.`;
    if (cause.includes('açlık')) return `Üzerinde ve evinde hiç yiyecek yoktu.`;
    if (cause.includes('susuzluk') && report.carried.water > 0) return `⚠ Üzerinde ${report.carried.water} içimlik su vardı ama içmedi.`;
    if (cause.includes('susuzluk')) return report.waterDistance === null ? 'Yakınlarda temiz su yoktu.' : `En yakın temiz su ${Math.round(report.waterDistance)} m uzaktaydı, ulaşamadı.`;
    if (cause === 'soğuk' && report.home.fuelSeconds + report.carried.fuelSeconds > 0) return `⚠ Yakacağı vardı ama ısınamadı.`;
    if (cause === 'soğuk') return 'Üzerinde ve evinde hiç yakacak yoktu.';
    return null;
  }

  #render(report) {
    const { carried, home, weather, groupFood } = report;
    const rows = [
      ['Tarih', report.date],
      ['Son iş', `${report.drive ? `[${report.drive}] ` : ''}${report.activity}`],
      ['Konum', report.distanceHome < 5 ? 'Evindeydi' : `Evine ${Math.round(report.distanceHome)} m uzakta`],
      ['Üzerinde', `${carried.food} yiyecek · ${carried.water} su · ${formatFuel(carried.fuelSeconds)} yakacak`],
      ['Yük', `${carried.weight.toFixed(1)} / ${carried.limit.toFixed(1)} kg`],
      ['Evinde', `${home.food} yiyecek · ${formatFuel(home.fuelSeconds)} yakacak`],
      ['Ocak', `${home.fireLit ? '🔥 Yanıyordu' : 'Sönüktü'} · ${home.shelter}`],
      ['Temiz su', report.waterDistance === null ? 'Yakında yok' : `${Math.round(report.waterDistance)} m uzakta`],
      ['Topluluk', groupFood ? `${groupFood.name}: toplam ${groupFood.count} yiyecek` : 'Topluluğu yoktu'],
      ['Hava', `${weather.name} · ${Math.round(weather.air)}°C, hissedilen ${Math.round(weather.felt)}°C · giysi +${Math.round(report.clothes)}°C`],
    ];
    const verdict = this.#verdict(report, this.person.causeOfDeath);
    this.root.replaceChildren(
      verdict ? el('p', { class: 'activity', text: verdict }) : '',
      el('dl', { class: 'info' }, rows.flatMap(([key, value]) => [el('dt', { text: key }), el('dd', { text: value })])),
      el('h4', { text: 'Son işleri' }),
      el(
        'dl',
        { class: 'info' },
        report.trail.flatMap((step) => [el('dt', { text: formatAgo(report.time - step.time) }), el('dd', { text: `${step.drive ? `[${step.drive}] ` : ''}${step.activity}` })]),
      ),
    );
  }

  update() {
    const report = this.person.deathReport;
    if (this.rendered || !report) return;
    this.rendered = true;
    this.#render(report);
  }
}
