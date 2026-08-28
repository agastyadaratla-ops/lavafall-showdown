export interface WeaponDef {
  name: string;
  /** number key that selects it */
  slot: number;
  kind: "gun" | "melee";
  /** damage per pellet (guns) or per swing (melee) */
  damage: number;
  /** seconds between shots */
  fireCd: number;
  pellets: number;
  /** cone in radians while standing, and while sprinting */
  spread: number;
  sprintSpread: number;
  magSize: number;
  reserveMax: number;
  reloadTime: number;
  /** stagger applied per hit */
  stun: number;
  range: number;
  recoil: number;
  shake: number;
  /** short line shown under the ammo counter */
  note: string;
  /** viewmodel proportions: body [w,h,l], barrel [radius,length], and tint */
  model: {
    body: [number, number, number];
    barrel: [number, number];
    color: number;
  };
}

export const WEAPONS = {
  rifle: {
    name: "Bolt Rifle",
    slot: 1,
    kind: "gun",
    damage: 18,
    fireCd: 0.115,
    pellets: 1,
    spread: 0.011,
    sprintSpread: 0.035,
    magSize: 30,
    reserveMax: 240,
    reloadTime: 1.7,
    stun: 12,
    range: 120,
    recoil: 1,
    shake: 0.16,
    note: "Balanced automatic",
    model: { body: [0.12, 0.14, 0.75], barrel: [0.03, 0.5], color: 0x2c2c30 },
  },
  blade: {
    name: "Plasma Blade",
    slot: 2,
    kind: "melee",
    damage: 34,
    fireCd: 0.42,
    pellets: 0,
    spread: 0,
    sprintSpread: 0,
    magSize: 0,
    reserveMax: 0,
    reloadTime: 0,
    stun: 26,
    range: 3,
    recoil: 0,
    shake: 0.1,
    note: "Never runs dry",
    model: { body: [0.06, 0.5, 0.11], barrel: [0, 0], color: 0xb9c0c6 },
  },
  scattergun: {
    name: "Scattergun",
    slot: 3,
    kind: "gun",
    damage: 11,
    fireCd: 0.72,
    pellets: 8,
    spread: 0.075,
    sprintSpread: 0.11,
    magSize: 6,
    reserveMax: 60,
    reloadTime: 2.4,
    stun: 30,
    range: 38,
    recoil: 2.2,
    shake: 0.42,
    note: "Devastating up close",
    model: { body: [0.15, 0.16, 0.68], barrel: [0.045, 0.56], color: 0x4a3327 },
  },
  smg: {
    name: "Pulser",
    slot: 4,
    kind: "gun",
    damage: 11,
    fireCd: 0.065,
    pellets: 1,
    spread: 0.026,
    sprintSpread: 0.06,
    magSize: 45,
    reserveMax: 315,
    reloadTime: 1.5,
    stun: 6,
    range: 80,
    recoil: 0.6,
    shake: 0.1,
    note: "Shreds swarms, sprays wide",
    model: { body: [0.1, 0.13, 0.5], barrel: [0.024, 0.3], color: 0x25313a },
  },
  railgun: {
    name: "Lance",
    slot: 5,
    kind: "gun",
    damage: 130,
    fireCd: 1.15,
    pellets: 1,
    spread: 0,
    sprintSpread: 0.02,
    magSize: 4,
    reserveMax: 32,
    reloadTime: 2.2,
    stun: 60,
    range: 200,
    recoil: 2.6,
    shake: 0.5,
    note: "Pinpoint, punishing to miss",
    model: { body: [0.11, 0.15, 0.95], barrel: [0.035, 0.72], color: 0x3a2c4a },
  },
} satisfies Record<string, WeaponDef>;

export type WeaponId = keyof typeof WEAPONS;

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];

/** Slot order, so number keys and the HUD agree. */
export const WEAPONS_BY_SLOT = [...WEAPON_IDS].sort((a, b) => WEAPONS[a].slot - WEAPONS[b].slot);
