import { PLANET } from '../../config.js';
import { Planet } from '../../core/Planet.js';
import { BIOME_SHAPE } from '../../world/BiomeMap.js';
import { DETAIL_FADE } from '../../world/DetailNoise.js';
import { Terrain } from '../../world/Terrain.js';
import { GROUND, PALETTE_KEYS } from '../GroundColor.js';
import { CLOUD_FIELD } from '../CloudField.js';
import { HILLSHADE } from '../Hillshade.js';

/** JS sayısını GLSL ondalık sabitine çevirir (tam sayıya da nokta ekler). */
export const f = (n) => {
  const text = String(n);
  return /[.e]/.test(text) ? text : `${text}.0`;
};

/** "#rrggbb" → GLSL vec3 (0..1). */
export const vec3Of = (hex) => `vec3(${[1, 3, 5].map((i) => f(parseInt(hex.slice(i, i + 2), 16) / 255)).join(', ')})`;

/** Ortak başlık; gezegenin boyu derlenirken okunur. */
const HEADER = () => `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

const float PI = 3.141592653589793;
const float WORLD_W = ${f(Planet.width)};
const float WORLD_H = ${f(Planet.height)};

uniform vec2 u_size; // çıktı resminin piksel boyu
out vec4 outColor;

// Pikselin merkezi, sol üstten (tuvalin satırları yukarıdan aşağı).
vec2 pixelCenter() { return vec2(gl_FragCoord.x, u_size.y - gl_FragCoord.y); }

float latitudeOf(float y) { return (0.5 - y / WORLD_H) * PI; }

// Izgarayı JS'teki gibi okur: x sarar, komşu dört değer harmanlanır (py, satır sınırı içinde verilmeli).
float fieldAt(sampler2D field, float px, float py) {
  int cols = textureSize(field, 0).x;
  float left = floor(px);
  int col = int(mod(left, float(cols)));
  int next = col + 1 == cols ? 0 : col + 1;
  int row = int(floor(py));
  float fx = px - left;
  float fy = py - float(row);
  float a = texelFetch(field, ivec2(col, row), 0).r;
  float b = texelFetch(field, ivec2(next, row), 0).r;
  float c = texelFetch(field, ivec2(col, row + 1), 0).r;
  float d = texelFetch(field, ivec2(next, row + 1), 0).r;
  return mix(mix(a, b, fx), mix(c, d, fx), fy);
}
`;

/** DetailNoise.js'in gürültüsü: tamsayı karmasıyla, işlemcidekiyle aynı değerler. */
const DETAIL_NOISE = `
float latticeValue(int x, int y, uint seed) {
  uint h = (uint(x) * 0x8da6b343u) ^ (uint(y) * 0xd8163841u) ^ seed;
  h = (h ^ (h >> 15)) * 0x2c1b3c6du;
  h = (h ^ (h >> 12)) * 0x297a2d39u;
  h ^= h >> 15;
  return float(h >> 8) / 16777216.0;
}

float latticeNoise(ivec2 base, vec2 f, int wrap, uint seed) {
  int left = base.x - wrap * int(floor(float(base.x) / float(wrap)));
  if (left >= wrap) left -= wrap;
  if (left < 0) left += wrap;
  int right = left + 1 == wrap ? 0 : left + 1;
  vec2 s = f * f * (3.0 - 2.0 * f);
  float a = latticeValue(left, base.y, seed);
  float b = latticeValue(right, base.y, seed);
  float c = latticeValue(left, base.y + 1, seed);
  float d = latticeValue(right, base.y + 1, seed);
  float top = a + (b - a) * s.x;
  return top + (c + (d - c) * s.x - top) * s.y;
}

// Katın sönme payı (DetailNoise.weight): örnek kafes aralığından büyükse kat ortalamasına söner.
float octaveWeight(float spacing, float footprint) {
  return 1.0 - smoothstep(spacing * ${f(DETAIL_FADE.FROM)}, spacing * ${f(DETAIL_FADE.TO)}, footprint);
}

// at: görünen alanın başlangıcının kafes konumu (tamX, tamY, kesirX, kesirY); q: başlangıca göre konum
float detailNoise(vec4 at, vec2 q, float scale, int cells, int octaves, uint seed, float footprint) {
  float amplitude = 1.0;
  float sum = 0.0;
  float norm = 0.0;
  int m = 1;
  for (int i = 0; i < 12; i++) {
    if (i >= octaves) break;
    float weight = footprint > 0.0 ? octaveWeight(scale / float(m), footprint) : 1.0;
    float value = 0.5;
    if (weight > 0.0) {
      vec2 c = float(m) * (at.zw + q / scale);
      vec2 whole = floor(c);
      ivec2 base = ivec2(m * int(at.x) + int(whole.x), m * int(at.y) + int(whole.y));
      value = latticeNoise(base, c - whole, cells * m, seed ^ (uint(i) * 0x9e3779b9u));
    }
    sum += (0.5 + (value - 0.5) * weight) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    m *= 2;
  }
  return sum / norm;
}

// Sönen katların yayılımı (DetailNoise.spreadAt).
float noiseSpread(float scale, int octaves, float footprint) {
  if (footprint <= 0.0) return 0.0;
  float amplitude = 1.0;
  float missing = 0.0;
  float norm = 0.0;
  float m = 1.0;
  for (int i = 0; i < 12; i++) {
    if (i >= octaves) break;
    float weight = octaveWeight(scale / m, footprint);
    missing += amplitude * amplitude * (1.0 - weight * weight);
    norm += amplitude;
    amplitude *= 0.5;
    m *= 2.0;
  }
  return sqrt(missing) / norm * ${f(DETAIL_FADE.SPREAD)};
}
`;

