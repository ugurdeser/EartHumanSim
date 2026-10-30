import { COLORS } from '../config.js';
import { DotPainter } from './DotPainter.js';

const PERSON_MIN_PX = 4;
const PERSON_RADIUS_M = 0.9;
const LABEL_ZOOM = 0.6;
const FISH_ZOOM = 0.5; // uzaktan balıklar kalabalık yapmasın
const YOUNG_SCALE = 0.65; // kuzu gibi yavrular daha küçük

/** Hayvanlar ve insanlar (yalnızca görünür olanlar). */
export class AgentLayer {
  constructor(world, selection) {
    this.world = world;
    this.selection = selection;
  }

  draw(ctx, camera) {
    const bounds = camera.visibleBounds;
    this.#drawAnimals(ctx, camera, bounds);
    this.#drawPartnerLinks(ctx, camera);
    for (const person of this.world.people) {
      if (AgentLayer.#inside(person.position, bounds, 20)) this.#drawPerson(ctx, camera, person);
    }
    this.#drawSelection(ctx, camera);
  }

  static #inside(p, b, margin) {
    return p.x >= b.minX - margin && p.x <= b.maxX + margin && p.y >= b.minY - margin && p.y <= b.maxY + margin;
  }

  static isVisible(animal, camera) {
    return animal.species.id !== 'fish' || camera.zoom >= FISH_ZOOM;
  }

  personRadius(camera, person) {
    const base = Math.max(PERSON_RADIUS_M, camera.pixels(PERSON_MIN_PX));
    return person.isChild ? base * 0.7 : base;
  }

  #drawAnimals(ctx, camera, bounds) {
    const groups = new Map(); // tür -> görünür hayvanlar
    for (const animal of this.world.animals) {
      if (!animal.alive || !AgentLayer.#inside(animal.position, bounds, 5)) continue;
      const species = animal.species;
      if (!AgentLayer.isVisible(animal, camera)) continue;
      if (!groups.has(species)) groups.set(species, []);
      groups.get(species).push(animal);
    }
    for (const [species, animals] of groups) {
      const radius = AgentLayer.#animalRadius(camera, species.id);
      DotPainter.batch(ctx, animals, species.color, (a) => (a.isYoung ? radius * YOUNG_SCALE : radius));
      if (species.id === 'sheep') {
        ctx.strokeStyle = 'rgba(80,80,80,0.6)';
        ctx.lineWidth = camera.pixels(0.8);
        ctx.stroke();
      }
      if (species.id === 'wolf') {
        for (const wolf of animals) {
          if (wolf.isChasing) DotPainter.ring(ctx, wolf.position.x, wolf.position.y, radius * 1.7, '#e63946', camera.pixels(1.5));
        }
      }
    }
  }

  static #animalRadius(camera, id) {
    switch (id) {
      case 'fish':
        return Math.max(0.4, camera.pixels(1.8));
      case 'sheep':
        return Math.max(0.8, camera.pixels(2.8));
      default:
        return Math.max(0.9, camera.pixels(3.8));
    }
  }

  #drawPartnerLinks(ctx, camera) {
    ctx.strokeStyle = 'rgba(230, 57, 70, 0.45)';
    ctx.lineWidth = camera.pixels(1);
    ctx.setLineDash([camera.pixels(4), camera.pixels(4)]);
    ctx.beginPath();
    for (const person of this.world.people) {
      const partner = person.partner;
      if (!partner || person.id > partner.id) continue;
      ctx.moveTo(person.position.x, person.position.y);
      ctx.lineTo(partner.position.x, partner.position.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  #drawPerson(ctx, camera, person) {
    const { x, y } = person.position;
    const r = this.personRadius(camera, person);
    if (person.group) DotPainter.ring(ctx, x, y, r + camera.pixels(2), person.group.color, camera.pixels(1.5));
    if (person.group?.leader === person) DotPainter.ring(ctx, x, y, r + camera.pixels(4), COLORS.LEADER, camera.pixels(2));
    DotPainter.dot(ctx, x, y, r, person.sex.color);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = camera.pixels(1);
    ctx.stroke();

    if (camera.zoom >= LABEL_ZOOM || person === this.selection.person) {
      ctx.font = `${camera.pixels(11)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1b1b1b';
      ctx.fillText(person.name, x, y - r - camera.pixels(5));
    }
  }

  #drawSelection(ctx, camera) {
    for (const member of this.selection.group?.members ?? []) {
      DotPainter.ring(ctx, member.position.x, member.position.y, camera.pixels(10), COLORS.SELECTION, camera.pixels(2));
    }
    const home = this.selection.home;
    if (home) DotPainter.ring(ctx, home.position.x, home.position.y, camera.pixels(16), COLORS.SELECTION, camera.pixels(2.5));
    const plant = this.selection.plant;
    if (plant?.alive) DotPainter.ring(ctx, plant.position.x, plant.position.y, plant.radius + camera.pixels(4), COLORS.SELECTION, camera.pixels(2.5));
    const animal = this.selection.animal;
    if (animal?.alive) DotPainter.ring(ctx, animal.position.x, animal.position.y, camera.pixels(9), COLORS.SELECTION, camera.pixels(2.5));
    const person = this.selection.person;
    if (!person?.alive) return;
    const { x, y } = person.position;
    DotPainter.ring(ctx, x, y, this.personRadius(camera, person) + camera.pixels(6), COLORS.SELECTION, camera.pixels(2.5));
  }
}
