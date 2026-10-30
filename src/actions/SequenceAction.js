import { Action } from './Action.js';

/** Alt eylemleri sırayla yürütür; biri başarısız olursa dizi de başarısız olur. */
export class SequenceAction extends Action {
  constructor(label, steps) {
    super(label);
    this.steps = steps.filter(Boolean);
    this.index = 0;
  }

  get current() {
    return this.steps[this.index] ?? null;
  }

  get description() {
    return this.current?.description ?? this.label;
  }

  tick(person, world, dt) {
    const step = this.current;
    if (!step) return this.complete();

    step.update(person, world, dt);
    if (!step.isDone) return;
    if (!step.succeeded) return this.fail();

    if (step.next) this.steps.splice(this.index + 1, 0, step.next);
    this.index++;
    if (this.index >= this.steps.length) this.complete();
  }

  cancel() {
    this.current?.cancel();
    super.cancel();
  }
}
