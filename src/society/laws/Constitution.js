import { ALL_LAWS } from './Laws.js';

/** Bir topluluğun yürürlükteki yasaları: her konuda seçili seçenek. */
export class Constitution {
  constructor() {
    this.selected = new Map(ALL_LAWS.map((law) => [law, law.options[0]]));
  }

  /** Konunun yürürlükteki seçeneği. */
  option(law) {
    return this.selected.get(law);
  }

  is(law, optionId) {
    return this.option(law).id === optionId;
  }

  set(law, option) {
    this.selected.set(law, option);
  }

  /** Arayüz için: [{ law, option }] */
  entries() {
    return [...this.selected].map(([law, option]) => ({ law, option }));
  }
}