const noiseConstants = (name, noise) =>
  noise
    ? `const float ${name}_SCALE = ${f(noise.scale)};\nconst int ${name}_CELLS = ${noise.cells};\nconst int ${name}_OCTAVES = ${noise.octaves};\nconst uint ${name}_SEED = ${noise.seed >>> 0}u;\n`
    : `const float ${name}_SCALE = 1.0;\nconst int ${name}_CELLS = 1;\nconst int ${name}_OCTAVES = 0;\nconst uint ${name}_SEED = 0u;\n`;

/**
 * Terrain.js'in yükselti, deniz ve buzul sorguları. Konumlar görünen alanın başlangıcına göredir
 * (q): büyük gezegende harita metresi 32 bitlik ondalık sayıya sığmaz, yakında kayma olurdu.
 */
const TERRAIN = (terrain) => {
  const shape = terrain.detailShape;
  return `
const float CELL = ${f(terrain.cellSize)};
const float SLOPE_SPREAD = ${f(terrain.slopeSpread)};
const float ICE_MARGIN = ${f(terrain.iceMargin)};
const float ICE_WOBBLE = ${f(terrain.iceWobble)};
const float LAND_RISE = ${f(shape.landRise)};
const float HILL_SHARE = ${f(shape.hillShare)};
const float COAST_SHARE = ${f(shape.coastShare)};
const float START_LAND = ${f(shape.startLand)};
const float RIDGE_MEAN = ${f(terrain.ridgeMean)};
const float HILL_MEAN = ${f(terrain.hillMean)};
${noiseConstants('COAST', terrain.coast)}${noiseConstants('RIDGE', terrain.ridges)}${noiseConstants('HILL', terrain.hills)}
uniform sampler2D u_heights;
uniform sampler2D u_belts;
uniform float u_seaLevel;
uniform vec2 u_icePhase;
uniform vec2 u_start;       // başlangıç yeri (çevresinde dağ yok)
uniform vec2 u_origin;      // q = 0 noktasının harita konumu
uniform vec2 u_originCell;  // aynı nokta, ızgara hücresiyle
uniform vec4 u_coastAt;     // aynı nokta, gürültülerin kafesinde (DetailNoise.originOf)
uniform vec4 u_ridgeAt;
uniform vec4 u_hillAt;
uniform float u_detail;     // 1: sırtlar, tepeler, kıyı girintileri; 0: ortalamaları (uzaktan)
uniform float u_spread;     // eğimin ölçüldüğü uzaklık

vec2 absoluteOf(vec2 q) { return u_origin + q; }

float gridField(sampler2D field, vec2 q) {
  float rows = float(textureSize(field, 0).y);
  return fieldAt(field, u_originCell.x + q.x / CELL, clamp(u_originCell.y + q.y / CELL, 0.0, rows - 1.001));
}

float heightAt(vec2 q) {
  float base = gridField(u_heights, q);
  if (COAST_OCTAVES == 0 || u_detail <= 0.0) return base;
  return base + (detailNoise(u_coastAt, q, COAST_SCALE, COAST_CELLS, COAST_OCTAVES, COAST_SEED, 0.0) - 0.5) * 2.0 * COAST_SHARE * u_detail;
}

bool isIce(vec2 q) {
  vec2 p = absoluteOf(q);
  float angle = p.x / WORLD_W * PI * 2.0;
  float wobble = (sin(angle * 3.0 + u_icePhase.x) + sin(angle * 7.0 + u_icePhase.y) * 0.5) * ICE_WOBBLE;
  return min(p.y, WORLD_H - p.y) < ICE_MARGIN + wobble;
}

bool isSea(vec2 q) { return heightAt(q) < u_seaLevel; }

float openness(vec2 p) {
  float dx = mod(p.x - u_start.x + WORLD_W / 2.0, WORLD_W) - WORLD_W / 2.0;
  return smoothstep(START_LAND * 0.6, START_LAND * 1.2, length(vec2(dx, p.y - u_start.y)));
}

float elevationAt(vec2 q) {
  float inland = clamp((heightAt(q) - u_seaLevel) / LAND_RISE, 0.0, 1.0);
  if (inland <= 0.0 || isIce(q)) return 0.0;
  float ridge = RIDGE_MEAN;
  float hills = HILL_MEAN;
  if (u_detail > 0.0) {
    float r = 1.0 - abs(2.0 * detailNoise(u_ridgeAt, q, RIDGE_SCALE, RIDGE_CELLS, RIDGE_OCTAVES, RIDGE_SEED, 0.0) - 1.0);
    ridge = mix(RIDGE_MEAN, r * r, u_detail);
    hills = mix(HILL_MEAN, detailNoise(u_hillAt, q, HILL_SCALE, HILL_CELLS, HILL_OCTAVES, HILL_SEED, 0.0), u_detail);
  }
  float belt = openness(absoluteOf(q)) * gridField(u_belts, q);
  return smoothstep(0.0, 0.5, inland) * (belt * ridge + hills * HILL_SHARE);
}
`;
};

