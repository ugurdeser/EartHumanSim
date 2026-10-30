// Çizim olmadan simülasyonu hızlıca koşturan duman testi:
//   node scripts/headless-test.mjs [gün] [seed] [--quiet] [--step=sn]
import { DAY } from '../src/config.js';
import { WorldBuilder } from '../src/core/WorldBuilder.js';

const days = Number(process.argv[2] ?? 5);
const seed = Number(process.argv[3] ?? 42);
const quiet = process.argv.includes('--quiet');
const STEP = Number(process.argv.find((a) => a.startsWith('--step='))?.slice(7) ?? 4);

const { clock, calendar, log, world } = WorldBuilder.build(seed);
if (!quiet) log.subscribe((e) => console.log(`${e.time}  ${e.message}`));

const driveCounts = new Map();
const t0 = performance.now();
const end = clock.time + days * DAY;
let nextReport = clock.time + 30 * DAY;
while (clock.time < end) {
  clock.advance(STEP);
  world.update(STEP);
  for (const p of world.people) {
    const k = p.currentDrive?.name ?? 'Boşta';
    driveCounts.set(k, (driveCounts.get(k) ?? 0) + 1);
  }
  if (clock.time >= nextReport) {
    nextReport += 30 * DAY;
    console.log(`--- ${calendar.format()} | ${calendar.temperature.toFixed(0)}°C | nüfus=${world.people.length} hayvan=${world.animals.length} parça=${world.chunks.loadedCount} yol=${world.roads.size}`);
  }
}

console.log(`\n${days} gün ${(performance.now() - t0).toFixed(0)} ms sürdü (${calendar.format()})`);
console.log('Güdü dağılımı:', Object.fromEntries([...driveCounts].sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, Math.round(v / 1000)])));

const species = {};
for (const a of world.animals) species[a.species.name] = (species[a.species.name] ?? 0) + 1;
console.log('Hayvanlar:', species);

console.log('\nKişiler:');
for (const p of world.people) {
  const items = p.inventory.entries().map((e) => `${e.type.name}×${e.count}`).join(' ');
  const know = p.knowledge.technologies.map((t) => t.name).join(', ') || '-';
  console.log(
    `  ${p.fullName.padEnd(15)} ${String(p.age).padStart(2)}y zekâ=${p.traits.intelligence.toFixed(2)} ` +
      `yemek=${p.needs.food.toFixed(2)} ısı=${p.needs.warmth.toFixed(2)} sağlık=${p.needs.health.toFixed(2)} ` +
      `| ${p.home.shelter.name}${p.home.fire.isLit ? ' 🔥' : ''} | bilgi: ${know} | üstünde: ${items || '-'} | ${p.activity}`,
  );
}

console.log('\nYuvalar:');
for (const h of world.homes) {
  const store = h.storage.entries().map((e) => `${e.type.name}×${e.count}`).join(' ');
  console.log(`  ${h.label.padEnd(32)} ${h.shelter.name.padEnd(12)} inşaat=${h.construction ? Math.round(h.constructionProgress * 100) + '%' : '-'} depo: ${store || '-'}`);
}

const bad = world.people.filter((p) => p.partner && p.isCloseRelativeOf(p.partner));
console.log(bad.length ? `HATA: akraba çift ${bad.map((p) => p.name)}` : '\nAkraba evliliği yok ✓');
console.log(`Yaşayan=${world.people.length} Ölen=${world.deceased.length} Aile=${world.social.families.families.length}`);
