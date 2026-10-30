import { Drive } from '../../drives/Drive.js';
import { CATEGORY_ORDER } from '../../drives/DriveCategory.js';
import { el } from '../dom.js';
import { BarView } from './BarView.js';

/** 15 güdü, tablodaki kategorilere göre gruplanmış. */
export class DrivesView {
  constructor(person) {
    this.person = person;
    this.bars = new Map();
    this.root = el('div', { class: 'drives' });
    for (const category of CATEGORY_ORDER) {
      this.root.append(el('h4', { text: category.label }));
      for (const drive of person.drives.list.filter((d) => d.category === category)) {
        const bar = new BarView(drive.name, 'drive');
        bar.row.title = `${drive.description}\nKişilik ağırlığı: ×${drive.weight.toFixed(2)}`;
        this.bars.set(drive.id, bar);
        this.root.append(bar.row);
      }
    }
  }

  update() {
    const p = this.person;
    for (const drive of p.drives.list) {
      const bar = this.bars.get(drive.id);
      bar.set(drive.urgency / Drive.MAX_RAW, drive.urgency.toFixed(2));
      bar.row.classList.toggle('active', drive === p.currentDrive);
      bar.row.classList.toggle('inactive', !p.alive || !drive.isApplicable(p));
    }
  }
}
