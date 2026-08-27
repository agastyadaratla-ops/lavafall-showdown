export type Phase = "title" | "playing" | "respite" | "draft" | "paused" | "gameover";

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  level: number;
  maxLevel: number;
}

export interface BuffCard {
  id: string;
  name: string;
  desc: string;
}

export interface Toast {
  id: number;
  text: string;
  kind: "good" | "bad" | "info";
}

import type { NetStatus } from "./net";

export interface RosterEntry {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  downed: boolean;
  kills: number;
}

export interface HudState {
  net: NetStatus;
  captures: number;
  captureGoal: number;
  flagMode: "base" | "carried" | "dropped";
  flagHolder: string;
  flagMine: boolean;
  roster: RosterEntry[];
  phase: Phase;
  /** screen-relative bearing of the last damage source (radians, 0 = ahead), null for burns */
  hurtDir: number | null;
  /** fades 1 -> 0 so the damage arc can decay */
  hurtDirT: number;
  wave: number;
  bestWave: number;
  enemiesLeft: number;
  waveTotal: number;
  respiteLeft: number;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  slag: number;
  weapon: string;
  weaponName: string;
  weaponNote: string;
  mag: number;
  magSize: number;
  reserve: number;
  reloading: boolean;
  downed: boolean;
  bleedOut: number;
  reviveProgress: number;
  adrenaline: number;
  kills: number;
  shop: ShopItem[];
  draft: BuffCard[];
  buffs: string[];
  toasts: Toast[];
  hitFlash: number;
  damageFlash: number;
  comboKills: number;
}
