import { DAY } from '../config.js';

const REJECTION_COOLDOWN = 3 * DAY;

/** Kişinin çevresindeki diğer kişiler hakkında sorgular. */
export class SocialQueries {
  /** Kişinin çekildiği, eşi olmayan karşı cins yetişkinlerden en iyisi. */
  static bestMateCandidate(person, world, maxDistance = 2000) {
    let best = null;
    let bestScore = -Infinity;
    for (const other of world.people) {
      if (other.partner || !world.social.canPair(person, other)) continue;
      if (person.relationTo(other).wasRejectedRecently(world.now, REJECTION_COOLDOWN)) continue;
      const distance = person.position.distanceTo(other.position);
      if (distance > maxDistance) continue;
      const ageGap = Math.abs(person.ageYears - other.ageYears);
      const score = person.relationTo(other).attraction - distance / 4000 - ageGap / 25;
      if (score > bestScore) {
        best = other;
        bestScore = score;
      }
    }
    return best;
  }

  /** Evli kişinin, eşinden daha çok çekildiği yakındaki biri. */
  static lover(person, world, minAttraction, maxDistance = 1000) {
    const spouse = person.relationTo(person.partner).attraction;
    let best = null;
    let bestAttraction = Math.max(minAttraction, spouse);
    for (const other of world.people) {
      if (other === person.partner || !world.social.canPair(person, other)) continue;
      const attraction = person.relations.peek(other)?.attraction ?? 0;
      if (attraction > bestAttraction && person.position.distanceTo(other.position) <= maxDistance) {
        best = other;
        bestAttraction = attraction;
      }
    }
    return best;
  }

  /** En çok yakınlık duyulan kişi (çocuklar için doğal olarak anne/baba). */
  static closestCompanion(person, world, maxDistance = 2000) {
    let best = null;
    let bestScore = -Infinity;
    for (const other of world.people) {
      if (other === person) continue;
      const distance = person.position.distanceTo(other.position);
      if (distance > maxDistance) continue;
      const score = person.relationTo(other).affinity - distance / 3000;
      if (score > bestScore) {
        best = other;
        bestScore = score;
      }
    }
    return best;
  }

  static playmate(person, world, maxDistance = 400) {
    let best = null;
    let bestDistance = maxDistance;
    for (const other of world.people) {
      if (other === person) continue;
      const willing = other.isChild || other.drives.get('play').pressure > 0.3;
      if (!willing) continue;
      const distance = person.position.distanceTo(other.position);
      if (distance < bestDistance) {
        best = other;
        bestDistance = distance;
      }
    }
    return best;
  }

  static hungriest(person, world, maxDistance = 1500) {
    let best = null;
    let lowestFood = 0.5; // yalnızca gerçekten aç olanlar
    for (const other of world.people) {
      if (other === person || person.position.distanceTo(other.position) > maxDistance) continue;
      if (other.needs.food < lowestFood) {
        best = other;
        lowestFood = other.needs.food;
      }
    }
    return best;
  }

  static isAlone(person, world, radius = 60) {
    return world.peopleNear(person.position, radius, person).length === 0;
  }
}
