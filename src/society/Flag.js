const WIDTH = 12;
const HEIGHT = 8;
const MAX_STARS = 3;

/** İkinci renk, topluluğu en çok yönlendiren güdüden gelir. */
const DRIVE_COLORS = Object.freeze({
  justice: '#f4f1de',
  hoarding: '#e9c46a',
  status: '#7b2cbf',
  affiliation: '#2a9d8f',
  nurture: '#f28482',
  fear: '#6c757d',
  curiosity: '#4cc9f0',
  creating: '#bc6c25',
});

/** Simge, topluluğun en çok yaptığı işten gelir: 5x5 nokta deseni. */
const SYMBOLS = Object.freeze({
  hunting: { name: 'mızrak', rows: ['....#', '...#.', '..#..', '.#...', '#....'] },
  fishing: { name: 'dalga', rows: ['.....', '#..#.', '.##.#', '.....', '.....'] },
  gathering: { name: 'yemiş', rows: ['..#..', '.#.#.', '#.#.#', '.#.#.', '..#..'] },
  woodcutting: { name: 'ağaç', rows: ['..#..', '.###.', '#####', '..#..', '..#..'] },
  farming: { name: 'başak', rows: ['#.#.#', '.###.', '..#..', '..#..', '..#..'] },
  building: { name: 'çatı', rows: ['..#..', '.#.#.', '#...#', '#...#', '#####'] },
  mining: { name: 'dağ', rows: ['.....', '..#..', '.###.', '#####', '#####'] },
  crafting: { name: 'balta', rows: ['.##..', '####.', '.###.', '...#.', '....#'] },
  husbandry: { name: 'koç boynuzu', rows: ['##.##', '#.#.#', '..#..', '.###.', '..#..'] },
});
const DEFAULT_SYMBOL = Object.freeze({ name: 'güneş', rows: ['#.#.#', '.###.', '#####', '.###.', '#.#.#'] });

const PATTERNS = Object.freeze([
  (x) => x < WIDTH / 2,
  (_x, y) => y < HEIGHT / 2,
  (x, y) => x + y < (WIDTH + HEIGHT) / 2,
  (x, y) => Math.abs(x - (WIDTH - 1) / 2) < 1.5 || Math.abs(y - (HEIGHT - 1) / 2) < 1.5,
]);

/**
 * Topluluğun bayrağı: noktalardan oluşan küçük bir desen. Renkleri ve simgesi topluluğun
 * karakterinden üretilir; ayrılan grup eski bayrağı tersine çevirir, zaferler yıldız ekler.
 */
export class Flag {
  constructor({ primary, secondary, pattern, symbol }) {
    this.primary = primary;
    this.secondary = secondary;
    this.pattern = pattern;
    this.symbol = symbol;
    this.stars = 0;
    this.cells = this.#compose();
  }

  /** Topluluğun üyelerine bakarak bayrak çizer. */
  static design(group) {
    const adults = group.adults;
    const drive = Flag.#strongest(Object.keys(DRIVE_COLORS), (id) => adults.reduce((sum, m) => sum + m.drives.get(id).weight, 0));
    const skill = Flag.#strongest(Object.keys(SYMBOLS), (id) => adults.reduce((sum, m) => sum + m.skills.hoursOf(id), 0));
    const practised = adults.some((m) => m.skills.hoursOf(skill) > 0);
    return new Flag({ primary: group.color, secondary: DRIVE_COLORS[drive], pattern: group.id % PATTERNS.length, symbol: practised ? SYMBOLS[skill] : DEFAULT_SYMBOL });
  }

  /** Ayrılan grubun bayrağı: eskisinin renkleri yer değiştirir, kendi rengi eklenir. */
  static fork(parent, group) {
    return new Flag({ primary: parent.secondary, secondary: group.color, pattern: (parent.pattern + 1) % PATTERNS.length, symbol: parent.symbol });
  }

  static #strongest(ids, scoreOf) {
    return ids.reduce((best, id) => (scoreOf(id) > scoreOf(best) ? id : best));
  }

  get description() {
    return `${this.symbol.name} simgeli${this.stars ? `, ${this.stars} yıldızlı` : ''}`;
  }

  /** Zafer: üst köşeye yıldız eklenir. Eklendiyse true döner. */
  addStar() {
    if (this.stars >= MAX_STARS) return false;
    this.stars++;
    this.cells = this.#compose();
    return true;
  }

  /** Her nokta: { x, y, color }, (0,0) sol üst. */
  #compose() {
    const cells = [];
    const startX = Math.floor((WIDTH - 5) / 2);
    const startY = Math.floor((HEIGHT - 5) / 2);
    const isPrimary = PATTERNS[this.pattern];
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const mark = this.symbol.rows[y - startY]?.[x - startX] === '#';
        const star = y === 0 && x >= WIDTH - this.stars;
        const field = isPrimary(x, y) ? this.primary : this.secondary;
        cells.push({ x, y, color: star ? '#ffd60a' : mark ? '#14161a' : field });
      }
    }
    return cells;
  }

  static get width() {
    return WIDTH;
  }

  static get height() {
    return HEIGHT;
  }
}
