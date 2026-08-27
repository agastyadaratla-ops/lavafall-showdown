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
  /** bosses are hand-placed on milestone waves, never rolled into normal spawns */
  boss?: boolean;
  /** boss only: seconds between reinforcement summons */
  summonEvery?: number;
}

const RAW = {
  harasser: {
    name: "Scrapper",
    behavior: "rusher",
    hp: 46,
    speed: 4.7,
    damage: 9,
    radius: 0.5,
    stunMax: 55,
    scale: 0.95,
    bounty: 0,
    downTime: 1.8,
    eye: 0xff5533,
    minWave: 1,
    weight: 100,
    waveGain: -3,
  },
  spitter: {
    name: "Arc Drone",
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
    name: "Sentinel",
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
    name: "Nanite",
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
    name: "Pulse Drone",
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
    name: "Colossus",
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
  warden: {
    name: "Siphon Warden",
    behavior: "charger",
    hp: 1400,
    speed: 1.8,
    damage: 46,
    radius: 1.9,
    stunMax: 420,
    scale: 3.0,
    bounty: 260,
    downTime: 2.4,
    eye: 0xff2a6d,
    minWave: 999,
    weight: 0,
    waveGain: 0,
    boss: true,
  },
  hiveframe: {
    name: "Hive Frame",
    behavior: "ranged",
    hp: 1100,
    speed: 1.3,
    damage: 26,
    radius: 1.7,
    stunMax: 360,
    scale: 2.7,
    bounty: 240,
    downTime: 2.0,
    eye: 0x6cf0ff,
    minWave: 999,
    weight: 0,
    waveGain: 0,
    boss: true,
    summonEvery: 4.5,
  },
} satisfies Record<string, EnemyDef>;

export type EnemyKind = keyof typeof RAW;

/** Widened on purpose: lookups need the optional boss fields to be visible. */
export const ENEMIES: Record<EnemyKind, EnemyDef> = RAW;

const KINDS = Object.keys(ENEMIES) as EnemyKind[];
/** Normal spawn pool: bosses are placed deliberately, never rolled. */
const ROLLABLE = KINDS.filter((k) => !ENEMIES[k].boss);

/** Which boss, if any, guards this wave. Alternates so runs do not feel samey. */
export function bossForWave(wave: number): EnemyKind | null {
  if (wave <= 0 || wave % 5 !== 0) return null;
  return (wave / 5) % 2 === 1 ? "warden" : "hiveframe";
}

/** Elite prefixes that any normal machine can roll as waves climb. */
export type EliteKind = "none" | "armoured" | "volatile" | "overclocked";

export interface EliteDef {
  name: string;
  /** overlay colour so the player can read the threat instantly */
  tint: number;
  hpMul: number;
  speedMul: number;
  damageMul: number;
  /** multiplier on damage taken; below 1 means tougher */
  resist: number;
  bounty: number;
}

export const ELITES: Record<EliteKind, EliteDef> = {
  none: { name: "", tint: 0, hpMul: 1, speedMul: 1, damageMul: 1, resist: 1, bounty: 0 },
  armoured: {
    name: "Armoured",
    tint: 0x9fb4c8,
    hpMul: 1.9,
    speedMul: 0.85,
    damageMul: 1.15,
    resist: 0.55,
    bounty: 18,
  },
  volatile: {
    name: "Volatile",
    tint: 0xff8a3a,
    hpMul: 0.8,
    speedMul: 1.1,
    damageMul: 1,
    resist: 1.15,
    bounty: 14,
  },
  overclocked: {
    name: "Overclocked",
    tint: 0xffe14a,
    hpMul: 0.9,
    speedMul: 1.55,
    damageMul: 1.1,
    resist: 1,
    bounty: 16,
  },
};

const ELITE_POOL: EliteKind[] = ["armoured", "volatile", "overclocked"];

/** Elites start appearing around wave 3 and plateau so late waves stay readable. */
export function rollElite(wave: number, rng: () => number = Math.random): EliteKind {
  const chance = Math.min(0.34, Math.max(0, (wave - 2) * 0.04));
  if (rng() > chance) return "none";
  return ELITE_POOL[Math.floor(rng() * ELITE_POOL.length)];
}

/** Weighted pick across every type unlocked by this wave. */
export function pickEnemy(wave: number, rng: () => number = Math.random): EnemyKind {
  const pool = ROLLABLE.filter((k) => wave >= ENEMIES[k].minWave);
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
