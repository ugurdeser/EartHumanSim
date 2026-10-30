import { el, percent } from '../dom.js';

/** Aile, yuva, beceri gibi bilgiler. Akraba adları tıklanabilir bağlantıdır. */
export class InfoView {
  constructor(person, world) {
    this.person = person;
    this.world = world;
    this.root = el('dl', { class: 'info' });
  }

  /** Tıklanınca o kişiye geçilen isim bağlantısı (ölüyse ✝ ile). */
  static link(person, suffix = '') {
    return el('a', { class: 'person-link', 'data-id': person.id }, `${person.name}${suffix}${person.alive ? '' : ' ✝'}`);
  }

  static #links(people, suffixOf = () => '') {
    if (people.length === 0) return '—';
    return people.flatMap((p, i) => [i > 0 ? ', ' : null, InfoView.link(p, suffixOf(p))]);
  }

  update() {
    const p = this.person;
    const parents = [p.mother, p.father].filter(Boolean);
    const rows = [
      ['Aile', p.family ? `${p.family.name} (${p.family.livingMembers.length} kişi)` : 'Bekâr'],
      ['Eş', p.partner ? ['💕 ', InfoView.link(p.partner, ` (${p.partner.age})`)] : '—'],
      ['Anne / Baba', parents.length ? InfoView.#links(parents) : 'Bu topraklara dışarıdan geldi'],
      ['Kardeşler', InfoView.#links(p.siblings, (s) => ` (${s.age})`)],
      ['Çocuklar', InfoView.#links(p.children, (c) => ` (${c.age})`)],
      ['Topluluk', p.group ? `${p.group.leader === p ? '👑 ' : ''}${p.group.name} (${p.group.size})` : '—'],
      ['Hamilelik', p.pregnancy ? `🤰 ${p.pregnancyMonth(this.world.now)}. ay` : '—'],
      ['Yuva', p.home.label],
      ['Barınak', p.home.construction ? `${p.home.shelter.name} → inşaat %${Math.round(p.home.constructionProgress * 100)}` : p.home.shelter.name],
      ['Giysi koruması', `+${p.inventory.bestInsulation.toFixed(0)}°C`],
      ['Statü', percent(p.status)],
      ['Keşfedilen', percent(p.exploration.exploredFraction)],
      ['Sabıka', p.offenses || p.thefts ? `${p.isKnownThief ? '🕵 Tanınmış hırsız · ' : ''}${p.offenses} suç · ${p.thefts} görülen hırsızlık` : 'Temiz'],
      ['Şikâyetler', p.grievances.length ? InfoView.#links(p.grievances.map((g) => g.thief)) : '—'],
    ];
    this.root.replaceChildren(...rows.flatMap(([key, value]) => [el('dt', { text: key }), el('dd', {}, value)]));
  }
}
