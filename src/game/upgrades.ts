import type { BuffCard } from "./types";

export interface UpgradeDef {
  id: string;
  name: string;
  desc: string;
  baseCost: number;
  costStep: number;
  maxLevel: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "damage",
    name: "Bored Barrel",
    desc: "+6 rifle damage per shot",
    baseCost: 120,
    costStep: 90,
    maxLevel: 6,
  },
  {
    id: "mag",
    name: "Extended Mag",
    desc: "+10 magazine capacity",
    baseCost: 100,
    costStep: 70,
    maxLevel: 5,
  },
  {
    id: "rof",
    name: "Filed Sear",
    desc: "+12% fire rate",
    baseCost: 140,
    costStep: 100,
    maxLevel: 5,
  },
  {
    id: "reload",
    name: "Quick Hands",
    desc: "-15% reload time",
    baseCost: 90,
    costStep: 60,
    maxLevel: 4,
  },
  {
    id: "machete",
    name: "Honed Machete",
    desc: "+10 melee damage, +15% stun buildup",
    baseCost: 110,
    costStep: 80,
    maxLevel: 5,
  },
  {
    id: "armor",
    name: "Scrap Plating",
    desc: "+25 max health, heals to full",
    baseCost: 130,
    costStep: 90,
    maxLevel: 5,
  },
  {
    id: "stamina",
    name: "Lung Capacity",
    desc: "+20 stamina, +20% regen",
    baseCost: 110,
    costStep: 80,
    maxLevel: 5,
  },
  {
    id: "ammo",
    name: "Ammo Crate",
    desc: "Refill reserve ammo to max",
    baseCost: 60,
    costStep: 25,
    maxLevel: 99,
  },
  {
    id: "adrenaline",
    name: "Adrenaline Shot",
    desc: "+1 self-revive charge",
    baseCost: 250,
    costStep: 200,
    maxLevel: 3,
  },
];

export const BUFFS: BuffCard[] = [
  { id: "bloodletter", name: "Bloodletter", desc: "Machete kills restore 12 health" },
  { id: "juggernaut", name: "Juggernaut", desc: "Tackles deal double damage and knock further" },
  { id: "wildfire", name: "Wildfire", desc: "Enemies killed in lava spray fire, damaging nearby" },
  { id: "featherfoot", name: "Featherfoot", desc: "Dodge roll costs 40% less and is longer" },
  { id: "scavenger", name: "Scavenger", desc: "Kills have a 25% chance to drop ammo" },
  { id: "magnet", name: "Slag Magnet", desc: "Pickups are drawn to you from 9m away" },
  { id: "executioner", name: "Executioner", desc: "+120% damage against downed enemies" },
  { id: "concussor", name: "Concussor", desc: "+50% stun buildup on all hits" },
  { id: "hollowpoint", name: "Hollow Point", desc: "20% chance for triple-damage crits" },
  { id: "furnaceborn", name: "Furnaceborn", desc: "Take 60% less lava and geyser damage" },
  { id: "secondwind", name: "Second Wind", desc: "Stamina refills instantly on any kill streak of 3" },
  { id: "prospector", name: "Prospector", desc: "+50% slag from every source" },
];
