import type { Attributes, Scaling } from '../data/types';

// Draft formulas from GDD.md. Tune here, not in components.
export const maxHealth = (a: Attributes) => 50 + a.vitality * 5;
export const maxSpirit = (a: Attributes) => 20 + a.instinct * 3;

export const scaledValue = (a: Attributes, scaling: Scaling, multiplier: number) =>
  a[scaling] * multiplier;

/** Crit chance from Speed: 5% base + 0.5% per point. */
export const critChance = (speed: number) => Math.min(0.5, 0.05 + speed * 0.005);
export const CRIT_MULTIPLIER = 1.5;

/** Evasion from Speed: 0.5% per point, capped at 30% including bonuses. */
export const evasionChance = (speed: number, bonus = 0) => Math.min(0.3, speed * 0.005 + bonus);

export const DAMAGE_VARIANCE = 0.1;

export function applyVariance(value: number, roll: number) {
  // roll in [0,1) maps to [-variance, +variance]
  const factor = 1 - DAMAGE_VARIANCE + roll * DAMAGE_VARIANCE * 2;
  return value * factor;
}

export const round = (n: number) => Math.max(0, Math.round(n));
