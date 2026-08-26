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

/** The three horde archetypes. Shared so map palettes can tint them. */
export type EnemyKind = "harasser" | "heavy" | "spitter";

export interface HudState {
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
  weapon: "rifle" | "machete";
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
