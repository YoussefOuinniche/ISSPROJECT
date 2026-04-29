'use no memo';

import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import { GLView } from 'expo-gl';

const { width: W, height: H } = Dimensions.get('window');

// ─── Public types ────────────────────────────────────────────────────────────

export type Biome = 'hill' | 'mountain' | 'peak';

export interface CheckpointDef {
  id: string;
  title: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';
}

interface TerrainCfg {
  biome: Biome;
  heightScale: number;
  noiseScale: number;
  octaves: number;
  persistence: number;
  lacunarity: number;
  falloff: number;
  ridgeMix: number;
  warpAmp: number;
  warpFreq: number;
  erodeDroplets: number;
  thermalIters: number;
  snowLine: number;
  skyZenith: number;
  skyMid: number;
  skyHorizon: number;
  fogNear: number;
  fogFar: number;
}

export function getTerrainCfg(stepCount: number): TerrainCfg {
  if (stepCount <= 3) return {
    biome: 'hill', heightScale: 14, noiseScale: 0.022, octaves: 5,
    persistence: 0.50, lacunarity: 2.05, falloff: 1.7, ridgeMix: 0.25,
    warpAmp: 14, warpFreq: 0.020, erodeDroplets: 5000, thermalIters: 2,
    snowLine: 0.82,
    skyZenith: 0x0e3caa, skyMid: 0x3a88d4, skyHorizon: 0xb8dcf5,
    fogNear: 70, fogFar: 200,
  };
  if (stepCount <= 6) return {
    biome: 'mountain', heightScale: 36, noiseScale: 0.030, octaves: 6,
    persistence: 0.54, lacunarity: 2.15, falloff: 1.35, ridgeMix: 0.50,
    warpAmp: 22, warpFreq: 0.024, erodeDroplets: 8000, thermalIters: 3,
    snowLine: 0.58,
    skyZenith: 0x081c58, skyMid: 0x2260a8, skyHorizon: 0x6898c4,
    fogNear: 95, fogFar: 240,
  };
  return {
    biome: 'peak', heightScale: 62, noiseScale: 0.038, octaves: 7,
    persistence: 0.58, lacunarity: 2.30, falloff: 1.10, ridgeMix: 0.65,
    warpAmp: 30, warpFreq: 0.028, erodeDroplets: 12000, thermalIters: 4,
    snowLine: 0.46,
    skyZenith: 0x04101e, skyMid: 0x10264a, skyHorizon: 0x305878,
    fogNear: 130, fogFar: 320,
  };
}

// ─── Seeded Perlin (improved) + ridged FBM ───────────────────────────────────

function makePerm(seed: number): Uint8Array {
  let s = (seed | 0) || 1;
  const rng = () => { s = (s * 1664525 + 1013904223) | 0; return ((s >>> 0) & 0xffffffff) / 0xffffffff; };
  const p = new Uint8Array(512);
  const base = new Uint8Array(256);
  for (let i = 0; i < 256; i++) base[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = base[i]; base[i] = base[j]; base[j] = t;
  }
  for (let i = 0; i < 512; i++) p[i] = base[i & 255];
  return p;
}

function fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a: number, b: number, t: number) { return a + t * (b - a); }
function grad2(hash: number, x: number, y: number) {
  switch (hash & 7) {
    case 0: return  x + y;
    case 1: return -x + y;
    case 2: return  x - y;
    case 3: return -x - y;
    case 4: return  x;
    case 5: return -x;
    case 6: return  y;
    default: return -y;
  }
}

function perlin2(p: Uint8Array, x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  x -= Math.floor(x); y -= Math.floor(y);
  const u = fade(x), v = fade(y);
  const A = (p[X] + Y) & 255, B = (p[X + 1] + Y) & 255;
  return lerp(
    lerp(grad2(p[A],     x,     y),     grad2(p[B],     x - 1, y),     u),
    lerp(grad2(p[A + 1], x,     y - 1), grad2(p[B + 1], x - 1, y - 1), u),
    v,
  );
}

function fbmRidged(
  p: Uint8Array, x: number, y: number,
  octaves: number, persistence: number, lacunarity: number, ridgeMix: number,
): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const n = perlin2(p, x * freq, y * freq);
    const ridged = 1 - Math.abs(n) * 2;
    const blended = lerp(n, ridged, ridgeMix);
    sum  += amp * blended;
    norm += amp;
    amp  *= persistence;
    freq *= lacunarity;
  }
  return sum / norm;
}

// ─── World / grid constants ──────────────────────────────────────────────────

const TERRAIN_SIZE = 110;
const HALF = TERRAIN_SIZE / 2;
const HM_RES = 160;
const HM_CELL = TERRAIN_SIZE / (HM_RES - 1);

// World ↔ grid index helpers (consistent across generation, erosion, sampling)
function worldToGrid(wx: number, wz: number): { gx: number; gy: number } {
  return { gx: (wx + HALF) / HM_CELL, gy: (HALF - wz) / HM_CELL };
}

// ─── Heightmap generation (with domain warping + multi-peak base) ────────────

