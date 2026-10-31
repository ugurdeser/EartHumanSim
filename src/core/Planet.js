import { WORLD } from '../config.js';
import { lerp } from './MathUtils.js';

const WIDTH = WORLD.WIDTH;
const HALF_WIDTH = WIDTH / 2;
const SEAM = 12000; // m: gürültünün başa bağlandığı şerit

/** Doğu-batı doğrultusu sarar: x, [0, genişlik) aralığına döner. */
export const wrapX = (x) => (x >= 0 && x < WIDTH ? x : ((x % WIDTH) + WIDTH) % WIDTH);

/** İki boylam arasındaki en kısa fark (dünyanın öbür yanından dolaşmak daha kısaysa onu verir). */
export const wrapDelta = (dx) => (dx > HALF_WIDTH || dx < -HALF_WIDTH ? dx - WIDTH * Math.round(dx / WIDTH) : dx);

/** Enlem (radyan): kuzey kutbu +π/2, ekvator 0. */
export const latitudeOf = (y) => (0.5 - y / WORLD.HEIGHT) * Math.PI;

/** Sarmayan bir gürültüyü dünyanın dikişinde başa bağlar. */
export const seamless = (x, sample) => {
  const value = sample(x);
  return x < WIDTH - SEAM ? value : lerp(value, sample(x - WIDTH), (x - (WIDTH - SEAM)) / SEAM);
};
