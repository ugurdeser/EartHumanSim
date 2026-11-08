import { PLANET, WORLD } from '../../config.js';
import { CLOUD_FIELD } from '../CloudField.js';
import { HILLSHADE } from '../Hillshade.js';

/** JS sayısını GLSL ondalık sabitine çevirir (tam sayıya da nokta ekler). */
export const f = (n) => {
  const text = String(n);
  return /[.e]/.test(text) ? text : `${text}.0`;
};

/** "#rrggbb" → GLSL vec3 (0..1). */
export const vec3Of = (hex) => `vec3(${[1, 3, 5].map((i) => f(parseInt(hex.slice(i, i + 2), 16) / 255)).join(', ')})`;

const HEADER = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

const float PI = 3.141592653589793;
const float WORLD_W = ${f(WORLD.WIDTH)};
const float WORLD_H = ${f(WORLD.HEIGHT)};

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

/** Terrain.js'in yükselti, deniz ve buzul sorguları. */
const TERRAIN = (terrain) => `
const float CELL = ${f(terrain.cellSize)};
const float SLOPE_SPREAD = ${f(terrain.slopeSpread)};
const float ICE_MARGIN = ${f(terrain.iceMargin)};
const float ICE_WOBBLE = ${f(PLANET.ICE_WOBBLE)};
uniform sampler2D u_heights;
uniform sampler2D u_elevations;
uniform float u_seaLevel;
uniform vec2 u_icePhase;

float terrainField(sampler2D field, vec2 p) {
  float rows = float(textureSize(field, 0).y);
  return fieldAt(field, mod(p.x, WORLD_W) / CELL, clamp(p.y / CELL, 0.0, rows - 1.001));
}

float elevationAt(vec2 p) { return terrainField(u_elevations, p); }

bool isSea(vec2 p) { return terrainField(u_heights, p) < u_seaLevel; }

bool isIce(vec2 p) {
  float angle = p.x / WORLD_W * PI * 2.0;
  float wobble = (sin(angle * 3.0 + u_icePhase.x) + sin(angle * 7.0 + u_icePhase.y) * 0.5) * ICE_WOBBLE;
  return min(p.y, WORLD_H - p.y) < ICE_MARGIN + wobble;
}
`;

/** Hillshade.js'in ışık ve kar hesabı. */
const SHADING = `
uniform float u_sunX;

float lightAt(vec2 p) {
  float toSun = (u_sunX - p.x) / WORLD_W * PI * 2.0; // sarmaya gerek yok: açı zaten devirli
  float latitude = latitudeOf(p.y);
  float cosSun = cos(toSun);
  float sunUp = cos(latitude) * cosSun;
  if (sunUp <= 0.0) return 0.0;
  float east = (elevationAt(p + vec2(SLOPE_SPREAD, 0.0)) - elevationAt(p - vec2(SLOPE_SPREAD, 0.0))) / (SLOPE_SPREAD * 2.0);
  float south = (elevationAt(p + vec2(0.0, SLOPE_SPREAD)) - elevationAt(p - vec2(0.0, SLOPE_SPREAD))) / (SLOPE_SPREAD * 2.0);
  float sunEast = sin(toSun);
  float sunNorth = -sin(latitude) * cosSun;
  float light = ${f(HILLSHADE.PEAK_HEIGHT)} * (south * sunNorth - east * sunEast) / max(sunUp, ${f(HILLSHADE.LOW_SUN)});
  return clamp(light, -1.0, 1.0) * ${f(HILLSHADE.SHADE)} * clamp(sunUp / ${f(HILLSHADE.DUSK)}, 0.0, 1.0);
}

float snowAt(vec2 p) {
  float line = ${f(HILLSHADE.SNOW_LINE)} * (1.0 - ${f(HILLSHADE.POLAR_DROP)} * (abs(latitudeOf(p.y)) / (PI / 2.0)));
  return smoothstep(line, line + ${f(HILLSHADE.SNOW_EDGE)}, elevationAt(p));
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

/** Düz görünüm: çıktı pikselinin dünya konumu (u_bounds: minX, minY, genişlik, yükseklik). */
const FLAT = `
uniform vec4 u_bounds;
vec2 worldAt(vec2 pixel) { return u_bounds.xy + pixel / u_size * u_bounds.zw; }
`;

/** Bir parça gölgelendiricinin ortak başlığı: yüzey, ışık ve bulut fonksiyonlarının tümü. */
export const fragment = (world, body) => HEADER + TERRAIN(world.terrain) + SHADING + WEATHER_GRID + CLOUDS + FLAT + body;

/** Düz görünümdeki görünür alan, gölgelendiriciye. */
export const boundsUniform = ({ minX, minY, maxX, maxY }) => [minX, minY, maxX - minX, maxY - minY];
