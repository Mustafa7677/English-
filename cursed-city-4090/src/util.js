// Shared helpers: PS1-style materials, geometry cache, canvas textures, math.
import * as THREE from 'three';

// Global uniform used by every patched material for PS1 vertex snapping.
// value = vertical grid resolution in clip space (0 disables snapping).
export const psx = { snap: { value: 140 } };

function patchPSX(m) {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = psx.snap;
    shader.vertexShader =
      'uniform float uSnap;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        if (uSnap > 0.0) {
          vec2 grid = vec2(uSnap * 1.6, uSnap);
          gl_Position.xy = floor(gl_Position.xy / gl_Position.w * grid + 0.5) / grid * gl_Position.w;
        }`
      );
  };
  m.customProgramCacheKey = () => 'psx-snap';
  return m;
}

const matCache = new Map();
/**
 * Lambert material with PS1 vertex snapping.
 * opts: { emissive, emissiveIntensity, map, transparent, opacity, fog, unique, side }
 */
export function mat(color, opts = {}) {
  const { unique, ...rest } = opts;
  const key = color + '|' + JSON.stringify(rest, (k, v) => (v && v.isTexture ? v.uuid : v));
  if (!unique && matCache.has(key)) return matCache.get(key);
  const m = patchPSX(new THREE.MeshLambertMaterial({ color, ...rest }));
  if (!unique) matCache.set(key, m);
  return m;
}

/** Unlit (basic) material, still snapped. */
export function basic(color, opts = {}) {
  return patchPSX(new THREE.MeshBasicMaterial({ color, ...opts }));
}

const geoCache = new Map();
export function boxGeo(w, h, d) {
  const k = `${w.toFixed(3)}_${h.toFixed(3)}_${d.toFixed(3)}`;
  let g = geoCache.get(k);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); geoCache.set(k, g); }
  return g;
}

/** Create a box mesh. (x,y,z) is the box center. */
export function box(w, h, d, material, x = 0, y = 0, z = 0, shadows = true) {
  const m = new THREE.Mesh(boxGeo(w, h, d), material);
  m.position.set(x, y, z);
  if (shadows) { m.castShadow = true; m.receiveShadow = true; }
  return m;
}

export function cyl(rt, rb, h, seg, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/** Box geometry with UVs scaled to world size so a tiling facade texture keeps a constant cell size. */
export function facadeBox(w, h, d, cellW = 4, cellH = 3.2) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  // face order: +x, -x, +y, -y, +z, -z ; 4 verts each
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      uv.setXY(idx, uv.getX(idx) * dims[f][0] / cellW, uv.getY(idx) * dims[f][1] / cellH);
    }
  }
  return g;
}

/** Draw text (or custom painter) to a canvas texture with nearest filtering. */
export function canvasTex(w, h, paint) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  paint(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function textTex(text, { w = 256, h = 64, bg = '#000', fg = '#76ff03', font = 'bold 40px monospace', glow = true } = {}) {
  return canvasTex(w, h, (ctx) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (glow) { ctx.shadowColor = fg; ctx.shadowBlur = 12; }
    ctx.fillStyle = fg; ctx.fillText(text, w / 2, h / 2 + 2);
  });
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export function angleWrap(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
export function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
