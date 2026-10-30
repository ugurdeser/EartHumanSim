import { Action } from './Action.js';

/**
 * Anlık bir iş yapar. Fonksiyon `false` döndürürse eylem başarısız sayılır;
 * bir Action döndürürse SequenceAction onu bir sonraki adım olarak ekler.
 */
export class CallbackAction extends Action {
  constructor(label, fn) {
    super(label);
    this.fn = fn;
    this.next = null;
  }

  tick(person, world) {
    const result = this.fn(person, world);
    if (result === false) return this.fail();
    if (result instanceof Action) this.next = result;
    this.complete();
  }
}
