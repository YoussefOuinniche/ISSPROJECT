'use no memo';

import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, PanResponder, StyleSheet, View } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';

const { width: W, height: H } = Dimensions.get('window');

// ─── Public types ────────────────────────────────────────────────────────────

export type Biome = 'hill' | 'mountain' | 'peak';

export interface CheckpointDef {
  id: string;
  title: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'skipped';
  /**
   * Optional difficulty in [0, 1]. The step with the highest difficulty
   * becomes the mountain's summit; the rest scale to sub-peaks. If omitted,
   * a smooth ramp by step order is used as fallback.
   */
  difficulty?: number;
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
  billowMix: number;
  warpAmp: number;
  warpFreq: number;
  warpFeedback: number;
  edgeFalloff: number;
  peakCount: number;
  ridgeAxis: number;
  erodeDroplets: number;
  thermalIters: number;
  snowLine: number;
  strataAmp: number;
  skyZenith: number;
  skyMid: number;
  skyHorizon: number;
  fogNear: number;
  fogFar: number;
}

// Five-tier biome system driven by the roadmap's step count.
// Each tier escalates: more peaks, sharper ridges, lower snow line, richer sky.
//   1–2  steps → rolling hill            (single rounded summit, lush green)
//   3–4         → foothill ridge          (twin peaks, mixed forest/rock)
//   5–6         → alpine mountain         (three peaks, summit snowcap)
//   7–9         → high alpine massif      (four peaks, deep snow, dramatic shadows)
//   10+         → nival summit            (five-peak ridge, glacial blue, towering)
export function getTerrainCfg(stepCount: number): TerrainCfg {
  if (stepCount <= 2) return {
    biome: 'hill', heightScale: 12, noiseScale: 0.020, octaves: 5,
    persistence: 0.48, lacunarity: 2.00, falloff: 1.85, ridgeMix: 0.18,
    billowMix: 0.45, warpAmp: 11, warpFreq: 0.018, warpFeedback: 0.55,
    edgeFalloff: 1.45, peakCount: 1, ridgeAxis: 0.35, strataAmp: 0.0,
    erodeDroplets: 4500, thermalIters: 2, snowLine: 0.88,
    skyZenith: 0x123aa6, skyMid: 0x4a96dc, skyHorizon: 0xc6e2f4,
    fogNear: 65, fogFar: 195,
  };
  if (stepCount <= 4) return {
    biome: 'hill', heightScale: 22, noiseScale: 0.024, octaves: 5,
    persistence: 0.51, lacunarity: 2.08, falloff: 1.55, ridgeMix: 0.32,
    billowMix: 0.32, warpAmp: 16, warpFreq: 0.021, warpFeedback: 0.60,
    edgeFalloff: 1.55, peakCount: 2, ridgeAxis: 0.55, strataAmp: 0.04,
    erodeDroplets: 6000, thermalIters: 2, snowLine: 0.74,
    skyZenith: 0x0a2f8a, skyMid: 0x3a82c8, skyHorizon: 0xa8cae8,
    fogNear: 75, fogFar: 215,
  };
  if (stepCount <= 6) return {
    biome: 'mountain', heightScale: 38, noiseScale: 0.030, octaves: 6,
    persistence: 0.54, lacunarity: 2.15, falloff: 1.30, ridgeMix: 0.52,
    billowMix: 0.18, warpAmp: 22, warpFreq: 0.024, warpFeedback: 0.65,
    edgeFalloff: 1.65, peakCount: 3, ridgeAxis: 0.70, strataAmp: 0.10,
    erodeDroplets: 8000, thermalIters: 3, snowLine: 0.56,
    skyZenith: 0x081c58, skyMid: 0x2260a8, skyHorizon: 0x6898c4,
    fogNear: 95, fogFar: 240,
  };
  if (stepCount <= 9) return {
    biome: 'mountain', heightScale: 52, noiseScale: 0.034, octaves: 6,
    persistence: 0.56, lacunarity: 2.22, falloff: 1.15, ridgeMix: 0.60,
    billowMix: 0.10, warpAmp: 27, warpFreq: 0.026, warpFeedback: 0.72,
    edgeFalloff: 1.70, peakCount: 4, ridgeAxis: 0.85, strataAmp: 0.16,
    erodeDroplets: 10000, thermalIters: 3, snowLine: 0.50,
    skyZenith: 0x06163e, skyMid: 0x16407c, skyHorizon: 0x4d7ba0,
    fogNear: 110, fogFar: 280,
  };
  return {
    biome: 'peak', heightScale: 68, noiseScale: 0.038, octaves: 7,
    persistence: 0.58, lacunarity: 2.30, falloff: 1.05, ridgeMix: 0.68,
    billowMix: 0.06, warpAmp: 32, warpFreq: 0.028, warpFeedback: 0.78,
    edgeFalloff: 1.80, peakCount: 5, ridgeAxis: 1.00, strataAmp: 0.22,
    erodeDroplets: 12000, thermalIters: 4, snowLine: 0.42,
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

// Hybrid FBM that blends three noise modes per octave:
//   • plain perlin  — rolling, hills-and-valleys character
//   • ridged        — |n| inverted → sharp ridges (peaks emerge along zero-crossings)
//   • billow        — |n| upright → soft puffy domes (foothill character)
// Ridged contribution ramps UP with octave (high-freq detail = sharp);
// billow contribution ramps DOWN with octave (low-freq base = rolling).
// This gives mountains with smooth flanks and crisp summit ridges in one pass.
function fbmHybrid(
  p: Uint8Array, x: number, y: number,
  octaves: number, persistence: number, lacunarity: number,
  ridgeMix: number, billowMix: number,
): number {
  let amp = 1, freq = 1, sum = 0, norm = 0;
  const oN = Math.max(1, octaves - 1);
  for (let o = 0; o < octaves; o++) {
    const n = perlin2(p, x * freq, y * freq);
    const t = o / oN;
    const ridged = 1 - Math.abs(n) * 2;
    const billow = Math.abs(n) * 2 - 1;
    const wRidge  = ridgeMix  * (0.35 + t * 0.65);
    const wBillow = billowMix * (1.0 - t * 0.75);
    let blended = n;
    blended = lerp(blended, ridged, wRidge);
    blended = lerp(blended, billow, wBillow);
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
// 256 (up from 160) — at Ultra-LOD the mesh has ~256 segs per side, so this
// keeps roughly 1:1 between heightmap cells and mesh quads, which removes the
// faceted silhouette at close range. One-time CPU cost at gen.
const HM_RES = 256;
const HM_CELL = TERRAIN_SIZE / (HM_RES - 1);

// World ↔ grid index helpers (consistent across generation, erosion, sampling)
function worldToGrid(wx: number, wz: number): { gx: number; gy: number } {
  return { gx: (wx + HALF) / HM_CELL, gy: (HALF - wz) / HM_CELL };
}

// ─── Peak slot planning ──────────────────────────────────────────────────────
// Layout: ONE central summit + a single ridge line passing through it.
// Pre-summit steps line up on one side of the ridge, post-summit steps on
// the other, with small perpendicular jitter so the line doesn't look ruled.
// This makes the peaks read as "stairs climbing the same mountain" rather
// than a field of independent mounds.
//
// The step with the highest `difficulty` becomes the summit (full
// heightScale); remaining steps scale to [0.50, 0.85] × heightScale by
// relative difficulty.

interface PeakSlot {
  x: number;        // world X
  z: number;        // world Z
  height: number;   // raw target height (heightmap units)
  isSummit: boolean;
  stepIdx: number;  // index of the originating step in the input array
}

function planPeakSlots(steps: CheckpointDef[], seed: number, cfg: TerrainCfg): PeakSlot[] {
  const N = Math.max(1, steps.length);

  const diffs: number[] = steps.length > 0
    ? steps.map((s, i) => (typeof s.difficulty === 'number' ? s.difficulty : (i + 0.5) / steps.length))
    : [1.0];

  let summitIdx = 0;
  let maxDiff = -Infinity;
  for (let i = 0; i < diffs.length; i++) {
    if (diffs[i] > maxDiff) { maxDiff = diffs[i]; summitIdx = i; }
  }

  let rs = ((seed * 2654435761) | 0) || 1;
  const rng = () => { rs = (rs * 1664525 + 1013904223) | 0; return ((rs >>> 0) & 0xffffffff) / 0xffffffff; };

  // Summit at the center of the terrain (small jitter for variety, deterministic)
  const summitX = (rng() - 0.5) * HALF * 0.08;
  const summitZ = (rng() - 0.5) * HALF * 0.08;

  // Ridge climb direction (deterministic per seed). All sub-peaks line up
  // along this axis with pre-/post-summit steps on opposite sides.
  const climbAng = rng() * Math.PI * 2;
  const climbX = Math.cos(climbAng);
  const climbZ = Math.sin(climbAng);
  const sideX = -climbZ;                        // perpendicular for jitter
  const sideZ = climbX;

  const maxStepDist = Math.max(1, summitIdx, (N - 1) - summitIdx);
  const ridgeHalfLen = HALF * 0.50;             // each side of ridge max length

  const slots: PeakSlot[] = [];

  for (let i = 0; i < N; i++) {
    if (i === summitIdx) {
      slots.push({
        x: summitX,
        z: summitZ,
        height: cfg.heightScale * 1.00,
        isSummit: true,
        stepIdx: i,
      });
      continue;
    }

    const dirSign = i < summitIdx ? -1 : 1;
    const stepDist = Math.abs(i - summitIdx);
    const tDist = stepDist / maxStepDist;       // 0 = next-to-summit, 1 = farthest
    // Distance from summit along the ridge: 0.20..1.00 of ridgeHalfLen.
    // The 0.20 floor keeps the closest sub-peak visibly off the summit.
    const dist = ridgeHalfLen * (0.20 + tDist * 0.80);

    // Perpendicular jitter — alternates by step index plus a small seeded
    // perturbation so the ridge reads as a natural arête, not a ruler line.
    const sideOffset = HALF * 0.06 * (i % 2 === 0 ? 1 : -1) + (rng() - 0.5) * HALF * 0.04;

    const x = summitX + climbX * dirSign * dist + sideX * sideOffset;
    const z = summitZ + climbZ * dirSign * dist + sideZ * sideOffset;

    // Sub-peak height: floor at 0.50 so each bump clearly pokes above the
    // base mountain; cap at 0.85 so the summit always dominates.
    const norm = maxDiff > 0 ? diffs[i] / maxDiff : 1;
    const heightFactor = Math.min(0.85, 0.50 + norm * 0.35);

    slots.push({
      x, z,
      height: cfg.heightScale * heightFactor,
      isSummit: false,
      stepIdx: i,
    });
  }

  slots.sort((a, b) => a.stepIdx - b.stepIdx);
  return slots;
}

// ─── Heightmap generation (real-mountain construction) ──────────────────────
// Three layers stacked, designed to look like an actual mountain instead of
// "bumps on a dome":
//
//   1. TWO-LAYER BASE: a wide gentle apron + a tall narrower main mass. Real
//      mountains have a wide foothill region narrowing to a steeper body
//      narrowing to a peak. A single cosine dome reads as a smooth hill — too
//      soft. Stacking two profiles gives a proper "wide foot, tall body"
//      silhouette without the body looking pinched.
//
//   2. RIDGE SPINE along the climb axis. Sub-peak slots all lie close to the
//      line from step 0 to step N-1 (planPeakSlots layout). Adding a small
//      height boost along this line gives the mountain a continuous spine,
//      so sub-peaks read as bumps on the same ridge rather than isolated
//      mounds. This is what turns "marbles on a hill" into "stairs up an arête".
//
//   3. PER-STEP BUMPS (max-blended cosine bells). Because base + ridge already
//      provide most of the height at sub-peak positions, bumps just nudge the
//      local maximum up to slot.height. They're WIDER and GENTLER than before,
//      so peaks have a visible body and shoulders instead of looking like ice
//      picks. Max-blend creates natural "saddles" between adjacent bumps.
//
// FBM detail still modulates by total height so it doesn't decorate flatlands.

function genHeightmapPeakAnchored(
  perm: Uint8Array,
  cfg: TerrainCfg,
  slots: PeakSlot[],
): Float32Array {
  const hm = new Float32Array(HM_RES * HM_RES);

  const summit = slots.find(s => s.isSummit) ?? slots[0];
  if (!summit) return hm;
  const summitH = summit.height;

  // ── Two-layer base ──
  // Apron: very wide, low amplitude — covers most of the map gently, gives
  //        the foothill skirt that makes the mountain look planted.
  // Mass:  narrower, taller — provides the dominant mountain body. Together
  //        their sum at the summit reaches ~85% of summitH; the rest comes
  //        from the ridge spine and a small summit bump.
  const apronReach = HALF * 0.95;
  const apronAmp   = summitH * 0.28;
  const massReach  = HALF * 0.58;
  const massAmp    = summitH * 0.55;

  // ── Ridge spine: line from step-0 slot to step-(N-1) slot ──
  // Slots are sorted by stepIdx by planPeakSlots, so this is the natural
  // climb direction. The line passes through the summit (which sits between
  // them in step order). For N==1 the line is degenerate → ridge boost is 0.
  const ridgeA = slots[0];
  const ridgeB = slots[slots.length - 1];
  const ridgeDx = ridgeB.x - ridgeA.x;
  const ridgeDz = ridgeB.z - ridgeA.z;
  const ridgeLen2 = ridgeDx * ridgeDx + ridgeDz * ridgeDz;
  const ridgeWidth = HALF * 0.18;
  const ridgeAmp   = summitH * 0.10;

  // Bump reach — wider than before (was HALF*0.13). Real peaks have visible
  // shoulders, not needle tips. Adapts to slot density to avoid heavy overlap.
  let minSlotDist = Infinity;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const dx = slots[i].x - slots[j].x;
      const dz = slots[i].z - slots[j].z;
      const d = Math.sqrt(dx * dx + dz * dz);
      if (d < minSlotDist) minSlotDist = d;
    }
  }
  const bumpReach = Math.min(HALF * 0.22, Math.max(HALF * 0.10, minSlotDist * 0.95));

  const baseAt = (wx: number, wz: number): number => {
    const dxs = wx - summit.x, dzs = wz - summit.z;
    const d = Math.sqrt(dxs * dxs + dzs * dzs);
    const apronT = Math.max(0, 1 - d / apronReach);
    const massT  = Math.max(0, 1 - d / massReach);
    const apronH = apronAmp * (0.5 - 0.5 * Math.cos(apronT * Math.PI));
    const massH  = massAmp  * (0.5 - 0.5 * Math.cos(massT  * Math.PI));
    return apronH + massH;
  };

  const ridgeAt = (wx: number, wz: number): number => {
    if (ridgeLen2 < 1) return 0;
    const px = wx - ridgeA.x, pz = wz - ridgeA.z;
    const t = Math.max(0, Math.min(1, (px * ridgeDx + pz * ridgeDz) / ridgeLen2));
    const cx = ridgeA.x + ridgeDx * t;
    const cz = ridgeA.z + ridgeDz * t;
    const dx = wx - cx, dz = wz - cz;
    const dPerp = Math.sqrt(dx * dx + dz * dz);
    if (dPerp >= ridgeWidth) return 0;
    const rt = 1 - dPerp / ridgeWidth;
    return ridgeAmp * (0.5 - 0.5 * Math.cos(rt * Math.PI));
  };

  // Bump amplitudes top up base+ridge to the slot's target height. For the
  // summit, base+ridge already cover ~95%, so the summit bump is small; for
  // farther sub-peaks, more of the height comes from the bump but base+ridge
  // still carry a substantial floor.
  const bumpAmps: number[] = slots.map(sl => {
    const here = baseAt(sl.x, sl.z) + ridgeAt(sl.x, sl.z);
    return Math.max(0, sl.height - here);
  });

  const warpScale = 0.55;

  for (let yi = 0; yi < HM_RES; yi++) {
    const wz = HALF - yi * HM_CELL;
    for (let xi = 0; xi < HM_RES; xi++) {
      const wx = -HALF + xi * HM_CELL;

      // Domain warp — pulls the silhouette and ridges into natural curves.
      const warpX = perlin2(perm, wx * cfg.warpFreq + 13.7, wz * cfg.warpFreq - 27.3) * cfg.warpAmp * warpScale;
      const warpZ = perlin2(perm, wx * cfg.warpFreq + 81.1, wz * cfg.warpFreq + 53.9) * cfg.warpAmp * warpScale;
      const fx = wx + warpX;
      const fz = wz + warpZ;

      const baseHeight = baseAt(fx, fz);
      const ridgeBoost = ridgeAt(fx, fz);

      // Per-step bumps — max-blended cosine bells. Wider profile + smaller
      // amplitude per bump = peaks with shoulders, not pinnacles.
      let bumpHeight = 0;
      for (let s = 0; s < slots.length; s++) {
        const sl = slots[s];
        const dx = fx - sl.x, dz = fz - sl.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > bumpReach * bumpReach) continue;
        const d = Math.sqrt(d2);
        const t = 1 - d / bumpReach;
        const profile = 0.5 - 0.5 * Math.cos(t * Math.PI);
        const contribution = profile * bumpAmps[s];
        if (contribution > bumpHeight) bumpHeight = contribution;
      }

      const totalH = baseHeight + ridgeBoost + bumpHeight;

      // FBM detail — slightly stronger than before so flanks read as rocky
      // rather than smooth (also gives erosion something to work with).
      const n01 = (fbmHybrid(perm,
        fx * cfg.noiseScale, fz * cfg.noiseScale,
        cfg.octaves, cfg.persistence, cfg.lacunarity,
        cfg.ridgeMix, cfg.billowMix) + 1) * 0.5;
      const detailAmp = totalH * 0.13;
      const detail = (n01 - 0.5) * 2 * detailAmp;

      const edgeR = Math.min(1, Math.sqrt(wx * wx + wz * wz) / HALF);
      const edgeFade = Math.max(0, 1 - Math.pow(edgeR, cfg.edgeFalloff));

      hm[yi * HM_RES + xi] = (totalH + detail) * edgeFade;
    }
  }
  return hm;
}

// Post-erosion summit guarantee: clamp any cell outside a small guard radius
// to the actual (eroded) summit cell height. Uses the eroded summit height
// rather than the raw target so erosion variation isn't fought by the cap.
function clampToSummit(hm: Float32Array, slots: PeakSlot[]): void {
  const summit = slots.find(s => s.isSummit);
  if (!summit) return;

  const sg = worldToGrid(summit.x, summit.z);
  const sgX = Math.max(0, Math.min(HM_RES - 1, Math.round(sg.gx)));
  const sgY = Math.max(0, Math.min(HM_RES - 1, Math.round(sg.gy)));
  const summitH = hm[sgY * HM_RES + sgX];

  const guardR  = HALF * 0.07;
  const guardR2 = guardR * guardR;

  for (let yi = 0; yi < HM_RES; yi++) {
    const wz = HALF - yi * HM_CELL;
    for (let xi = 0; xi < HM_RES; xi++) {
      const wx = -HALF + xi * HM_CELL;
      const idx = yi * HM_RES + xi;
      if (hm[idx] <= summitH) continue;
      const sdx = wx - summit.x, sdz = wz - summit.z;
      if (sdx * sdx + sdz * sdz > guardR2) hm[idx] = summitH;
    }
  }
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

function buildMountainMesh(THREE: any, hm: Float32Array, perm: Uint8Array, cfg: TerrainCfg, segs = 120) {
  const SEGS = segs;
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

  // ── Pre-baked low-freq band noise (Phase B item) ──────────────────────────
  // The strata band pattern uses a 7-octave FBM at freq 0.12 — slow-varying
  // enough that interpolating across triangles is visually identical to a
  // per-fragment evaluation. Saves one full FBM call per pixel. We use the
  // Perlin we already have (vs. the shader's value-noise FBM); the difference
  // at this frequency is invisible since the term is just used as a
  // randomization phase for the strata sin().
  const bandNoise = new Float32Array(vCount);
  for (let i = 0; i < vCount; i++) {
    const wx = pos.getX(i);
    const wz = pos.getZ(i);
    let v = 0, a = 0.5;
    let px = wx * 0.12 + 5.5;
    let pz = wz * 0.12 + 5.5;
    for (let o = 0; o < 7; o++) {
      v += a * (perlin2(perm, px, pz) * 0.5 + 0.5);
      px *= 2.03; pz *= 2.03; a *= 0.5;
    }
    bandNoise[i] = v;
  }
  geom.setAttribute('aBandNoise', new THREE.Float32BufferAttribute(bandNoise, 1));

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
    side: THREE.DoubleSide,
  });
  // _aaFade uses fwidth() — required on WebGL1 contexts via OES_standard_derivatives.
  // WebGL2 has it built-in, but Three's MeshStandardMaterial doesn't toggle this
  // flag unless a normal map is present, so we set it explicitly.
  (mat as any).extensions = { ...(mat as any).extensions, derivatives: true };

  // ── Custom shader injection — per-fragment rock detail, vertical erosion
  //    streaks, and physically-motivated snow accumulation. The standard PBR
  //    pipeline still runs (shadows, fog, hemi+sun lighting); we just rewrite
  //    diffuseColor before lighting kicks in.
  mat.onBeforeCompile = (shader: any) => {
    shader.uniforms.uPeakHeight = { value: peakHeight };
    shader.uniforms.uSnowLine   = { value: cfg.snowLine };
    shader.uniforms.uHeightScale= { value: cfg.heightScale };
    shader.uniforms.uCamDist    = { value: 180.0 };
    shader.uniforms.uStrataAmp  = { value: cfg.strataAmp };
    mat.userData.shader = shader;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aBandNoise;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vHeightN;
        varying float vBandNoise;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 _wp = modelMatrix * vec4(transformed, 1.0);
        vWorldPos = _wp.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
        vHeightN = clamp(_wp.y / ${peakHeight.toFixed(3)}, 0.0, 1.0);
        vBandNoise = aBandNoise;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uSnowLine;
        uniform float uHeightScale;
        uniform float uCamDist;
        uniform float uStrataAmp;
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
        varying float vHeightN;
        varying float vBandNoise;

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
          // Quintic / smootherstep — C2 continuous, removes the diamond grid
          // artifacts that show under axis-aligned views with cubic Hermite.
          vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
          return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
        }
        float _fbm(vec2 p) {
          float v = 0.0; float a = 0.5;
          for (int i = 0; i < 7; i++) { v += a * _vn(p); p *= 2.03; a *= 0.5; }
          return v;
        }
        // Ridged FBM for crack/fissure patterns — inverts noise to create peaks (dark lines)
        float _rfbm(vec2 p) {
          float v = 0.0; float a = 0.55;
          for (int i = 0; i < 5; i++) {
            float n = _vn(p);
            v += a * (1.0 - abs(n * 2.0 - 1.0));
            p *= 2.11; a *= 0.48;
          }
          return v * 0.5;
        }
        // Anisotropic noise — stretched vertically: produces water-runoff streaks
        float _streak(vec3 p) {
          float ang = atan(p.z, p.x) * 3.5;
          float yf  = p.y * 0.50;
          float s1 = _fbm(vec2(ang * 1.4, yf * 0.9));
          float s2 = _fbm(vec2(ang * 3.2, yf * 1.2));
          return s1 * 0.65 + s2 * 0.35;
        }
        // Hybrid AA fade: screen-space derivatives catch oblique surfaces and
        // glancing angles where a band shrinks below pixel size; camera-distance
        // floor handles the global LOD case. The min() of the two means we
        // suppress detail as soon as either heuristic says it would shimmer.
        float _aaFade(vec2 uv, float freq) {
          // Screen-space: fwidth gives total |dFdx|+|dFdy| per pixel of uv*freq.
          // Pre-band-amplitude detail starts moiré-ing when one cycle covers
          // less than ~1 pixel — fade that band before it shimmers.
          vec2 fw = fwidth(uv * freq);
          float pxFreq = max(fw.x, fw.y);
          float ssFade = 1.0 - smoothstep(0.5, 1.5, pxFreq);
          // Distance floor — same shape as before, kept as a clean fallback
          // for views where derivatives are unreliable (e.g. silhouettes).
          float near = 50.0 / freq;
          float far  = 220.0 / freq;
          float distFade = 1.0 - smoothstep(near, far, uCamDist);
          return min(ssFade, distFade);
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
        // Extra ultra-close band (aa4) only fires when camera is very close.
        float aa1 = _aaFade(vWorldPos.xz, 1.4);
        float aa2 = _aaFade(vWorldPos.xz, 4.5);
        float aa3 = _aaFade(vec2(vWorldPos.x, vWorldPos.y), 3.0);
        float aa4 = _aaFade(vWorldPos.xz, 9.5);
        float rockA = _fbm(vWorldPos.xz * 1.4) * aa1;
        float rockB = _fbm(vWorldPos.xz * 4.5 + 17.0) * aa2;
        float rockC = _fbm(vec2(vWorldPos.x * 3.0, vWorldPos.y * 3.0) + 41.0) * aa3;
        float rockD = _fbm(vWorldPos.xz * 9.5 + 73.0) * aa4;
        float rockDetail = rockA * 0.45 + rockB * 0.28 + rockC * 0.13 + rockD * 0.14
                         + (1.0 - aa1) * 0.225 + (1.0 - aa2) * 0.14
                         + (1.0 - aa3) * 0.065 + (1.0 - aa4) * 0.07;

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
        rockCol *= mix(0.38, 1.08, 1.0 - streakMask);  // streaks → near-black grooves
        rockCol *= 0.62 + rockDetail * 0.78;            // wider detail amplitude → richer relief

        // Gradient bump: dual-frequency 3-sample FBM finite difference → strong fake micro-surface lighting
        float bumpFade = _aaFade(vWorldPos.xz, 2.2) * (1.0 - snowMask * 0.80);
        float bH  = _fbm(vWorldPos.xz * 2.8);
        float bHx = _fbm(vWorldPos.xz * 2.8 + vec2(0.7, 0.0));
        float bHz = _fbm(vWorldPos.xz * 2.8 + vec2(0.0, 0.7));
        float bumpX = bHx - bH;
        float bumpZ = bHz - bH;
        float bumpLit = dot(vec2(bumpX, bumpZ), vec2(0.54, 0.35)) * 2.6;
        float fakeAO = bH * 0.42 + 0.58;
        rockCol *= (1.0 + bumpLit * bumpFade * 0.85) * mix(1.0, fakeAO, bumpFade * 0.95);

        // Ultra-close micro-bump: high-frequency surface roughness only visible when very close
        float microFade = _aaFade(vWorldPos.xz, 9.0) * (1.0 - snowMask * 0.6);
        float mH  = _fbm(vWorldPos.xz * 9.0 + 53.0);
        float mHx = _fbm(vWorldPos.xz * 9.0 + 53.0 + vec2(0.25, 0.0));
        float mHz = _fbm(vWorldPos.xz * 9.0 + 53.0 + vec2(0.0, 0.25));
        float microLit = dot(vec2(mHx - mH, mHz - mH), vec2(0.54, 0.35)) * 4.0;
        rockCol *= (1.0 + microLit * microFade * 0.55);

        // Crack network: ridged high-freq noise → dark fissure lines on steep faces
        // Two layers: coarse fissures + fine hairline cracks at extreme close-up
        float crackFade = _aaFade(vWorldPos.xz, 5.5);
        float crack = _rfbm(vWorldPos.xz * 5.5 + 23.7);
        float crackMask = smoothstep(0.52, 0.78, crack) * (slope * 0.65 + 0.35) * crackFade;
        rockCol = mix(rockCol, rockCol * 0.06, crackMask * 0.95);

        // Hairline crack network: fine secondary fissures, only visible at extreme zoom
        float hairFade = _aaFade(vWorldPos.xz, 12.0);
        float hairCrack = _rfbm(vWorldPos.xz * 12.0 - 41.3);
        float hairMask = smoothstep(0.62, 0.82, hairCrack) * slope * hairFade;
        rockCol = mix(rockCol, rockCol * 0.18, hairMask * 0.85);

        // Sedimentary strata: horizontal banding on steep faces, scaled by biome
        // Two-layer: broad bands + fine sub-bands for richer geological character
        // bandNoise comes from the aBandNoise vertex attribute (CPU-baked Perlin
        // FBM); interpolating it across the triangle is identical-looking to a
        // per-fragment FBM at this frequency, but saves a full 7-octave call.
        float bandNoise = vBandNoise;
        float bandWave = sin(vWorldPos.y * 1.65 + bandNoise * 3.5) * 0.5 + 0.5;
        float subBand  = sin(vWorldPos.y * 5.4 + bandNoise * 1.8) * 0.5 + 0.5;
        float combinedBand = bandWave * 0.75 + subBand * 0.25;
        float bandStr = uStrataAmp * slope * (1.0 - snowMask) * 1.6;
        rockCol *= mix(1.0, mix(0.62, 1.32, combinedBand), clamp(bandStr, 0.0, 1.0));

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

        // Snow sparkle: crystalline ice particles visible at close range
        // Three frequencies → varied star-field of glints
        float sparkFade = _aaFade(vWorldPos.xz, 10.0);
        float spark1 = pow(max(0.0, _vn(vWorldPos.xz * 18.0 + 7.3)), 5.0) * sparkFade;
        float spark2 = pow(max(0.0, _vn(vWorldPos.xz * 28.0 - 14.0)), 7.0) * sparkFade;
        float spark3 = pow(max(0.0, _vn(vWorldPos.xz * 42.0 + 91.0)), 9.0) * sparkFade;
        snowCol += vec3(1.00, 1.00, 1.05) * (spark1 * 1.40 + spark2 * 1.00 + spark3 * 0.80) * snowMask;

        // Wind-sculpted snow surface micro-bump (dual frequency)
        float snowBumpFade = _aaFade(vWorldPos.xz, 3.8) * snowMask;
        float sH  = _fbm(vWorldPos.xz * 3.8 + 99.0);
        float sHx = _fbm(vWorldPos.xz * 3.8 + 99.0 + vec2(0.5, 0.0));
        float sHz = _fbm(vWorldPos.xz * 3.8 + 99.0 + vec2(0.0, 0.5));
        float snowBumpLit = dot(vec2(sHx - sH, sHz - sH), vec2(0.54, 0.35)) * 1.8;
        snowCol *= 0.86 + snowBumpLit * 0.50 * snowBumpFade;

        // Fine snow grain: high-freq second pass for crystalline crunch up close
        float snowFineFade = _aaFade(vWorldPos.xz, 11.0) * snowMask;
        float fH  = _fbm(vWorldPos.xz * 11.0 + 31.0);
        float fHx = _fbm(vWorldPos.xz * 11.0 + 31.0 + vec2(0.18, 0.0));
        float fHz = _fbm(vWorldPos.xz * 11.0 + 31.0 + vec2(0.0, 0.18));
        float snowFineLit = dot(vec2(fHx - fH, fHz - fH), vec2(0.54, 0.35)) * 3.5;
        snowCol *= 1.0 + snowFineLit * 0.32 * snowFineFade;

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
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        // Wet streaks and ice slightly more metallic/specular for visual depth
        float m2 = metalnessFactor;
        m2 = mix(m2, 0.10, streakMask * (1.0 - snowMask) * 0.65);
        m2 = mix(m2, 0.14, snowMask * 0.35);
        metalnessFactor = clamp(m2, 0.0, 0.25);`,
      );
  };
  // Ensure shadows include the custom material correctly
  mat.customProgramCacheKey = () => 'mountain-onbc-v7-phaseB';

  const mesh = new THREE.Mesh(geom, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
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

function getCheckpointFocusRadius(modelRadius: number): number {
  return Math.max(68, modelRadius * 0.75 + 28);
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

  const activeMeshRef  = useRef<any>(null);
  const mountainLoRef  = useRef<any>(null);
  const mountainHiRef  = useRef<any>(null);
  const mountainUltraRef = useRef<any>(null);

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
    THREERef.current = THREE;

    const cfg = cfgRef.current;
    const perm = makePerm(seed);

    // ── Plan peak slots (one per step; summit = max-difficulty step) ──
    // Slots are deterministic from `seed` + `steps`, so reseeding gives the
    // same mountain. Slots are produced in step-index order: slots[i] is the
    // peak that belongs to steps[i].
    const slots = planPeakSlots(steps, seed, cfg);

    // ── Generate, erode, finalize the heightmap ──
    const hm = genHeightmapPeakAnchored(perm, cfg, slots);
    hydraulicErode(hm, seed, cfg.erodeDroplets);
    thermalErode(hm, cfg.thermalIters);
    clampToSummit(hm, slots);

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
      antialias: false, alpha: false, powerPreference: 'high-performance',
    });
    renderer.setSize(glW, glH, false);
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = false;
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

    // Lighting — directional sun with fill and bounce, no shadow maps on mobile
    scene.add(new THREE.HemisphereLight(0xb8d0e4, 0x12181e, 0.42));
    const sun = new THREE.DirectionalLight(0xfff0d0, 3.20);
    sun.position.set(180, 260, 120);
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

    // Mountain — low-LOD (SEGS=120) for initial render
    const mountain = buildMountainMesh(THREE, hm, perm, cfg, 120);
    mountainLoRef.current = mountain;
    activeMeshRef.current = mountain;
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

    // Checkpoints — snap to their planned peak slots. The summit slot's
    // checkpoint sits on top of the highest peak (= the hardest step).
    const cps: V3[] = slots.map(slot => ({
      x: slot.x,
      y: sampleHeightGrid(hm, slot.x, slot.z) + cfg.heightScale * 0.022,
      z: slot.z,
    }));
    cpPositions.current = cps;

    if (cps.length >= 2) {
      // ── Surface-following trail ──
      // Walk straight-line segments between consecutive checkpoints, sampling
      // the heightmap at each step + a small lift. Feed the resulting points
      // to a single CatmullRomCurve3 with *uniform* parameterization — that
      // avoids the distance-based math in 'centripetal'/'chordal' modes that
      // can blow up on the sharper curvature produced by scattered peaks.
      // Wrapped in try/catch as belt-and-suspenders: if the trail fails, the
      // rest of the scene still renders.
      try {
        const TRAIL_LIFT = 0.55;
        const SAMPLES_PER_SEG = 16;
        const groundedPts: any[] = [];

        for (let i = 0; i < cps.length - 1; i++) {
          const a = cps[i], b = cps[i + 1];
          // First segment includes its start point; subsequent segments skip
          // step 0 since it would duplicate the previous segment's endpoint.
          const startStep = i === 0 ? 0 : 1;
          for (let step = startStep; step <= SAMPLES_PER_SEG; step++) {
            const t = step / SAMPLES_PER_SEG;
            const px = a.x + (b.x - a.x) * t;
            const pz = a.z + (b.z - a.z) * t;
            const py = sampleHeightGrid(hm, px, pz) + TRAIL_LIFT;
            groundedPts.push(new THREE.Vector3(px, py, pz));
          }
        }

        if (groundedPts.length >= 4) {
          const trailCurve = new THREE.CatmullRomCurve3(groundedPts, false, 'catmullrom', 0.5);
          const tubeGeo = new THREE.TubeGeometry(
            trailCurve,
            Math.max(120, cps.length * 20), // tubular segments
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
      } catch (trailErr) {
        console.warn('[Mountain3D] trail build skipped:', trailErr);
      }
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

      // Update shader camera distance uniform for LOD-driven detail
      const activeShader = (activeMeshRef.current?.material as any)?.userData?.shader;
      if (activeShader) activeShader.uniforms.uCamDist.value = orbitCur.current.radius;

      // 3-tier LOD swap based on zoom distance (with hysteresis to avoid flicker)
      // lo (120 segs) → hi (220 segs) → ultra (300 segs) as camera gets closer
      const curRadius = orbitCur.current.radius;
      const loFromHi    = modelRadius * 0.85;
      const hiFromLo    = modelRadius * 0.60;
      const hiFromUltra = modelRadius * 0.32;
      const ultraFromHi = modelRadius * 0.22;
      const lodActive = activeMeshRef.current;
      const lodLo     = mountainLoRef.current;
      const lodHi     = mountainHiRef.current;
      const lodUltra  = mountainUltraRef.current;

      const swapLod = (next: any) => {
        if (!next || lodActive === next) return;
        if (lodActive) scene.remove(lodActive);
        scene.add(next);
        activeMeshRef.current = next;
      };

      if (lodUltra && curRadius < ultraFromHi) {
        swapLod(lodUltra);
      } else if (lodHi && curRadius < hiFromLo && curRadius >= hiFromUltra) {
        swapLod(lodHi);
      } else if (curRadius > loFromHi) {
        swapLod(lodLo);
      } else if (lodActive === lodUltra && curRadius > hiFromUltra && lodHi) {
        swapLod(lodHi);
      } else if (lodActive === lodHi && curRadius < ultraFromHi && lodUltra) {
        swapLod(lodUltra);
      }

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    loop();

    // Build high-LOD mesh (SEGS=220) asynchronously after initial render settles
    setTimeout(() => {
      const hiMesh = buildMountainMesh(THREE, hm, perm, cfg, 220);
      mountainHiRef.current = hiMesh;
      // Don't add to scene yet — render loop will swap when zoom warrants it
    }, 700);

    // Build ultra-LOD mesh (SEGS=256) — only used when camera is extremely close.
    // Matches HM_RES so each mesh quad maps roughly 1:1 to a heightmap cell;
    // pushing further (300) just supersamples a 256² heightmap and adds vertex
    // cost without new detail. Built later so it doesn't block initial render.
    setTimeout(() => {
      const ultraMesh = buildMountainMesh(THREE, hm, perm, cfg, 256);
      mountainUltraRef.current = ultraMesh;
    }, 2000);

    zoomTimerRef.current = setTimeout(() => {
      const i2 = Math.max(0, Math.min(completedRef.current, cps.length - 1));
      const cp = cps[i2];
      if (cp) {
        orbitTgt.current = {
          theta: orbitTgt.current.theta, phi: 1.10,
          radius: getCheckpointFocusRadius(modelRadius),
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
        radius: getCheckpointFocusRadius(modelRadiusRef.current),
        tx: cps[i].x, ty: cps[i].y, tz: cps[i].z,
      };
    }
  }, [completedSteps]);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (zoomTimerRef.current !== null) clearTimeout(zoomTimerRef.current);
    rendererRef.current?.dispose?.();
    mountainHiRef.current?.geometry?.dispose();
    mountainHiRef.current?.material?.dispose();
    mountainUltraRef.current?.geometry?.dispose();
    mountainUltraRef.current?.material?.dispose();
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers}>
      <GLView
        style={StyleSheet.absoluteFill}
        msaaSamples={0}
        enableExperimentalWorkletSupport={false}
        onContextCreate={onContextCreate}
      />
    </View>
  );
}
