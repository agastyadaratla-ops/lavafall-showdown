/** How an enemy closes the distance. Drives the branch in Game.step(). */
export type EnemyBehavior = "rusher" | "charger" | "ranged";

export interface EnemyDef {
  name: string;
  behavior: EnemyBehavior;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  stunMax: number;
  /** body scale; height is derived as 2 * scale */
  scale: number;
  /** extra slag awarded on death */
  bounty: number;
  /** seconds spent floored after a stagger */
  downTime: number;
  eye: number;
  /** first wave this type can appear on */
  minWave: number;
  /** spawn weight the wave it unlocks, and how much it gains per later wave */
  weight: number;
  waveGain: number;
}

export const ENEMIES = {
  harasser: {
    name: "Flanker",
    behavior: "rusher",
    hp: 46,
    speed: 4.7,
    damage: 9,
    radius: 0.5,
    stunMax: 55,
    scale: 0.95,
    bounty: 0,
    downTime: 1.8,
    eye: 0xff4020,
    minWave: 1,
    weight: 100,
    waveGain: -3,
  },
  spitter: {
    name: "Spitter",
    behavior: "ranged",
    hp: 72,
    speed: 2.7,
    damage: 13,
    radius: 0.55,
    stunMax: 55,
    scale: 1.0,
    bounty: 6,
    downTime: 1.8,
    eye: 0x9dff5a,
    minWave: 2,
    weight: 20,
    waveGain: 3,
  },
  heavy: {
    name: "Charger",
    behavior: "charger",
    hp: 240,
    speed: 2.1,
    damage: 28,
    radius: 0.95,
    stunMax: 130,
    scale: 1.55,
    bounty: 20,
    downTime: 2.6,
    eye: 0xff4020,
    minWave: 3,
    weight: 10,
    waveGain: 2.5,
  },
  swarmling: {
    name: "Swarmling",
    behavior: "rusher",
    hp: 22,
    speed: 6.6,
    damage: 5,
    radius: 0.34,
    stunMax: 26,
    scale: 0.6,
    bounty: 2,
    downTime: 1.2,
    eye: 0xffd83a,
    minWave: 4,
    weight: 0,
    waveGain: 7,
  },
  spinespitter: {
    name: "Spinespitter",
    behavior: "ranged",
    hp: 58,
    speed: 3.4,
    damage: 17,
    radius: 0.5,
    stunMax: 44,
    scale: 0.9,
    bounty: 10,
    downTime: 1.6,
    eye: 0x6cf0ff,
    minWave: 6,
    weight: 0,
    waveGain: 3.5,
  },
  brute: {
    name: "Brute",
    behavior: "charger",
    hp: 520,
    speed: 1.7,
    damage: 42,
    radius: 1.3,
    stunMax: 220,
    scale: 2.05,
    bounty: 45,
    downTime: 3.2,
    eye: 0xff2a6d,
    minWave: 8,
    weight: 0,
    waveGain: 2,
  },
} satisfies Record<string, EnemyDef>;

export type EnemyKind = keyof typeof ENEMIES;

const KINDS = Object.keys(ENEMIES) as EnemyKind[];

/** Weighted pick across every type unlocked by this wave. */
export function pickEnemy(wave: number, rng: () => number = Math.random): EnemyKind {
  const pool = KINDS.filter((k) => wave >= ENEMIES[k].minWave);
  if (!pool.length) return "harasser";
  const weights = pool.map((k) => {
    const d = ENEMIES[k];
    return Math.max(0, d.weight + d.waveGain * (wave - d.minWave));
  });
  const total = weights.reduce((a, b) => a + b, 0);
  // every unlocked type can end up at zero weight early on; fall back to the basic rusher
  if (total <= 0) return pool[0];
  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