function genHeightmapBase(perm: Uint8Array, cfg: TerrainCfg): Float32Array {
  const hm = new Float32Array(HM_RES * HM_RES);

  // Three offset peaks form an asymmetric ridge cluster (warped further below)
  const peaks: Array<{ x: number; z: number; w: number; falloff: number }> = [
    { x:  0,  z:  0,  w: 1.00, falloff: cfg.falloff },
    { x:  18, z: -10, w: 0.55, falloff: cfg.falloff * 1.20 },
    { x: -14, z: 12,  w: 0.48, falloff: cfg.falloff * 1.30 },
  ];

  for (let yi = 0; yi < HM_RES; yi++) {
    const wz = HALF - yi * HM_CELL;
    for (let xi = 0; xi < HM_RES; xi++) {
      const wx = -HALF + xi * HM_CELL;

      // Domain warp — two perlin offsets push the input around, killing radial symmetry
      const warpX = perlin2(perm, wx * cfg.warpFreq + 13.7, wz * cfg.warpFreq - 27.3) * cfg.warpAmp;
      const warpZ = perlin2(perm, wx * cfg.warpFreq + 81.1, wz * cfg.warpFreq + 53.9) * cfg.warpAmp;
      const fx = wx + warpX, fz = wz + warpZ;

      // Multi-peak field — soft-max combines into a ridged spine
      let peakField = 0;
      for (const p of peaks) {
        const dx = fx - p.x, dz = fz - p.z;
        const r = Math.min(1, Math.sqrt(dx * dx + dz * dz) / HALF);
        const cone = Math.max(0, 1 - r);
        const dome = Math.pow(cone, p.falloff) * p.w;
        // soft union — keeps peaks blending rather than clipping
        peakField = peakField + dome - peakField * dome;
      }

      // Ridged FBM detail, sampled in warped space
      const n = (fbmRidged(perm,
        fx * cfg.noiseScale, fz * cfg.noiseScale,
        cfg.octaves, cfg.persistence, cfg.lacunarity, cfg.ridgeMix) + 1) * 0.5;

      const macro = (peakField * 0.55 + n * peakField * 0.62) * cfg.heightScale;

      // Base soil floor — keeps the foothills flat-ish near the edges
      hm[yi * HM_RES + xi] = macro;
    }
  }
  return hm;
}

// ─── Hydraulic erosion (droplet simulation) ──────────────────────────────────
// Classic algorithm: each particle starts at a random cell, follows the
// gradient downhill, picks up sediment in fast/steep stretches, drops it
// when the slope shallows or it gets overloaded. The emergent dendritic
// patterns are why this looks like a real mountain.

function hydraulicErode(hm: Float32Array, seed: number, droplets: number) {
  let rs = ((seed * 9301 + 49297) | 0) || 1;
  const rng = () => { rs = Math.imul(rs, 1103515245) + 12345 | 0; return ((rs >>> 0) & 0x7fffffff) / 0x7fffffff; };

  const INERTIA       = 0.05;
  const CAP_FACTOR    = 5.0;
  const MIN_CAP       = 0.012;
  const ERODE_RATE    = 0.32;
  const DEPOSIT_RATE  = 0.30;
  const EVAPORATION   = 0.012;
  const GRAVITY       = 4.0;
  const MAX_STEPS     = 64;

  // Erosion brush — softens the per-step impact across a small neighborhood
  // (avoids spiky single-cell pits that look unnatural).
  const BRUSH = [
    [ 0,  0, 0.40],
    [ 1,  0, 0.13], [-1,  0, 0.13], [ 0,  1, 0.13], [ 0, -1, 0.13],
    [ 1,  1, 0.045], [-1, -1, 0.045], [ 1, -1, 0.045], [-1, 1, 0.045],
  ];

  for (let d = 0; d < droplets; d++) {
    let px = 1 + rng() * (HM_RES - 3);
    let py = 1 + rng() * (HM_RES - 3);
    let dx = 0, dy = 0;
    let speed = 1;
    let water = 1;
    let sediment = 0;

    for (let step = 0; step < MAX_STEPS; step++) {
      const xi = Math.floor(px), yi = Math.floor(py);
      const fx = px - xi, fy = py - yi;
      const i00 = yi * HM_RES + xi;
      const i10 = i00 + 1;
      const i01 = i00 + HM_RES;
      const i11 = i01 + 1;

      const h00 = hm[i00], h10 = hm[i10], h01 = hm[i01], h11 = hm[i11];
      const hOld = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy)
                 + h01 * (1 - fx) * fy       + h11 * fx * fy;

      const gX = (h10 - h00) * (1 - fy) + (h11 - h01) * fy;
      const gY = (h01 - h00) * (1 - fx) + (h11 - h10) * fx;

      dx = dx * INERTIA - gX * (1 - INERTIA);
      dy = dy * INERTIA - gY * (1 - INERTIA);
      const dlen = Math.sqrt(dx * dx + dy * dy);
      if (dlen < 1e-4) break;
      dx /= dlen; dy /= dlen;

      px += dx; py += dy;
      if (px < 1 || px >= HM_RES - 2 || py < 1 || py >= HM_RES - 2) break;

      // New height after move
      const nxi = Math.floor(px), nyi = Math.floor(py);
      const nfx = px - nxi, nfy = py - nyi;
      const j00 = nyi * HM_RES + nxi;
      const hNew = hm[j00]              * (1 - nfx) * (1 - nfy)
                 + hm[j00 + 1]          * nfx       * (1 - nfy)
                 + hm[j00 + HM_RES]     * (1 - nfx) * nfy
                 + hm[j00 + HM_RES + 1] * nfx       * nfy;
      const dh = hNew - hOld;

      const capacity = Math.max(-dh * speed * water * CAP_FACTOR, MIN_CAP);

      if (sediment > capacity || dh > 0) {
        // Deposit at OLD position (water lost capacity here)
        const deposit = dh > 0
          ? Math.min(dh, sediment)
          : (sediment - capacity) * DEPOSIT_RATE;
        sediment -= deposit;
        hm[i00] += deposit * (1 - fx) * (1 - fy);
        hm[i10] += deposit * fx       * (1 - fy);
        hm[i01] += deposit * (1 - fx) * fy;
        hm[i11] += deposit * fx       * fy;
      } else {
        // Erode — distribute via brush around old cell
        const erode = Math.min((capacity - sediment) * ERODE_RATE, -dh);
        let actuallyEroded = 0;
        for (let b = 0; b < BRUSH.length; b++) {
          const bx = xi + BRUSH[b][0];
          const by = yi + BRUSH[b][1];
          if (bx < 0 || bx >= HM_RES || by < 0 || by >= HM_RES) continue;
          const idx = by * HM_RES + bx;
          const w = BRUSH[b][2];
          const take = erode * w;
          hm[idx] -= take;
          actuallyEroded += take;
        }
        sediment += actuallyEroded;
      }

      speed = Math.sqrt(Math.max(1e-3, speed * speed + dh * GRAVITY));
      water *= (1 - EVAPORATION);
      if (water < 0.02) break;
    }
  }
}

