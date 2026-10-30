import { RELATIONS } from '../config.js';
import { clamp } from '../core/MathUtils.js';

/** İlişkinin adı; `group` arayüzde hangi başlık altında görüneceğini söyler. */
export const RelationKind = Object.freeze({
  IN_LOVE: Object.freeze({ name: 'Aşık', group: 'Aşk' }),
  ATTRACTED: Object.freeze({ name: 'Hoşlanıyor', group: 'Aşk' }),
  CLOSE_FRIEND: Object.freeze({ name: 'Can dostu', group: 'Dostluk' }),
  FRIEND: Object.freeze({ name: 'Arkadaş', group: 'Dostluk' }),
  HATRED: Object.freeze({ name: 'Nefret ediyor', group: 'Düşmanlık' }),
  DISLIKE: Object.freeze({ name: 'Hoşlanmıyor', group: 'Düşmanlık' }),
  ACQUAINTANCE: Object.freeze({ name: 'Tanıdık', group: 'Tanıdıklar' }),
});

/** Yakınlık yavaş kurulur, derinleştikçe daha da yavaşlar; kırılması ise anlıktır. */
const slowed = (delta, value, growth) => (delta > 0 ? delta * growth * Math.min(1, (1 - value) ** 2) : delta);

/** Bir kişinin başka birine bakışı (tek yönlü). */
export class Relationship {
  constructor({ affinity = 0, attraction = 0, respect = 0 } = {}) {
    this.affinity = affinity; // sevgi/yakınlık  -1..1
    this.attraction = attraction; // çekim         0..1
    this.respect = respect; // saygı           -1..1
    this.rejectedAt = null; // bu kişi tarafından en son ne zaman reddedildi
    this.lastQuarrel = -Infinity;
  }

  /** Duyguların adı: nefret sevgiden, aşk dostluktan önce gelir. */
  get kind() {
    if (this.affinity <= -0.5) return RelationKind.HATRED;
    if (this.attraction >= 0.6) return RelationKind.IN_LOVE;
    if (this.affinity <= -0.15) return RelationKind.DISLIKE;
    if (this.attraction >= 0.35) return RelationKind.ATTRACTED;
    if (this.affinity >= 0.6) return RelationKind.CLOSE_FRIEND;
    if (this.affinity >= 0.3) return RelationKind.FRIEND;
    return RelationKind.ACQUAINTANCE;
  }

  /** Duygunun gücü (sıralama için): nefret de güçlü bir duygudur. */
  get strength() {
    return Math.max(Math.abs(this.affinity), this.attraction);
  }

  wasRejectedRecently(now, cooldown) {
    return this.rejectedAt !== null && now - this.rejectedAt < cooldown;
  }

  changeAffinity(delta) {
    this.affinity = clamp(this.affinity + slowed(delta, this.affinity, RELATIONS.AFFINITY_GROWTH), -1, 1);
  }

  changeAttraction(delta) {
    this.attraction = clamp(this.attraction + slowed(delta, this.attraction, RELATIONS.ATTRACTION_GROWTH), 0, 1);
  }

  changeRespect(delta) {
    this.respect = clamp(this.respect + delta, -1, 1);
  }
}
