import type { EnemyKind } from "./types";

/** Shared crater radius. Both maps use the same footprint so spawn rings and the
 *  player clamp in game.ts stay valid; only theme, hazard and routing change. */
export const ARENA_R = 52;
/** Layout coordinates below were authored for a 34m crater. */
export const LAYOUT_SCALE = ARENA_R / 34;

/** Per-channel [base, span] ramp used to bake a hazard surface texture. */
export interface HazardRamp {
  r: [number, number];
  g: [number, number];
  b: [number, number];
}

export interface MapDef {
  id: string;
  /** shown on the map picker + title screen */
  name: string;
  tagline: string;
  blurb: string;
  cta: string;

  // ---- scene
  background: number;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  domeColor: number;

  // ---- terrain palette
  ground: number;
  /** stained band flanking the hazard, for legibility */
  band: number;
  bank: number;
  bridge: number;
  rim: number;

  // ---- hazard river
  hazardName: string;
  /** half width in pre-scale units */
  hazardHalf: number;
  hazardRamp: HazardRamp;
  /** texture tiling across the river */
  hazardRepeat: [number, number];
  /** surface height; tar sits higher and flatter than sunken lava */
  hazardY: number;
  /** scroll speed of the surface texture */
  hazardDrift: number;
  /** emissive rim lights along the river */
  hazardLight: number;
  hazardLightIntensity: number;

  /** pre-scale [startX, endX] spans that are safe to cross */
  bridges: Array<[number, number]>;
  /** pre-scale vent positions */
  vents: Array<[number, number]>;
  ventRing: number;
  ventColumn: number;

  // ---- lighting
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  sunColor: number;
  sunIntensity: number;

  // ---- set dressing
  props: "boulders" | "bones";
  propColor: number;
  enemyTint: Record<EnemyKind, number>;
}

const DEADLANDS: MapDef = {
  id: "deadlands",
  name: "The Deadlands",
  tagline: "Volcanic horde survival",
  blurb:
    "A crater arena split by a lava river. Endless waves of flankers, spitters and chargers. Bullets run out; the machete never does. Sprint, tackle and let the mountain do the killing.",
  cta: "Enter the crater",

  background: 0x2b1d1e,
  fogColor: 0x4a2622,
  fogNear: 40,
  fogFar: 185,
  domeColor: 0x5c2a2e,

  ground: 0x241d1c,
  band: 0x2a1512,
  bank: 0x0d0908,
  bridge: 0x2e2724,
  rim: 0x1c1717,

  hazardName: "lava",
  hazardHalf: 4.2,
  hazardRamp: { r: [235, 20], g: [70, 165], b: [15, 55] },
  hazardRepeat: [15, 2],
  hazardY: -0.16,
  hazardDrift: 0.035,
  hazardLight: 0xff5b18,
  hazardLightIntensity: 2.4,

  bridges: [
    [-17, -10],
    [10, 17],
  ],
  vents: [
    [-22, -13],
    [-8, 12],
    [7, -14],
    [21, 11],
    [-26, 14],
    [26, -10],
    [0, -20],
    [-2, 21],
  ],
  ventRing: 0xff7a2a,
  ventColumn: 0xffb347,

  hemiSky: 0x8f7ea6,
  hemiGround: 0x4a3328,
  hemiIntensity: 1.55,
  sunColor: 0xffd2ac,
  sunIntensity: 0.85,

  props: "boulders",
  propColor: 0x1c1717,
  enemyTint: { heavy: 0xd9694a, spitter: 0x86d155, harasser: 0xe0977c },
};

const BONE_HOLLOW: MapDef = {
  id: "bone-hollow",
  name: "Bone Hollow",
  tagline: "Prehistoric tar basin",
  blurb:
    "A fern-choked basin where a black tar seep has swallowed everything that ever walked here. The bones are the cover. Sunlight helps you see them coming — the tar does not care either way.",
  cta: "Descend into the hollow",

  // daylight basin: light terrain so the near-black tar reads with high contrast
  background: 0x6f7f5a,
  fogColor: 0x8b9a66,
  fogNear: 46,
  fogFar: 205,
  domeColor: 0x93a173,

  ground: 0x59613a,
  band: 0x6d6a41,
  bank: 0x2f2a1d,
  bridge: 0x6b5433,
  rim: 0x3d4428,

  hazardName: "tar",
  hazardHalf: 4.6,
  // dark, oily, with a thin amber sheen riding the surface
  hazardRamp: { r: [16, 92], g: [12, 62], b: [10, 26] },
  hazardRepeat: [11, 2],
  hazardY: -0.06,
  hazardDrift: 0.012,
  hazardLight: 0xffb347,
  hazardLightIntensity: 0.9,

  // different crossings + vent field, so routing genuinely differs from the crater
  bridges: [
    [-25, -17],
    [3, 12],
  ],
  vents: [
    [-19, 9],
    [-5, -16],
    [12, 15],
    [24, -6],
    [-28, -8],
    [18, -19],
    [2, 22],
    [-11, -24],
  ],
  ventRing: 0xd8f0a0,
  ventColumn: 0xeaf7c8,

  hemiSky: 0xbfd8a8,
  hemiGround: 0x4d4a2c,
  hemiIntensity: 1.9,
  sunColor: 0xfff2cf,
  sunIntensity: 1.15,

  props: "bones",
  propColor: 0xcfc7a6,
  enemyTint: { heavy: 0x8e6f3f, spitter: 0x6fae4a, harasser: 0xa98c5c },
};

export const MAPS: MapDef[] = [DEADLANDS, BONE_HOLLOW];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? DEADLANDS;
}