// ─── Thermal erosion (talus angle relaxation) ────────────────────────────────
// Where slope between adjacent cells exceeds the talus angle, move material
// from the upper cell to the lower one. Settles cliffs into stable scree.

function thermalErode(hm: Float32Array, iters: number) {
  const TALUS = 0.55; // height units per cell — exceed this and we relax
  const RATE  = 0.45;
  const tmp = new Float32Array(hm.length);

  for (let it = 0; it < iters; it++) {
    tmp.set(hm);
    for (let yi = 1; yi < HM_RES - 1; yi++) {
      for (let xi = 1; xi < HM_RES - 1; xi++) {
        const i = yi * HM_RES + xi;
        const h = tmp[i];
        let dMax = 0, idxLow = -1;
        // Check 4-neighbors
        const ns = [i - 1, i + 1, i - HM_RES, i + HM_RES];
        for (let k = 0; k < 4; k++) {
          const nh = tmp[ns[k]];
          const d = h - nh;
          if (d > dMax) { dMax = d; idxLow = ns[k]; }
        }
        if (idxLow >= 0 && dMax > TALUS) {
          const move = (dMax - TALUS) * 0.5 * RATE;
          hm[i]      -= move;
          hm[idxLow] += move;
        }
      }
    }
  }
}

// ─── Heightmap sampling + analytical normals ─────────────────────────────────

function sampleHeightGrid(hm: Float32Array, wx: number, wz: number): number {
  const { gx, gy } = worldToGrid(wx, wz);
  if (gx < 0 || gx > HM_RES - 1 || gy < 0 || gy > HM_RES - 1) return 0;
  const xi = Math.min(HM_RES - 2, Math.floor(gx));
  const yi = Math.min(HM_RES - 2, Math.floor(gy));
  const fx = gx - xi, fy = gy - yi;
  const i00 = yi * HM_RES + xi;
  return hm[i00]              * (1 - fx) * (1 - fy)
       + hm[i00 + 1]          * fx       * (1 - fy)
       + hm[i00 + HM_RES]     * (1 - fx) * fy
       + hm[i00 + HM_RES + 1] * fx       * fy;
}

// Analytical normal from heightmap central differences — sharper than
// Three's per-vertex face averaging on dense meshes.
function sampleNormalGrid(hm: Float32Array, wx: number, wz: number, out: [number, number, number]): void {
  const eps = HM_CELL;
  const hL = sampleHeightGrid(hm, wx - eps, wz);
  const hR = sampleHeightGrid(hm, wx + eps, wz);
  const hD = sampleHeightGrid(hm, wx, wz - eps);
  const hU = sampleHeightGrid(hm, wx, wz + eps);
  // tangent vectors: (2eps, hR-hL, 0) along X, (0, hU-hD, 2eps) along Z
  // normal = T_z × T_x  (right-handed, +Y up)
  const nx = -(hR - hL);
  const nz = -(hU - hD);
  const ny = 2 * eps;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  out[0] = nx / len; out[1] = ny / len; out[2] = nz / len;
}

// ─── Mesh build ──────────────────────────────────────────────────────────────

