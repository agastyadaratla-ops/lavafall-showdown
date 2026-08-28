import type { EnemyBehavior } from "./enemies";

/** Arena radius. Spawn rings and the player clamp in game.ts derive from this. */
export const ARENA_R = 58;
/** Layout coordinates below were authored for a 34m arena. */
export const LAYOUT_SCALE = ARENA_R / 34;

/** Per-channel [base, span] ramp used to bake the hazard surface texture. */
export interface HazardRamp {
  r: [number, number];
  g: [number, number];
  b: [number, number];
}

export interface MapDef {
  id: string;
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

  // ---- hazard channel
  hazardName: string;
  hazardHalf: number;
  hazardRamp: HazardRamp;
  hazardRepeat: [number, number];
  hazardY: number;
  hazardDrift: number;
  hazardLight: number;
  hazardLightIntensity: number;

  bridges: Array<[number, number]>;
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
  props: "boulders" | "blocks";
  propColor: number;
  /** accent used for neon trim on city props */
  accent: number;
  /** keyed by behaviour, so new enemy types inherit a palette automatically */
  enemyTint: Record<EnemyBehavior, number>;

  // ---- capture the flag
  /** where heroes deliver the core, and where the invaders hold it */
  heroBase: [number, number];
  alienBase: [number, number];
}

const NEO_CITY: MapDef = {
  id: "neo-city",
  name: "Neo Kestrel",
  tagline: "Hold the line downtown",
  blurb:
    "The invaders punched a plasma channel straight through the middle of downtown and parked their siphon on the far bank. Cut through the drones, take back the core, and run it home.",
  cta: "Deploy downtown",

  // night city: deep indigo sky with neon bounce
  background: 0x121734,
  fogColor: 0x1d2650,
  fogNear: 42,
  fogFar: 200,
  domeColor: 0x24306a,

  ground: 0x23283f,
  band: 0x2c3358,
  bank: 0x11142a,
  bridge: 0x3c4468,
  rim: 0x1a1f38,

  hazardName: "plasma",
  hazardHalf: 4.4,
  // hot cyan-magenta channel, unmistakable against the blue city floor
  hazardRamp: { r: [70, 160], g: [40, 190], b: [180, 75] },
  hazardRepeat: [16, 2],
  hazardY: -0.14,
  hazardDrift: 0.05,
  hazardLight: 0x3fd8ff,
  hazardLightIntensity: 2.6,

  bridges: [
    [-19, -11],
    [9, 18],
  ],
  vents: [
    [-24, 10],
    [-9, -14],
    [7, 16],
    [22, -7],
    [-27, -9],
    [19, 18],
    [-3, 22],
    [13, -21],
  ],
  ventRing: 0xff5ad8,
  ventColumn: 0xffc2f0,

  hemiSky: 0x7c8fd8,
  hemiGround: 0x2a2f4a,
  hemiIntensity: 1.7,
  sunColor: 0xcfe0ff,
  sunIntensity: 0.8,

  props: "blocks",
  propColor: 0x2a3050,
  accent: 0x36e0ff,
  // warm hero-facing hostiles against the cold city palette
  enemyTint: { charger: 0xd8562f, ranged: 0xffb028, rusher: 0xe0784a },

  heroBase: [0, 26],
  alienBase: [0, -26],
};

const TIDEWATCH: MapDef = {
  id: "tidewatch",
  name: "Tidewatch Docks",
  tagline: "Hold the flooded port",
  blurb:
    "Storm surge took the lower docks and the invaders tapped the coolant main to keep their siphon running. Low cover, long sightlines, and a burning channel between you and everything worth taking.",
  cta: "Deploy to the docks",

  // dawn over a wet port: cold teal air, warm coolant glow
  background: 0x1b3038,
  fogColor: 0x2a4a52,
  fogNear: 40,
  fogFar: 190,
  domeColor: 0x2f5560,

  ground: 0x2b3538,
  band: 0x35464a,
  bank: 0x141c1e,
  bridge: 0x4a4438,
  rim: 0x1f2a2e,

  hazardName: "coolant",
  hazardHalf: 4.6,
  // hot amber against the cold dock palette
  hazardRamp: { r: [200, 55], g: [110, 120], b: [30, 60] },
  hazardRepeat: [14, 2],
  hazardY: -0.12,
  hazardDrift: 0.04,
  hazardLight: 0xffa63a,
  hazardLightIntensity: 2.3,

  // wider crossings than downtown, but further apart
  bridges: [
    [-24, -16],
    [5, 14],
  ],
  vents: [
    [-21, 12],
    [-6, -17],
    [10, 14],
    [25, -9],
    [-28, -6],
    [16, 20],
    [1, 24],
    [-13, -23],
  ],
  ventRing: 0x6ff0d0,
  ventColumn: 0xc8fff0,

  hemiSky: 0x8fbcc8,
  hemiGround: 0x28353a,
  hemiIntensity: 1.6,
  sunColor: 0xffe3bd,
  sunIntensity: 0.9,

  props: "blocks",
  propColor: 0x33454a,
  accent: 0xffb347,
  enemyTint: { charger: 0xd8562f, ranged: 0xffd24a, rusher: 0xe0784a },

  // corner to corner, so the run home crosses the channel at an angle
  heroBase: [22, 20],
  alienBase: [-22, -20],
};

export const MAPS: MapDef[] = [NEO_CITY, TIDEWATCH];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? NEO_CITY;
}