/** BiomeMap.js'in bitki yoğunlukları; `footprint` (m) ondan ince ayrıntıyı ortalamasına söndürür. */
const BIOMES = (biomes) => `
${noiseConstants('FOREST', biomes.forestNoise)}${noiseConstants('REGION', biomes.regionNoise)}${noiseConstants('BUSH', biomes.bushNoise)}${noiseConstants('MEADOW', biomes.meadowNoise)}${noiseConstants('FERTILE', biomes.fertileNoise)}
const float FERTILITY_FAR = ${f(PLANET.FERTILITY_FAR)};
const float HOME_RADIUS = ${f(PLANET.HOME_RADIUS)};
const float FERTILITY_REACH = ${f(PLANET.FERTILITY_REACH)};
uniform vec4 u_forestAt;
uniform vec4 u_regionAt;
uniform vec4 u_bushAt;
uniform vec4 u_meadowAt;
uniform vec4 u_fertileAt;

float wideStep(float e0, float e1, float x, float spread) {
  return smoothstep(e0 - ${f(BIOME_SHAPE.WIDEN)} * spread, e1 + ${f(BIOME_SHAPE.WIDEN)} * spread, x);
}

vec2 forestAt(vec2 q, float footprint) {
  float value = detailNoise(u_forestAt, q, FOREST_SCALE, FOREST_CELLS, FOREST_OCTAVES, FOREST_SEED, footprint) * 0.7
    + detailNoise(u_regionAt, q, REGION_SCALE, REGION_CELLS, REGION_OCTAVES, REGION_SEED, footprint) * 0.3;
  float spread = length(vec2(0.7 * noiseSpread(FOREST_SCALE, FOREST_OCTAVES, footprint), 0.3 * noiseSpread(REGION_SCALE, REGION_OCTAVES, footprint)));
  return vec2(value, spread);
}

float fertilityAt(vec2 q, float footprint) {
  vec2 p = absoluteOf(q);
  float dx = mod(p.x - u_start.x + WORLD_W / 2.0, WORLD_W) - WORLD_W / 2.0;
  float fromStart = length(vec2(dx, p.y - u_start.y));
  float fertile = detailNoise(u_fertileAt, q, FERTILE_SCALE, FERTILE_CELLS, FERTILE_OCTAVES, FERTILE_SEED, footprint);
  float region = mix(FERTILITY_FAR, 1.0, wideStep(0.42, 0.62, fertile, noiseSpread(FERTILE_SCALE, FERTILE_OCTAVES, footprint)));
  float remote = mix(1.0, region, smoothstep(HOME_RADIUS * 1.5, FERTILITY_REACH, fromStart));
  float sinLat = sin(latitudeOf(p.y));
  float polar = smoothstep(0.55, 0.85, sinLat * sinLat);
  return remote * (1.0 - polar * 0.8);
}

// x: ağaç, y: çalı, z: ot olasılığı, w: verimlilik
vec4 plantsAt(vec2 q, float footprint) {
  vec2 forest = forestAt(q, footprint);
  float fertility = fertilityAt(q, footprint);
  float tree = (wideStep(0.5, 0.72, forest.x, forest.y) * 0.85 + 0.015) * fertility;
  float clump = detailNoise(u_bushAt, q, BUSH_SCALE, BUSH_CELLS, BUSH_OCTAVES, BUSH_SEED, footprint);
  float edge = wideStep(0.42, 0.62, forest.x, forest.y);
  float bush = (wideStep(0.5, 0.72, clump, noiseSpread(BUSH_SCALE, BUSH_OCTAVES, footprint)) * 0.5 + edge * 0.2 + 0.02) * fertility;
  float meadow = detailNoise(u_meadowAt, q, MEADOW_SCALE, MEADOW_CELLS, MEADOW_OCTAVES, MEADOW_SEED, footprint);
  float openness = 1.0 - wideStep(0.55, 0.75, forest.x, forest.y);
  float grass = (wideStep(0.35, 0.6, meadow, noiseSpread(MEADOW_SCALE, MEADOW_OCTAVES, footprint)) * openness * 0.9 + 0.05) * fertility;
  return vec4(tree, bush, grass, fertility);
}
`;

