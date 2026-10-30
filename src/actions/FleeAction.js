import { Vector2 } from '../core/Vector2.js';
import { Action } from './Action.js';

const GROUP_PULL_RADIUS = 300;

/** Tehditten uzağa koşar; mümkünse kalabalığa doğru kaçar. */
export class FleeAction extends Action {
  constructor(label, threatProvider, duration) {
    super(label);
    this.threatProvider = threatProvider;
    this.duration = duration;
    this.elapsed = 0;
  }

  tick(person, world, dt) {
    this.elapsed += dt;
    const threat = this.threatProvider();
    if (!threat || this.elapsed >= this.duration) return this.complete();

    const away = person.position.clone().sub(threat).normalize();
    const others = world.peopleNear(person.position, GROUP_PULL_RADIUS, person);
    if (others.length > 0) {
      const center = new Vector2();
      others.forEach((o) => center.add(o.position));
      center.scale(1 / others.length).sub(person.position).normalize();
      away.add(center.scale(0.7)).normalize();
    }
    const target = away.scale(50).add(person.position);
    person.moveTowards(target, person.runSpeed, dt, world);
  }
}
