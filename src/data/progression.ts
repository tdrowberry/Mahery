import type { Attributes } from './types';

// Leveling and points. All first-draft numbers.

export const BASE_ATTRIBUTES: Attributes = { vitality: 10, strength: 12, instinct: 10, speed: 8 };

export const STARTING_ABILITY_POINTS = 3;
export const STARTING_ATTRIBUTE_POINTS = 0;
export const ATTRIBUTE_POINTS_PER_LEVEL = 2;
export const RANK_COST = 1;      // ability points per rank
export const MAX_RANK = 3;
export const MAX_LEVEL = 20;
// 6 slots against 12 learnable skills (11 shared + 1 signature): real choices, not everything fits
// on the bar at once, even once every skill is unlocked.
export const ACTION_BAR_SLOTS = 6;
// 11 shared skills + 1 signature = 12, same for every animal.
export const TOTAL_LEARNABLE_SKILLS = 12;
// The signature skill alone goes to 5 ranks, not MAX_RANK's 3 (see animals.ts's unique()
// helper) - it's the one thing still worth growing into after the rest of the chain is maxed.
export const SIGNATURE_MAX_RANK = 5;
// The true cost (in Ability Points) of ranking every shared skill plus the signature to max -
// see MAX_TOTAL_ABILITY_POINTS below.
export const MAX_TOTAL_ABILITY_POINTS =
  (TOTAL_LEARNABLE_SKILLS - 1) * MAX_RANK + SIGNATURE_MAX_RANK; // 11*3 + 5 = 38

/**
 * Ability Points granted for reaching `newLevel`. Levels 2-4 grant 1 (keeps the early game
 * tight - see the balance tests), levels 5-20 grant 2, so STARTING_ABILITY_POINTS plus every
 * level-up through MAX_LEVEL sums to exactly MAX_TOTAL_ABILITY_POINTS: a genuinely maxed-out
 * tree (signature included) is reachable, but never before the very end, and never with points
 * left stranded.
 */
export function abilityPointsForLevelUp(newLevel: number): number {
  return newLevel <= 4 ? 1 : 2;
}

/** Total Ability Points a character would have accumulated by `level` - starting points plus
 * every level-up's grant. Used both for a fresh save and to backfill the companion's own
 * Ability Point pool when an older save migrates in without one (see saveFormat.ts): the
 * companion's tree is new, but its owner isn't, so it starts with the same budget Mahery would
 * have at that level rather than from zero. */
export function totalAbilityPointsAtLevel(level: number): number {
  let total = STARTING_ABILITY_POINTS;
  for (let l = 2; l <= level; l++) total += abilityPointsForLevelUp(l);
  return total;
}

/** Ability Points the companion earns for the same level-ups Mahery just gained - it follows
 * the identical per-level schedule, just tracked as its own separate pool (see the companion
 * action bar). `oldLevel` is the level before this gain. */
export function companionAbilityPointsForLevels(oldLevel: number, levelsGained: number): number {
  let total = 0;
  for (let l = oldLevel + 1; l <= oldLevel + levelsGained; l++) total += abilityPointsForLevelUp(l);
  return total;
}

/** Marks cost to reset the ability tree and attributes back to zero and reassign from scratch.
 * Scales with level - the more you've built up, the more it costs to tear down. */
export const respecCost = (level: number) => 40 + level * 15;

export const xpToNextLevel = (level: number) => 100 + 50 * (level - 1);

export interface LevelState {
  level: number;
  xp: number;
  abilityPoints: number;
  attributePoints: number;
}

/** Apply XP, leveling up as many times as earned. Pure. */
export function gainXp(state: LevelState, amount: number): { state: LevelState; levelsGained: number } {
  let { level, xp, abilityPoints, attributePoints } = state;
  xp += amount;
  let levelsGained = 0;
  while (level < MAX_LEVEL && xp >= xpToNextLevel(level)) {
    xp -= xpToNextLevel(level);
    level += 1;
    levelsGained += 1;
    abilityPoints += abilityPointsForLevelUp(level);
    attributePoints += ATTRIBUTE_POINTS_PER_LEVEL;
  }
  if (level >= MAX_LEVEL) xp = 0;
  return { state: { level, xp, abilityPoints, attributePoints }, levelsGained };
}