/** GroundColor.js'in zemin rengi: mevsim paletleri (kuzey ve güney yarıküre) 0..255 renkle. */
const GROUND_COLOR = `
uniform vec3 u_north[${PALETTE_KEYS.length}];
uniform vec3 u_south[${PALETTE_KEYS.length}];

float covered(float chance, float cover) { return 1.0 - exp(-chance * cover); }

vec3 groundColor(vec2 q, float footprint) {
  vec4 plants = plantsAt(q, footprint);
  float southness = smoothstep(${f(0.5 - GROUND.TROPICS)}, ${f(0.5 + GROUND.TROPICS)}, absoluteOf(q).y / WORLD_H);
  vec3 palette[${PALETTE_KEYS.length}];
  for (int i = 0; i < ${PALETTE_KEYS.length}; i++) palette[i] = mix(u_north[i], u_south[i], southness);
  float meadow = smoothstep(0.25, 0.9, plants.w) * (0.6 + 0.4 * min(1.0, plants.z / 0.6));
  vec3 c = mix(palette[0], palette[1], meadow);
  c = mix(c, palette[2], smoothstep(0.08, 0.7, plants.x));
  c = mix(c, palette[3], covered(plants.z, ${f(GROUND.GRASS_COVER)}));
  c = mix(c, palette[4], covered(plants.y, ${f(GROUND.BUSH_COVER)}));
  return mix(c, palette[5], covered(plants.x, ${f(GROUND.TREE_COVER)})) / 255.0;
}
`;

/** Hillshade.js'in ışık ve kar hesabı. */
const SHADING = `
uniform float u_sunX;

float lightAt(vec2 q) {
  vec2 p = absoluteOf(q);
  float toSun = (u_sunX - p.x) / WORLD_W * PI * 2.0; // sarmaya gerek yok: açı zaten devirli
  float latitude = latitudeOf(p.y);
  float cosSun = cos(toSun);
  float sunUp = cos(latitude) * cosSun;
  if (sunUp <= 0.0) return 0.0;
  float east = (elevationAt(q + vec2(u_spread, 0.0)) - elevationAt(q - vec2(u_spread, 0.0))) / (u_spread * 2.0);
  float south = (elevationAt(q + vec2(0.0, u_spread)) - elevationAt(q - vec2(0.0, u_spread))) / (u_spread * 2.0);
  float sunEast = sin(toSun);
  float sunNorth = -sin(latitude) * cosSun;
  float light = ${f(HILLSHADE.PEAK_HEIGHT)} * (south * sunNorth - east * sunEast) / max(sunUp, ${f(HILLSHADE.LOW_SUN)});
  return clamp(light, -1.0, 1.0) * ${f(HILLSHADE.SHADE)} * clamp(sunUp / ${f(HILLSHADE.DUSK)}, 0.0, 1.0);
}

float snowAt(vec2 q) {
  float line = ${f(HILLSHADE.SNOW_LINE)} * (1.0 - ${f(HILLSHADE.POLAR_DROP)} * (abs(latitudeOf(absoluteOf(q).y)) / (PI / 2.0)));
  return smoothstep(line, line + ${f(HILLSHADE.SNOW_EDGE)}, elevationAt(q));
}
`;

