import { Items } from '../items/Items.js';

/** Ölüm anının fotoğrafı: sonradan ev ve depo değişse de o anki durum okunur. */
export class DeathReport {
  constructor(person, world) {
    const { home, inventory, group } = person;
    const clean = world.findNearestPond(person.position, { allowContaminated: false });
    this.time = world.now;
    this.date = world.calendar.date;
    this.carried = { food: inventory.foodCount, water: inventory.count(Items.WATER), fuelSeconds: inventory.fuelSeconds, weight: inventory.weight, limit: inventory.carryLimit };
    this.distanceHome = person.position.distanceTo(home.position);
    this.home = {
      food: home.storage.foodCount,
      fuelSeconds: home.storage.fuelSeconds,
      fireLit: home.fire.isLit,
      shelter: home.shelter.name,
    };
    this.groupFood = group ? { name: group.name, count: group.stock.food } : null;
    this.waterDistance = clean ? clean.position.distanceTo(person.position) : null;
    this.weather = { name: world.weather.current.name, air: world.weather.temperature + world.climateAt(person.position), felt: person.feltTemperature(world) };
    this.clothes = inventory.bestInsulation;
    this.drive = person.currentDrive?.name ?? null;
    this.activity = person.activity;
    this.trail = [...person.trail.entries].reverse();
  }
}
