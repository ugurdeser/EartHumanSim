import { smoothstep } from '../core/MathUtils.js';

/**
 * Zeminin rengi: bitki yoğunluklarının ortalama rengi. Parça resimlerinde ölçülen kaplama: olasılık
 * 1 iken yüzeyin bu payı o bitkinin noktalarıyla örtülü; uzaktan bakış yakındaki noktaların ortalama
 * rengidir, yaklaşınca görüntü değişmez. İşlemci (uzak harita) ve ekran kartı (zemin) aynı hesabı yapar.
 */
export const GROUND = Object.freeze({
  GRASS_COVER: 0.0192,
  BUSH_COVER: 0.016,
  TREE_COVER: 0.0977,
  TROPICS: 0.12, // haritanın yüksekliğinin payı: ekvatorun iki yanında yarıkürelerin renkleri harmanlanır
});

/** Paletin renk adları, ekran kartına bu sırayla gider. */
export const PALETTE_KEYS = Object.freeze(['ground', 'meadow', 'forest', 'grass', 'bush', 'tree']);

export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const covered = (chance, cover) => 1 - Math.exp(-chance * cover); // noktalar üst üste de binebilir

/** Mevsim paleti → { ad: [r, g, b] }. */
export const paletteRgb = (season) => Object.fromEntries(PALETTE_KEYS.map((key) => [key, hexToRgb(season.palette[key])]));

/** Haritanın `v` (0 kuzey, 1 güney) yüksekliğindeki palet: ekvator çevresinde iki yarıkürenin karışımı. */
export const paletteAt = (north, south, v) => {
  const southness = smoothstep(0.5 - GROUND.TROPICS, 0.5 + GROUND.TROPICS, v);
  return Object.fromEntries(PALETTE_KEYS.map((key) => [key, mix(north[key], south[key], southness)]));
};

/** Yoğunluklardan renk: verimli toprak otla, sık ağaçlık orman tabanıyla örtülüdür. */
export const groundColor = (palette, tree, bush, grass, fertility) => {
  const meadow = smoothstep(0.25, 0.9, fertility) * (0.6 + 0.4 * Math.min(1, grass / 0.6));
  let c = mix(palette.ground, palette.meadow, meadow);
  c = mix(c, palette.forest, smoothstep(0.08, 0.7, tree));
  c = mix(c, palette.grass, covered(grass, GROUND.GRASS_COVER));
  c = mix(c, palette.bush, covered(bush, GROUND.BUSH_COVER));
  return mix(c, palette.tree, covered(tree, GROUND.TREE_COVER));
};