/** Atmosfer ızgarası (WeatherMaps): bulut eşiği, bulut rengi, kar örtüsü. */
const WEATHER_GRID = `
uniform sampler2D u_cloudThreshold;
uniform sampler2D u_cloudShade;
uniform sampler2D u_snowCover;

// u, v: 0..1 harita konumu; ızgara hücre merkezleri arasında harmanlanır
float gridAt(sampler2D field, float u, float v) {
  vec2 size = vec2(textureSize(field, 0));
  return fieldAt(field, fract(u) * size.x - 0.5, clamp(v * size.y - 0.5, 0.0, size.y - 1.001));
}
`;

/** CloudField.js'in iki kayan katmanlı bulut deseni; eşiği yerin bulut örtüsünden. */
const CLOUDS = `
uniform sampler2D u_cloudField;
uniform vec2 u_drift; // iki katmanın kayması (CloudField.drift)

float cloudAt(float u, float v) {
  float height = ${f(CLOUD_FIELD.HEIGHT)};
  return fieldAt(u_cloudField, fract(u) * ${f(CLOUD_FIELD.WIDTH)} - 0.5, clamp(v * height - 0.5, 0.0, height - 1.001));
}

// u, v: 0..1 harita konumu
float cloudOpacity(float u, float v) {
  float threshold = gridAt(u_cloudThreshold, u, v);
  float density = (cloudAt(u - u_drift.x, v) + cloudAt(u + u_drift.y, 1.0 - v)) / 2.0;
  return smoothstep(threshold - ${f(CLOUD_FIELD.EDGE)}, threshold + ${f(CLOUD_FIELD.EDGE)}, density) * ${f(CLOUD_FIELD.MAX_ALPHA)};
}

float cloudShade(float u, float v) { return gridAt(u_cloudShade, u, v); }
`;

/** Düz görünüm: çıktı pikselinin görünen alanın sol üst köşesine göre konumu (u_bounds: genişlik, yükseklik). */
const FLAT = `
uniform vec2 u_bounds;
vec2 worldAt(vec2 pixel) { return pixel / u_size * u_bounds; }
`;

/** Bir parça gölgelendiricinin ortak başlığı: yüzey, ışık ve bulut fonksiyonlarının tümü. */
export const fragment = (world, body) =>
  HEADER() + DETAIL_NOISE + TERRAIN(world.terrain) + BIOMES(world.biomes) + GROUND_COLOR + SHADING + WEATHER_GRID + CLOUDS + FLAT + body;

/**
 * Konumların sayıldığı başlangıç noktası, gölgelendiriciye: (x, y) noktası q = 0 olur.
 * `footprint`: bir çıktı pikselinin kapladığı uzunluk (m); ayrıntının payını ve eğimin ölçeğini verir.
 */
export const frameUniforms = ({ terrain, biomes }, x, y, footprint) => {
  const at = (noise) => (noise ? noise.originOf(x, y) : [0, 0, 0, 0]);
  const cellX = x / terrain.cellSize;
  return {
    u_forestAt: at(biomes.forestNoise),
    u_regionAt: at(biomes.regionNoise),
    u_bushAt: at(biomes.bushNoise),
    u_meadowAt: at(biomes.meadowNoise),
    u_fertileAt: at(biomes.fertileNoise),
    u_origin: [x, y],
    u_originCell: [cellX - Math.floor(cellX / terrain.cols) * terrain.cols, y / terrain.cellSize],
    u_coastAt: at(terrain.coast),
    u_ridgeAt: at(terrain.ridges),
    u_hillAt: at(terrain.hills),
    u_detail: Terrain.detailFor(footprint),
    u_spread: Math.max(terrain.slopeSpread, footprint),
  };
};

/**
 * Düz görünümdeki görünür alan, gölgelendiriciye: q = 0 sol üst köşesidir. `bias`: ayrıntı düzeyi
 * (DisplaySettings.lod) — büyükse ayrıntı daha erken söner.
 */
export const boundsUniforms = (world, { minX, minY, maxX, maxY }, pixels, bias = 1) => ({
  ...frameUniforms(world, minX, minY, ((maxX - minX) / pixels) * bias),
  u_bounds: [maxX - minX, maxY - minY],
});
