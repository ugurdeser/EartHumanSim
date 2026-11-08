const STARS = 900;
const TINTS = ['#ffffff', '#ffffff', '#cfe0ff', '#ffe9c9'];

/** Açılış ve yükleme ekranlarının arkasındaki yıldızlı gökyüzü (bir kez çizilir). */
export class Starfield {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'starfield';
    this.#paint();
  }

  #paint() {
    const width = 1920;
    const height = 1080;
    Object.assign(this.canvas, { width, height });
    const ctx = this.canvas.getContext('2d');
    for (let i = 0; i < STARS; i++) {
      const size = Math.random() ** 5 * 2 + 0.6;
      ctx.globalAlpha = 0.25 + Math.random() * 0.75;
      ctx.fillStyle = TINTS[i % TINTS.length];
      ctx.fillRect(Math.random() * width, Math.random() * height, size, size);
    }
    ctx.globalAlpha = 1;
  }
}
