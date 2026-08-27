import type { EnemyBehavior } from "./enemies";

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
  /** keyed by behaviour, so new enemy types inherit a palette automatically */
  enemyTint: Record<EnemyBehavior, number>;
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
  enemyTint: { charger: 0xd9694a, ranged: 0x86d155, rusher: 0xe0977c },
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
  enemyTint: { charger: 0x8e6f3f, ranged: 0x6fae4a, rusher: 0xa98c5c },
};

const RIMEFALL: MapDef = {
  id: "rimefall",
  name: "Rimefall",
  tagline: "Frozen crater survival",
  blurb:
    "A snowbound caldera cracked open by a meltwater channel that never freezes. Glare off the ice makes every silhouette read at range - and leaves you nowhere to hide either.",
  cta: "Cross the ice",

  background: 0x9fb6c8,
  fogColor: 0xc3d4e0,
  fogNear: 44,
  fogFar: 210,
  domeColor: 0xbcd0dd,

  ground: 0xd6e2ea,
  band: 0xa9c0d0,
  bank: 0x5e7484,
  bridge: 0x8a9aa4,
  rim: 0x8fa6b6,

  hazardName: "meltwater",
  hazardHalf: 4.4,
  // dark glacial water with pale crests, reading almost black against the snow
  hazardRamp: { r: [10, 60], g: [40, 120], b: [80, 150] },
  hazardRepeat: [13, 2],
  hazardY: -0.14,
  hazardDrift: 0.02,
  hazardLight: 0x6fc8ff,
  hazardLightIntensity: 1.1,

  bridges: [
    [-22, -14],
    [8, 18],
  ],
  vents: [
    [-24, 7],
    [-9, -15],
    [6, 17],
    [20, -8],
    [-14, 20],
    [25, 12],
    [-2, -23],
    [14, -20],
  ],
  ventRing: 0xbfe8ff,
  ventColumn: 0xe6f6ff,

  hemiSky: 0xdcecf6,
  hemiGround: 0x6d8494,
  hemiIntensity: 2.0,
  sunColor: 0xffffff,
  sunIntensity: 1.2,

  props: "boulders",
  propColor: 0xb9cdd9,
  // dark hides on snow: warm browns stay legible against the glare
  enemyTint: { charger: 0x7a4230, ranged: 0x4f8f3a, rusher: 0x8c5a4a },
};

const VERDIGRIS: MapDef = {
  id: "verdigris",
  name: "Verdigris",
  tagline: "Flooded copper works",
  blurb:
    "A drowned smelting yard gone green with rot, split by a channel of spent acid. The catwalks are the only dry way across, and the vents still purge on their own schedule.",
  cta: "Enter the works",

  background: 0x2a3a34,
  fogColor: 0x3d5a4e,
  fogNear: 38,
  fogFar: 175,
  domeColor: 0x35564a,

  ground: 0x2f3a35,
  band: 0x3c4a3e,
  bank: 0x1a2420,
  bridge: 0x5a4a34,
  rim: 0x27332e,

  hazardName: "acid",
  hazardHalf: 4.5,
  hazardRamp: { r: [40, 90], g: [200, 55], b: [30, 70] },
  hazardRepeat: [14, 2],
  hazardY: -0.14,
  hazardDrift: 0.03,
  hazardLight: 0x7dff4a,
  hazardLightIntensity: 2.0,

  bridges: [
    [-20, -12],
    [6, 15],
  ],
  vents: [
    [-26, -11],
    [-13, 14],
    [4, -18],
    [17, 8],
    [27, -14],
    [-6, 23],
    [11, 21],
    [-19, -21],
  ],
  ventRing: 0xaaff66,
  ventColumn: 0xd8ffb0,

  hemiSky: 0x7fa38f,
  hemiGround: 0x2c3a32,
  hemiIntensity: 1.5,
  sunColor: 0xd8f0d0,
  sunIntensity: 0.7,

  props: "boulders",
  propColor: 0x3b5148,
  // warm tones so enemies separate from the green everywhere else
  enemyTint: { charger: 0xc46a4a, ranged: 0xe0d055, rusher: 0xd9a066 },
};

export const MAPS: MapDef[] = [DEADLANDS, BONE_HOLLOW, RIMEFALL, VERDIGRIS];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? DEADLANDS;
}
