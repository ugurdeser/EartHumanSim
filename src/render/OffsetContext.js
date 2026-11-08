/** Konum alan çizim komutları: hangi argümanlar (x, y) çiftidir. */
const POINTS = Object.freeze({
  arc: [[0, 1]],
  arcTo: [[0, 1], [2, 3]],
  ellipse: [[0, 1]],
  moveTo: [[0, 1]],
  lineTo: [[0, 1]],
  quadraticCurveTo: [[0, 1], [2, 3]],
  bezierCurveTo: [[0, 1], [2, 3], [4, 5]],
  rect: [[0, 1]],
  roundRect: [[0, 1]],
  fillRect: [[0, 1]],
  strokeRect: [[0, 1]],
  clearRect: [[0, 1]],
  fillText: [[1, 2]],
  strokeText: [[1, 2]],
  createLinearGradient: [[0, 1], [2, 3]],
  createRadialGradient: [[0, 1], [3, 4]],
});

/**
 * Tuvale harita metresiyle çizen katmanlar için kayan başlangıç noktası: komutlardaki konumlardan
 * `origin` çıkarılıp gerçek tuvale iletilir (dönüşüm de buna göre kurulur). Tarayıcı tuvali 32 bitlik
 * ondalık sayıyla çizer; gerçek boyda gezegende (40 milyon m) noktalar metrelerce kayardı.
 * Konum almayan her şey (renkler, kaydet/geri yükle, doldur...) olduğu gibi geçer.
 */
export class OffsetContext {
  static wrap(ctx, originX, originY) {
    const methods = new Map();
    const shifted = (name) => {
      const pairs = POINTS[name];
      if (name === 'drawImage') {
        return (image, ...args) => {
          // drawImage(resim, x, y[, g, y]) ya da (resim, kx, ky, kg, ky, x, y, g, y)
          const at = args.length === 8 ? 4 : 0;
          args[at] -= originX;
          args[at + 1] -= originY;
          return ctx.drawImage(image, ...args);
        };
      }
      if (name === 'arc') return (x, y, r, a0, a1, ccw) => ctx.arc(x - originX, y - originY, r, a0, a1, ccw);
      if (name === 'moveTo') return (x, y) => ctx.moveTo(x - originX, y - originY);
      if (name === 'lineTo') return (x, y) => ctx.lineTo(x - originX, y - originY);
      if (name === 'fillRect') return (x, y, w, h) => ctx.fillRect(x - originX, y - originY, w, h);
      return (...args) => {
        for (const [ix, iy] of pairs) {
          args[ix] -= originX;
          args[iy] -= originY;
        }
        return ctx[name](...args);
      };
    };
    return new Proxy(ctx, {
      get(target, prop) {
        let method = methods.get(prop);
        if (method) return method;
        if (prop === 'drawImage' || Object.hasOwn(POINTS, prop)) method = shifted(prop);
        else {
          const value = Reflect.get(target, prop);
          if (typeof value !== 'function') return value;
          method = value.bind(target);
        }
        methods.set(prop, method);
        return method;
      },
      set(target, prop, value) {
        return Reflect.set(target, prop, value);
      },
    });
  }
}
