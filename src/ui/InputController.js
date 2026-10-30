import { AgentLayer } from '../render/AgentLayer.js';
import { ChunkLayer } from '../render/ChunkLayer.js';
import { FeatureLayer } from '../render/FeatureLayer.js';

const DRAG_THRESHOLD = 4;
const PICK_RADIUS_PX = 12;
const HOME_PICK_MARGIN_PX = 4; // yuva noktasının biraz dışına tıklamak da sayılır
const PERSON_OVER_HOME_PX = 5; // yuvanın üstünde duran kişi ancak tam üstüne tıklanırsa seçilir
const ZOOM_STEP = 1.15;

/** Fare/klavye: tekerlek = zoom, sürükle = kaydır, tıkla = kişi, yuva, hayvan ya da bitki seç. */
export class InputController {
  constructor({ canvas, camera, world, selection, game }) {
    this.canvas = canvas;
    this.camera = camera;
    this.world = world;
    this.selection = selection;
    this.game = game;
    this.drag = null;
    this.#bind();
  }

  #bind() {
    this.canvas.addEventListener('wheel', (e) => this.#onWheel(e), { passive: false });
    this.canvas.addEventListener('mousedown', (e) => this.#onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.#onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.#onMouseUp(e));
    window.addEventListener('keydown', (e) => this.#onKeyDown(e));
  }

  #localPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  #onWheel(e) {
    e.preventDefault();
    const { x, y } = this.#localPoint(e);
    this.camera.zoomAt(x, y, e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP);
  }

  #onMouseDown(e) {
    if (e.button !== 0) return;
    this.drag = { startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY, moved: false };
  }

  #onMouseMove(e) {
    if (!this.drag) return;
    const d = this.drag;
    if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > DRAG_THRESHOLD) d.moved = true;
    if (!d.moved) return;
    this.camera.panBy(e.clientX - d.lastX, e.clientY - d.lastY);
    this.selection.follow = false;
    d.lastX = e.clientX;
    d.lastY = e.clientY;
  }

  #onMouseUp(e) {
    if (!this.drag) return;
    const wasClick = !this.drag.moved;
    this.drag = null;
    if (wasClick && e.target === this.canvas) this.#pick(e);
  }

  #pick(e) {
    const { x, y } = this.#localPoint(e);
    const point = this.camera.screenToWorld(x, y);
    const maxDistance = this.camera.pixels(PICK_RADIUS_PX);
    let best = null;
    let bestDistance = maxDistance;
    for (const person of this.world.people) {
      const d = person.position.distanceTo(point);
      if (d < bestDistance) {
        best = person;
        bestDistance = d;
      }
    }
    const home = this.#homeAt(point);
    if (best && (!home || bestDistance <= this.camera.pixels(PERSON_OVER_HOME_PX))) this.selection.select(best);
    else if (home) this.selection.selectHome(home);
    else this.#pickAnimal(point, maxDistance);
  }

  /** Tıklanan noktanın üstündeki en yakın yuva. */
  #homeAt(point) {
    const margin = this.camera.pixels(HOME_PICK_MARGIN_PX);
    const reach = (home) => FeatureLayer.homeRadius(home, this.camera) + margin;
    const maxReach = this.camera.pixels(PICK_RADIUS_PX * 2) + 10;
    const homes = this.world.homeGrid.queryRadius(point, maxReach, (home) => home.position.distanceTo(point) <= reach(home));
    return homes.reduce((nearest, home) => (!nearest || home.position.distanceTo(point) < nearest.position.distanceTo(point) ? home : nearest), null);
  }

  /** Haritada görünen hayvanlar seçilebilir (uzaktan balıklar çizilmez). */
  #pickAnimal(point, maxDistance) {
    const found = this.world.nearestAnimal(point, maxDistance, (a) => AgentLayer.isVisible(a, this.camera));
    if (found) this.selection.selectAnimal(found.animal);
    else this.#pickPlant(point, maxDistance);
  }

  /** Bitkiler yalnızca tek tek çizildikleri yakınlıkta seçilebilir. */
  #pickPlant(point, maxDistance) {
    const plant = this.camera.zoom >= ChunkLayer.maxZoom ? this.world.plantAt(point, maxDistance) : null;
    if (plant) this.selection.selectPlant(plant);
    else this.selection.clear();
  }

  #onKeyDown(e) {
    if (e.code === 'F1') {
      e.preventDefault(); // tarayıcının yardım sayfası açılmasın
      this.game.devPanel.toggle();
      return;
    }
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
    if (e.code === 'Space') {
      e.preventDefault();
      this.game.togglePause();
    } else if (/^Digit[1-9]$/.test(e.code)) {
      this.game.setSpeedIndex(Number(e.code.slice(5)) - 1);
    } else if (e.code === 'KeyF' && this.selection.person) {
      this.selection.follow = !this.selection.follow;
    } else if (e.code === 'Escape') {
      this.selection.clear();
    } else if (e.code === 'KeyH') {
      this.camera.fitWorld();
    }
  }
}
