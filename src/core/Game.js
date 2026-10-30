import { SIM } from '../config.js';
import { clamp } from './MathUtils.js';
import { Camera } from '../render/Camera.js';
import { Renderer } from '../render/Renderer.js';
import { InputController } from '../ui/InputController.js';
import { Selection } from '../ui/Selection.js';
import { Sidebar } from '../ui/Sidebar.js';
import { AnimalWindow } from '../ui/AnimalWindow.js';
import { GroupWindow } from '../ui/GroupWindow.js';
import { HomeWindow } from '../ui/HomeWindow.js';
import { PlantWindow } from '../ui/PlantWindow.js';
import { ProductionWindow } from '../ui/ProductionWindow.js';
import { CharacterWindow } from '../ui/character/CharacterWindow.js';
import { DevPanel } from '../ui/dev/DevPanel.js';
import { WeatherDevSection } from '../ui/dev/WeatherDevSection.js';
import { FastForward } from './FastForward.js';
import { WorldBuilder } from './WorldBuilder.js';

const UI_REFRESH_MS = 200;
const START_VIEW_METERS = 1500;

/** Uygulamanın kompozisyon kökü ve ana döngüsü. */
export class Game {
  constructor({ canvas, sidebar, seed }) {
    const { rng, clock, calendar, log, world, start } = WorldBuilder.build(seed);
    Object.assign(this, { rng, clock, calendar, log, world });

    this.fastForward = new FastForward(clock, world);
    this.selection = new Selection();
    this.camera = new Camera(world.size);
    this.renderer = new Renderer(canvas, world, this.camera, this.selection);
    this.camera.fitWorld();
    this.camera.zoom = Math.min(this.camera.width, this.camera.height) / START_VIEW_METERS;
    this.camera.centerOn(start);

    this.sidebar = new Sidebar(sidebar, this);
    this.characterWindow = new CharacterWindow(canvas.parentElement, world, this.selection);
    this.plantWindow = new PlantWindow(canvas.parentElement, world, this.selection);
    this.homeWindow = new HomeWindow(canvas.parentElement, world, this.selection);
    this.groupWindow = new GroupWindow(canvas.parentElement, world, this.selection);
    this.animalWindow = new AnimalWindow(canvas.parentElement, world, this.selection);
    this.productionWindow = new ProductionWindow(canvas.parentElement);
    this.devPanel = new DevPanel(canvas.parentElement, [new WeatherDevSection(world.weather)]);
    this.input = new InputController({ canvas, camera: this.camera, world, selection: this.selection, game: this });

    this.accumulator = 0;
    this.lastFrame = null;
    this.lastUiRefresh = 0;
    window.addEventListener('resize', () => this.renderer.resize());
  }

  // ---------- Zaman kontrolü ----------

  togglePause() {
    this.clock.paused = !this.clock.paused;
  }

  setSpeedIndex(index) {
    if (index < 0 || index >= SIM.SPEEDS.length) return;
    this.clock.timeScale = SIM.SPEEDS[index];
    this.clock.paused = false;
  }

  /** Simülasyonu `days` gün ileri sarar (sürerken basılırsa eklenir). */
  skipDays(days) {
    this.fastForward.start(days);
  }

  cancelSkip() {
    this.fastForward.cancel();
  }

  /** Yüksek hızlarda adım büyür ki saniye başına adım sayısı makul kalsın. */
  get stepSize() {
    return clamp((this.clock.timeScale * SIM.REAL_TO_SIM) / SIM.STEPS_PER_SECOND, SIM.MIN_STEP, SIM.MAX_STEP);
  }

  // ---------- Döngü ----------

  start() {
    requestAnimationFrame((t) => this.#frame(t));
  }

  #frame(timestamp) {
    const realDt = this.lastFrame === null ? 0 : Math.min(0.1, (timestamp - this.lastFrame) / 1000);
    this.lastFrame = timestamp;

    this.#simulate(realDt);
    this.#followSelection();
    this.renderer.render();

    if (timestamp - this.lastUiRefresh > UI_REFRESH_MS) {
      this.lastUiRefresh = timestamp;
      this.sidebar.update();
      this.characterWindow.update();
      this.plantWindow.update();
      this.homeWindow.update();
      this.groupWindow.update();
      this.animalWindow.update();
      this.devPanel.update();
    }
    requestAnimationFrame((t) => this.#frame(t));
  }

  #simulate(realDt) {
    if (this.fastForward.step()) return; // ileri sarılırken normal akış bekler
    if (this.clock.paused) return;
    const step = this.stepSize;
    this.accumulator += realDt * SIM.REAL_TO_SIM * this.clock.timeScale;
    let steps = 0;
    while (this.accumulator >= step && steps < SIM.MAX_STEPS_PER_FRAME) {
      this.clock.advance(step);
      this.world.update(step);
      this.accumulator -= step;
      steps++;
    }
    if (steps === SIM.MAX_STEPS_PER_FRAME) this.accumulator = 0; // yetişemiyorsak birikmeyi at
  }

  #followSelection() {
    const person = this.selection.person;
    if (this.selection.follow && person?.alive) this.camera.centerOn(person.position);
  }
}