function buildMountainMesh(THREE: any, hm: Float32Array, perm: Uint8Array, cfg: TerrainCfg) {
  const SEGS = 120;
  const geom = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGS, SEGS);
  const pos = geom.attributes.position;
  const vCount = pos.count;

  // Displace vertices by sampling the eroded heightmap
  for (let i = 0; i < vCount; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    // pre-rotation: world.x = x, world.z = -y
    pos.setZ(i, sampleHeightGrid(hm, x, -y));
  }
  pos.needsUpdate = true;
  geom.rotateX(-Math.PI / 2);

  // Analytical normals from heightmap (much crisper than computeVertexNormals)
  const normals = new Float32Array(vCount * 3);
  const ntmp: [number, number, number] = [0, 1, 0];
  for (let i = 0; i < vCount; i++) {
    sampleNormalGrid(hm, pos.getX(i), pos.getZ(i), ntmp);
    normals[i * 3]     = ntmp[0];
    normals[i * 3 + 1] = ntmp[1];
    normals[i * 3 + 2] = ntmp[2];
  }
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

  // ── Per-vertex colors with AO ──────────────────────────────────────────────
  const colors = new Float32Array(vCount * 3);
  const peakHeight = cfg.heightScale * 1.10;

  const SNOW_LIT  = [0.98, 0.99, 1.00];
  const SNOW_SHA  = [0.55, 0.62, 0.74];
  const ROCK_LIT  = [0.58, 0.50, 0.42];
  const ROCK_DARK = [0.20, 0.18, 0.18];
  const SCREE_LIT = [0.50, 0.39, 0.28];
  const SCREE_SHA = [0.20, 0.15, 0.10];
  const FOREST_LIT= [0.32, 0.48, 0.22];
  const FOREST_SHA= [0.12, 0.20, 0.11];

  const mix3 = (out: number[], a: number[], b: number[], t: number) => {
    out[0] = a[0] + (b[0] - a[0]) * t;
    out[1] = a[1] + (b[1] - a[1]) * t;
    out[2] = a[2] + (b[2] - a[2]) * t;
  };
  const tmp = [0, 0, 0];

  for (let i = 0; i < vCount; i++) {
    const wy = pos.getY(i);
    const wx = pos.getX(i), wz = pos.getZ(i);
    const hN = Math.max(0, Math.min(1, wy / peakHeight));
    const ny = normals[i * 3 + 1];
    const slope = 1 - Math.max(0, Math.min(1, ny));

    const blotch = (perlin2(perm, wx * 0.22, wz * 0.22) + 1) * 0.5;
    const grain  = (perlin2(perm, wx * 0.85, wz * 0.85) + 1) * 0.5;
    const speck  = (perlin2(perm, wx * 1.90, wz * 1.90) + 1) * 0.5;
    const lichen = (perlin2(perm, wx * 0.40 + 99, wz * 0.40 - 41) + 1) * 0.5;

    const snowJit = (perlin2(perm, wx * 0.05, wz * 0.05) + 1) * 0.5 * 0.12;
    const snowLine = cfg.snowLine + snowJit - 0.06;

    if (hN > snowLine && slope < 0.58) {
      const dirt = Math.max(0, snowLine + 0.12 - hN) * 2.0;
      const t = Math.min(1, grain * 0.50 + slope * 0.32 + dirt * 0.22);
      mix3(tmp, SNOW_LIT, SNOW_SHA, t);
      if (speck > 0.78) { tmp[0] -= 0.03; tmp[1] -= 0.02; tmp[2] += 0.02; }
    } else if (hN > 0.40 || slope > 0.55) {
      const t = Math.min(1, slope * 0.78 + grain * 0.30);
      mix3(tmp, ROCK_LIT, ROCK_DARK, t);
      if (lichen > 0.74 && hN < 0.70) {
        const k = (lichen - 0.74) * 3.5;
        tmp[0] *= 1 - k * 0.30;
        tmp[1] *= 1 + k * 0.18;
        tmp[2] *= 1 - k * 0.40;
      }
      if (slope < 0.22 && hN > 0.55) {
        tmp[0] = Math.min(1, tmp[0] * 1.18);
        tmp[1] = Math.min(1, tmp[1] * 1.16);
        tmp[2] = Math.min(1, tmp[2] * 1.12);
      }
    } else if (hN > 0.16) {
      const t = Math.min(1, slope * 0.55 + (1 - hN) * 0.25 + grain * 0.32);
      mix3(tmp, SCREE_LIT, SCREE_SHA, t);
      if (blotch > 0.62) {
        const k = (blotch - 0.62) * 2.6;
        tmp[0] = tmp[0] * (1 - k * 0.35) + FOREST_LIT[0] * k * 0.45;
        tmp[1] = tmp[1] * (1 - k * 0.20) + FOREST_LIT[1] * k * 0.55;
        tmp[2] = tmp[2] * (1 - k * 0.40) + FOREST_LIT[2] * k * 0.45;
      }
    } else {
      const t = Math.min(1, slope * 0.45 + grain * 0.40);
      mix3(tmp, FOREST_LIT, FOREST_SHA, t);
      if (blotch < 0.30) {
        const k = (0.30 - blotch) * 3.0;
        tmp[0] = tmp[0] + (SCREE_LIT[0] - tmp[0]) * k * 0.4;
        tmp[1] = tmp[1] + (SCREE_LIT[1] - tmp[1]) * k * 0.4;
        tmp[2] = tmp[2] + (SCREE_LIT[2] - tmp[2]) * k * 0.4;
      }
    }

    // Per-vertex luminance jitter
    const lj = (speck - 0.5) * 0.05;
    colors[i * 3]     = Math.max(0, Math.min(1, tmp[0] + lj));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, tmp[1] + lj));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, tmp[2] + lj));
  }
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geom.computeBoundingBox();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    flatShading: false,
    dithering: true,
  });
  // fwidth/dFdx are used in the injected shader for AA; required on WebGL1.
  // Harmless on WebGL2 where they're core.
  (mat as any).extensions = { ...(mat as any).extensions, derivatives: true };

  // ── Custom shader injection — per-fragment rock detail, vertical erosion
  //    streaks, and physically-motivated snow accumulation. The standard PBR
  //    pipeline still runs (shadows, fog, hemi+sun lighting); we just rewrite
  //    diffuseColor before lighting kicks in.
  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uPeakHeight = { value: peakHeight };
    shader.uniforms.uSnowLine   = { value: cfg.snowLine };
    shader.uniforms.uHeightScale= { value: cfg.heightScale };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vHeightN;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 _wp = modelMatrix * vec4(transformed, 1.0);
        vWorldPos = _wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
        vHeightN = clamp(_wp.y / ${peakHeight.toFixed(3)}, 0.0, 1.0);`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uSnowLine;
        uniform float uHeightScale;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vHeightN;

        // Cheap value-noise hash
        float _h21(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
        }
        float _vn(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = _h21(i);
          float b = _h21(i + vec2(1.0, 0.0));
          float c = _h21(i + vec2(0.0, 1.0));
          float d = _h21(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }
        float _fbm(vec2 p) {
          float v = 0.0; float a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * _vn(p); p *= 2.03; a *= 0.5; }
          return v;
        }
        // Anisotropic noise — stretched vertically: produces water-runoff streaks
        float _streak(vec3 p) {
          float ang = atan(p.z, p.x) * 3.5;
          float yf  = p.y * 0.50;
          float s1 = _fbm(vec2(ang * 1.4, yf * 0.9));
          float s2 = _fbm(vec2(ang * 3.2, yf * 1.2));
          return s1 * 0.65 + s2 * 0.35;
        }
        // Derivative-based anti-alias: fade frequency contributions to 0 when
        // each screen pixel covers more than ~half a cycle of the noise.
        // Kills the high-freq shimmer the user sees as "pixelation" while panning.
        float _aaFade(vec2 uv, float freq) {
          float fw = fwidth(uv.x + uv.y) * freq;
          return 1.0 - smoothstep(0.6, 1.4, fw);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // Recompute slope from world-space normal interpolated from vertex
        vec3 wN = normalize(vWorldNormal);
        float slope = 1.0 - clamp(wN.y, 0.0, 1.0);

        // Vertical erosion streaks — darken vertical channels in rock.
        // AA-faded by screen-space derivative to prevent shimmer at distance.
        float streakAA  = _aaFade(vWorldPos.xz, 1.4);
        float streak    = _streak(vWorldPos) * 0.5 + 0.5 * streakAA;
        float streakMask = smoothstep(0.30, 0.72, streak) * streakAA;

        // Multi-octave per-fragment rock detail (XZ + Y mix for triplanar feel).
        // Each octave has its own AA fade — high-freq band drops to 0 at distance.
        float aa1 = _aaFade(vWorldPos.xz, 1.4);
        float aa2 = _aaFade(vWorldPos.xz, 4.5);
        float aa3 = _aaFade(vec2(vWorldPos.x, vWorldPos.y), 3.0);
        float rockA = _fbm(vWorldPos.xz * 1.4) * aa1;
        float rockB = _fbm(vWorldPos.xz * 4.5 + 17.0) * aa2;
        float rockC = _fbm(vec2(vWorldPos.x * 3.0, vWorldPos.y * 3.0) + 41.0) * aa3;
        float rockDetail = rockA * 0.55 + rockB * 0.30 + rockC * 0.15
                         + (1.0 - aa1) * 0.275 + (1.0 - aa2) * 0.15 + (1.0 - aa3) * 0.075;

        // Snow accumulation: physically motivated — snow sticks where
        // gravity allows, even on lower-altitude shelves. Sheer faces shed it.
        float snowAlt    = smoothstep(uSnowLine - 0.10, uSnowLine + 0.06, vHeightN);
        float snowSlope  = 1.0 - smoothstep(0.42, 0.62, slope);
        float ledgeAccum = (1.0 - smoothstep(0.06, 0.22, slope))
                         * smoothstep(uSnowLine - 0.30, uSnowLine - 0.05, vHeightN);
        float snowMask = clamp(max(snowAlt * snowSlope, ledgeAccum), 0.0, 1.0);
        // Wind-blown patchiness: bite out random chunks of snow at the line
        float patch = _fbm(vWorldPos.xz * 0.55 + 7.0);
        snowMask *= smoothstep(0.30, 0.55, patch + (vHeightN - uSnowLine) * 1.6);

        // Rock albedo — vertex color is the band base, streak darkens it,
        // micro-detail jitters luminance.
        vec3 rockCol = diffuseColor.rgb;
        rockCol *= mix(0.42, 1.05, 1.0 - streakMask);  // streaks → near-black grooves
        rockCol *= 0.78 + rockDetail * 0.42;
        // Subtle warm/cool variation across the face
        float tempShift = _fbm(vWorldPos.xz * 0.18) - 0.5;
        rockCol.r *= 1.0 + tempShift * 0.10;
        rockCol.b *= 1.0 - tempShift * 0.08;

        // Snow albedo — bright, with granular detail (AA-faded)
        float snowAA = _aaFade(vWorldPos.xz, 6.0);
        float snowGrain = _fbm(vWorldPos.xz * 6.0) * 0.16 * snowAA + 0.84;
        vec3 snowCol = vec3(0.96, 0.97, 1.00) * snowGrain;
        // Snow in shadow → cool tint
        float aoFromColor = clamp(dot(diffuseColor.rgb, vec3(0.30)), 0.05, 1.0);
        snowCol *= mix(vec3(0.62, 0.70, 0.85), vec3(1.0), aoFromColor);

        diffuseColor.rgb = mix(rockCol, snowCol, snowMask);

        // Subtle altitude-driven cool tint (atmospheric perspective on shaded faces)
        float coolBias = vHeightN * 0.05 * (1.0 - snowMask);
        diffuseColor.r -= coolBias;
        diffuseColor.b += coolBias * 0.6;
        `,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        // Snow is smoother (more specular) than rock; vertical streaks even rougher
        float r2 = roughnessFactor;
        r2 = mix(r2, 0.55, snowMask);                  // snow ~0.55
        r2 = mix(r2, r2 + 0.10, streakMask * (1.0 - snowMask)); // streaks rougher
        roughnessFactor = clamp(r2, 0.20, 1.0);`,
      );
  };
  // Ensure shadows include the custom material correctly
  mat.customProgramCacheKey = () => 'mountain-onbc-v1';

  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ─── Sky dome ────────────────────────────────────────────────────────────────

const lerpN = (a: number, b: number, t: number) => a + t * (b - a);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function buildSkyArrays(zenith: number, mid: number, horizon: number) {
  const segs = 16, rings = 10;
  const verts: number[] = [], cols: number[] = [], idx: number[] = [];
  const zR = [(zenith >> 16 & 255) / 255, (zenith >> 8 & 255) / 255, (zenith & 255) / 255];
  const mR = [(mid    >> 16 & 255) / 255, (mid    >> 8 & 255) / 255, (mid    & 255) / 255];
  const hR = [(horizon>> 16 & 255) / 255, (horizon>> 8 & 255) / 255, (horizon& 255) / 255];
  const HBAND = 0.20;

  for (let ring = 0; ring <= rings; ring++) {
    const phi = (ring / rings) * Math.PI;
    const y = Math.cos(phi), r = Math.sin(phi);
    const t = clamp01(1 - ring / rings);
    let cr: number, cg: number, cb: number;
    if (t < HBAND) {
      const s = (t / HBAND) ** 1.5;
      cr = lerpN(hR[0], mR[0], s); cg = lerpN(hR[1], mR[1], s); cb = lerpN(hR[2], mR[2], s);
    } else {
      const s = (t - HBAND) / (1 - HBAND);
      cr = lerpN(mR[0], zR[0], s); cg = lerpN(mR[1], zR[1], s); cb = lerpN(mR[2], zR[2], s);
    }
    for (let seg = 0; seg <= segs; seg++) {
      const theta = (seg / segs) * Math.PI * 2;
      verts.push(r * Math.cos(theta) * 800, y * 800, r * Math.sin(theta) * 800);
      cols.push(cr, cg, cb);
    }
  }
  const n = segs + 1;
  for (let ring = 0; ring < rings; ring++) {
    for (let seg = 0; seg < segs; seg++) {
      const a = ring * n + seg, b2 = (ring + 1) * n + seg;
      idx.push(a, a + 1, b2, b2, a + 1, b2 + 1);
    }
  }
  return { pos: new Float32Array(verts), col: new Float32Array(cols), idx };
}

// ─── Orbit camera ────────────────────────────────────────────────────────────

interface V3 { x: number; y: number; z: number; }

interface OrbitState {
  theta: number;
  phi: number;
  radius: number;
  tx: number; ty: number; tz: number;
}

function lerpOrbit(cur: OrbitState, tgt: OrbitState, f: number): void {
  cur.theta  += (tgt.theta  - cur.theta)  * f;
  cur.phi    += (tgt.phi    - cur.phi)    * f;
  cur.radius += (tgt.radius - cur.radius) * f;
  cur.tx     += (tgt.tx     - cur.tx)     * f;
  cur.ty     += (tgt.ty     - cur.ty)     * f;
  cur.tz     += (tgt.tz     - cur.tz)     * f;
}

function applyOrbit(camera: any, o: OrbitState): void {
  const sinPhi = Math.sin(o.phi);
  camera.position.set(
    o.tx + o.radius * sinPhi * Math.sin(o.theta),
    o.ty + o.radius * Math.cos(o.phi),
    o.tz + o.radius * sinPhi * Math.cos(o.theta),
  );
  camera.lookAt(o.tx, o.ty, o.tz);
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  steps: CheckpointDef[];
  completedSteps: number;
  seed?: number;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProceduralMountain3D({ steps, completedSteps, seed = 1337 }: Props) {
  const cfgRef         = useRef(getTerrainCfg(steps.length));
  const rendererRef    = useRef<any>(null);
  const cameraRef      = useRef<any>(null);
  const THREERef       = useRef<any>(null);
  const cpMeshes       = useRef<any[]>([]);
  const cpPositions    = useRef<V3[]>([]);
  const rafRef         = useRef<number>(0);
  const zoomTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completedRef   = useRef(completedSteps);
  const glSize         = useRef({ w: W, h: H });
  const modelRadiusRef = useRef(HALF);
  const tRef           = useRef(0);

  const orbitTgt = useRef<OrbitState>({ theta: 0.40, phi: 0.85, radius: 140, tx: 0, ty: 14, tz: 0 });
  const orbitCur = useRef<OrbitState>({ theta: 0.40, phi: 0.85, radius: 140, tx: 0, ty: 14, tz: 0 });
  // Drag inertia: theta/phi velocities; decay each frame, applied to target
  const orbitVel = useRef({ theta: 0, phi: 0 });
  const lastFrameRef = useRef<number>(0);

  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const pinchRef = useRef<number | null>(null);
  const tapRef   = useRef<{ x: number; y: number; t: number } | null>(null);

  useEffect(() => { completedRef.current = completedSteps; }, [completedSteps]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,

      onPanResponderGrant: (evt) => {
        const ts = evt.nativeEvent.touches;
        // Touch began — kill any inertia so the camera responds immediately
        orbitVel.current.theta = 0;
        orbitVel.current.phi = 0;
        if (ts.length === 1) {
          touchRef.current = { x: ts[0].pageX, y: ts[0].pageY, t: Date.now() };
          tapRef.current   = { x: ts[0].pageX, y: ts[0].pageY, t: Date.now() };
          pinchRef.current = null;
        } else if (ts.length >= 2) {
          const dx = ts[0].pageX - ts[1].pageX;
          const dy = ts[0].pageY - ts[1].pageY;
          pinchRef.current = Math.sqrt(dx * dx + dy * dy);
          touchRef.current = null; tapRef.current = null;
        }
      },

      onPanResponderMove: (evt) => {
        const ts = evt.nativeEvent.touches;
        if (ts.length === 1 && touchRef.current) {
          const now = Date.now();
          const dx = ts[0].pageX - touchRef.current.x;
          const dy = ts[0].pageY - touchRef.current.y;
          const dt = Math.max(1, now - touchRef.current.t) / 1000;
          // Update target & track angular velocity for inertia on release
          const dTheta = -dx * 0.008;
          const dPhi   =  dy * 0.006;
          orbitTgt.current.theta += dTheta;
          orbitTgt.current.phi = Math.max(0.10, Math.min(Math.PI * 0.47,
            orbitTgt.current.phi + dPhi));
          // EMA velocity (rad/s) so quick flicks fling and slow drags don't
          orbitVel.current.theta = orbitVel.current.theta * 0.45 + (dTheta / dt) * 0.55;
          orbitVel.current.phi   = orbitVel.current.phi   * 0.45 + (dPhi / dt)   * 0.55;
          touchRef.current = { x: ts[0].pageX, y: ts[0].pageY, t: now };
          if (tapRef.current) {
            const ddx = ts[0].pageX - tapRef.current.x;
            const ddy = ts[0].pageY - tapRef.current.y;
            if (Math.sqrt(ddx * ddx + ddy * ddy) > 8) tapRef.current = null;
          }
        } else if (ts.length >= 2 && pinchRef.current !== null) {
          const dx = ts[0].pageX - ts[1].pageX;
          const dy = ts[0].pageY - ts[1].pageY;
          const d = Math.sqrt(dx * dx + dy * dy);
          const scale = pinchRef.current / d;
          const minR = 10, maxR = modelRadiusRef.current * 4;
          orbitTgt.current.radius = Math.max(minR, Math.min(maxR, orbitTgt.current.radius * scale));
          pinchRef.current = d;
        }
      },

      onPanResponderRelease: () => {
        if (tapRef.current && Date.now() - tapRef.current.t < 280) {
          const { x: tapX, y: tapY } = tapRef.current;
          const camera = cameraRef.current;
          const THREE  = THREERef.current;
          const { w, h } = glSize.current;
          if (camera && THREE) {
            let best = -1, bestD = 60;
            cpPositions.current.forEach((cp, i) => {
              const v = new THREE.Vector3(cp.x, cp.y, cp.z);
              v.project(camera);
              const sx = (v.x * 0.5 + 0.5) * w;
              const sy = (1 - (v.y * 0.5 + 0.5)) * h;
              const d = Math.sqrt((sx - tapX) ** 2 + (sy - tapY) ** 2);
              if (d < bestD) { bestD = d; best = i; }
            });
            if (best >= 0) {
              const cp = cpPositions.current[best];
              orbitTgt.current = {
                theta: orbitTgt.current.theta, phi: 1.10,
                radius: modelRadiusRef.current * 0.40 + 12,
                tx: cp.x, ty: cp.y, tz: cp.z,
              };
            }
          }
        }
        touchRef.current = null; pinchRef.current = null; tapRef.current = null;
      },
    })
  ).current;

  // ── WebGL init ─────────────────────────────────────────────────────────────
  const onContextCreate = useCallback(async (gl: any) => {
    try {
    const THREE = await import('three');
    THREERef.current = THREE;

    const cfg = cfgRef.current;
    const perm = makePerm(seed);

    // ── Generate, erode, finalize the heightmap ──
    console.log('[Mountain3D] generating heightmap...');
    const t0 = Date.now();
    const hm = genHeightmapBase(perm, cfg);
    console.log('[Mountain3D] base heightmap', Date.now() - t0, 'ms');

    const t1 = Date.now();
    hydraulicErode(hm, seed, cfg.erodeDroplets);
    console.log('[Mountain3D] hydraulic erosion', Date.now() - t1, 'ms');

    const t2 = Date.now();
    thermalErode(hm, cfg.thermalIters);
    console.log('[Mountain3D] thermal erosion', Date.now() - t2, 'ms');

    const glW = gl.drawingBufferWidth;
    const glH = gl.drawingBufferHeight;
    glSize.current = { w: glW, h: glH };

    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width: glW, height: glH, style: {} as any,
        addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
        clientWidth: glW, clientHeight: glH,
      } as unknown as HTMLCanvasElement,
      context: gl as unknown as WebGLRenderingContext,
      antialias: true, alpha: false, powerPreference: 'high-performance',
    });
    renderer.setSize(glW, glH, false);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cfg.skyHorizon);
    scene.fog = new THREE.Fog(cfg.skyHorizon, cfg.fogNear, cfg.fogFar);

    const camera = new THREE.PerspectiveCamera(50, glW / glH, 0.1, 2000);
    cameraRef.current = camera;
    applyOrbit(camera, orbitCur.current);

    // Sky dome
    const { pos: skyPos, col: skyCol, idx: skyIdx } = buildSkyArrays(cfg.skyZenith, cfg.skyMid, cfg.skyHorizon);
    const skyGeo = new THREE.BufferGeometry();
    skyGeo.setAttribute('position', new THREE.Float32BufferAttribute(skyPos, 3));
    skyGeo.setAttribute('color',    new THREE.Float32BufferAttribute(skyCol, 3));
    skyGeo.setIndex(skyIdx);
    const skyMesh = new THREE.Mesh(skyGeo,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, depthWrite: false }));
    skyMesh.renderOrder = -1;
    scene.add(skyMesh);

    // Lighting — sun casts shadows; harsh contrast between lit and shadow
    scene.add(new THREE.HemisphereLight(0xb8d0e4, 0x12181e, 0.42));
    const sun = new THREE.DirectionalLight(0xfff0d0, 3.20);
    sun.position.set(180, 260, 120);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1536;
    sun.shadow.mapSize.height = 1536;
    sun.shadow.camera.near = 50;
    sun.shadow.camera.far  = 700;
    sun.shadow.camera.left   = -75;
    sun.shadow.camera.right  =  75;
    sun.shadow.camera.top    =  75;
    sun.shadow.camera.bottom = -75;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.5;
    scene.add(sun);
    sun.target.position.set(0, 0, 0);
    scene.add(sun.target);

    const fill = new THREE.DirectionalLight(0x5878a4, 0.22);
    fill.position.set(-220, 240, -120);
    scene.add(fill);
    const bounce = new THREE.DirectionalLight(0xffc890, 0.12);
    bounce.position.set(-80, 60, 220);
    scene.add(bounce);
    scene.add(new THREE.AmbientLight(0xc8d0d8, 0.06));

    // Mountain
    console.log('[Mountain3D] building mesh...');
    const t3 = Date.now();
    const mountain = buildMountainMesh(THREE, hm, perm, cfg);
    console.log('[Mountain3D] mesh built', Date.now() - t3, 'ms');
    scene.add(mountain);

    const mBox = new THREE.Box3().setFromObject(mountain);
    const mSize = new THREE.Vector3(); mBox.getSize(mSize);
    const modelRadius = Math.max(mSize.x, mSize.z) * 0.5;
    modelRadiusRef.current = modelRadius;

    const overviewRadius = modelRadius * 2.0 + 18;
    const lookY = mBox.min.y + mSize.y * 0.45;
    orbitTgt.current = { theta: 0.40, phi: 0.78, radius: overviewRadius, tx: 0, ty: lookY, tz: 0 };
    orbitCur.current = { ...orbitTgt.current };
    applyOrbit(camera, orbitCur.current);

    // Checkpoints — sample post-erosion heightmap so they sit on real terrain
    const cps: V3[] = Array.from({ length: steps.length }, (_, i) => {
      const t = steps.length > 1 ? i / (steps.length - 1) : 0.5;
      const spiral = Math.sin(t * Math.PI * 1.8) * (i % 2 === 0 ? 1 : -1);
      const radial = (1 - t) * 0.42;
      const x = spiral * mSize.x * radial * 0.55;
      const z = (0.42 - t * 0.84) * mSize.z;
      const y = sampleHeightGrid(hm, x, z) + cfg.heightScale * 0.022;
      return { x, y, z };
    });
    cpPositions.current = cps;

    if (cps.length >= 2) {
      // ── Surface-following trail ──
      // 1. Smooth Catmull-Rom curve through checkpoints (gives natural sweep)
      // 2. Sample densely along it, snap each sample's Y to the heightmap +
      //    a constant lift, so no point can ever pierce the mountain
      // 3. Build a new curve from the snapped points
      // 4. Render as a thin TubeGeometry (much more visible than a Line, and
      //    receives lighting/shadow so it reads as a real path)
      const TRAIL_LIFT = 0.55;
      const ctrl = cps.map(p => new THREE.Vector3(p.x, p.y + TRAIL_LIFT, p.z));
      const rawCurve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal', 0.5);
      const dense = rawCurve.getPoints(Math.max(48, cps.length * 14));
      const grounded = dense.map((p: any) => new THREE.Vector3(
        p.x,
        sampleHeightGrid(hm, p.x, p.z) + TRAIL_LIFT,
        p.z,
      ));
      const trailCurve = new THREE.CatmullRomCurve3(grounded, false, 'centripetal', 0.5);
      const tubeGeo = new THREE.TubeGeometry(
        trailCurve,
        Math.max(120, cps.length * 24), // tubular segments
        0.18,                            // radius
        6,                               // radial segments
        false,
      );
      const tubeMat = new THREE.MeshStandardMaterial({
        color:             0xfff4c2,
        emissive:          0xffaa30,
        emissiveIntensity: 0.45,
        roughness: 0.35, metalness: 0.55,
      });
      const trailMesh = new THREE.Mesh(tubeGeo, tubeMat);
      trailMesh.castShadow = false;
      trailMesh.receiveShadow = false;
      scene.add(trailMesh);
    }

    cpMeshes.current = [];
    cps.forEach((pos, i) => {
      const done    = i < completedRef.current;
      const current = i === completedRef.current;
      const r = current ? 1.30 : done ? 0.95 : 0.78;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 12),
        new THREE.MeshStandardMaterial({
          color:             done ? 0x22d36a : current ? 0xf5c518 : 0x7a90a8,
          emissive:          current ? 0xf09000 : done ? 0x009940 : 0x000000,
          emissiveIntensity: current ? 0.95 : done ? 0.22 : 0,
          roughness: 0.18, metalness: 0.40,
        }),
      );
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.castShadow = true;
      scene.add(mesh);
      cpMeshes.current.push(mesh);
    });

    // Render loop with dt-aware smoothing.
    // - lerpFactor = 1 - exp(-dt * stiffness) is frame-rate-independent: at
    //   60fps it's ~0.13/frame, at 30fps it's ~0.24/frame, so the visual
    //   approach time stays the same regardless of frame drops.
    // - orbitVel inertia decays exponentially after the user releases, giving
    //   a fling feel rather than a hard stop.
    lastFrameRef.current = Date.now();
    const STIFFNESS    = 9.0;  // higher = snappier camera follow
    const VEL_DECAY    = 2.4;  // higher = inertia stops sooner
    const VEL_THRESH   = 0.04;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const now = Date.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameRef.current) / 1000));
      lastFrameRef.current = now;
      tRef.current += dt;

      // Pulse current checkpoint
      const idx = Math.max(0, Math.min(completedRef.current, cpMeshes.current.length - 1));
      const cur = cpMeshes.current[idx];
      if (cur) cur.scale.setScalar(1.55 + Math.sin(tRef.current * 3.2) * 0.10);

      // Apply inertia to target (only when no finger is down)
      if (!touchRef.current && !pinchRef.current) {
        const v = orbitVel.current;
        if (Math.abs(v.theta) > VEL_THRESH || Math.abs(v.phi) > VEL_THRESH) {
          orbitTgt.current.theta += v.theta * dt;
          orbitTgt.current.phi = Math.max(0.10, Math.min(Math.PI * 0.47,
            orbitTgt.current.phi + v.phi * dt));
          const decay = Math.exp(-VEL_DECAY * dt);
          v.theta *= decay;
          v.phi   *= decay;
        } else {
          v.theta = 0; v.phi = 0;
        }
      }

      // Frame-rate-independent exponential smoothing
      const f = 1 - Math.exp(-STIFFNESS * dt);
      lerpOrbit(orbitCur.current, orbitTgt.current, f);
      applyOrbit(camera, orbitCur.current);
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    loop();

    zoomTimerRef.current = setTimeout(() => {
      const i2 = Math.max(0, Math.min(completedRef.current, cps.length - 1));
      const cp = cps[i2];
      if (cp) {
        orbitTgt.current = {
          theta: orbitTgt.current.theta, phi: 1.10,
          radius: modelRadius * 0.40 + 12,
          tx: cp.x, ty: cp.y, tz: cp.z,
        };
      }
    }, 2400);
    } catch (err) {
      console.error('[Mountain3D] fatal error in onContextCreate:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    cpMeshes.current.forEach((mesh, i) => {
      const done    = i < completedSteps;
      const current = i === completedSteps;
      const mat     = mesh.material;
      mat.color.setHex(done ? 0x22d36a : current ? 0xf5c518 : 0x7a90a8);
      mat.emissive.setHex(current ? 0xf09000 : done ? 0x009940 : 0x000000);
      mat.emissiveIntensity = current ? 0.95 : done ? 0.22 : 0;
      mat.needsUpdate = true;
      if (!current) mesh.scale.setScalar(done ? 1.18 : 1.0);
    });
    const cps = cpPositions.current;
    const i = Math.max(0, Math.min(completedSteps, cps.length - 1));
    if (cps[i]) {
      orbitTgt.current = {
        theta: orbitTgt.current.theta, phi: 1.10,
        radius: modelRadiusRef.current * 0.40 + 12,
        tx: cps[i].x, ty: cps[i].y, tz: cps[i].z,
      };
    }
  }, [completedSteps]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (zoomTimerRef.current !== null) clearTimeout(zoomTimerRef.current);
    rendererRef.current?.dispose?.();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
      <GLView
        style={StyleSheet.absoluteFill}
        msaaSamples={8}
        enableExperimentalWorkletSupport={false}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}
