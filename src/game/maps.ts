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

export const MAPS: MapDef[] = [NEO_CITY];

export function getMap(id: string): MapDef {
  return MAPS.find((m) => m.id === id) ?? NEO_CITY;
}
