import type { Attributes } from './types';

// Leveling and points. All first-draft numbers.

export const BASE_ATTRIBUTES: Attributes = { vitality: 10, strength: 12, instinct: 10, speed: 8 };

export const STARTING_ABILITY_POINTS = 3;
export const STARTING_ATTRIBUTE_POINTS = 0;
// Kept deliberately slow: with 12 learnable skills at up to 3 ranks each (36 possible ability
// points spent) and only ~22 earned by level 20, a full build is never reachable - every point
// spent is a real, permanent choice, not something you'll eventually get around to anyway.
export const ABILITY_POINTS_PER_LEVEL = 1;
export const ATTRIBUTE_POINTS_PER_LEVEL = 2;
export const RANK_COST = 1;      // ability points per rank
export const MAX_RANK = 3;
export const MAX_LEVEL = 20;
// 6 slots against 12 learnable skills (11 shared + 1 signature): real choices, not everything fits.
export const ACTION_BAR_SLOTS = 6;

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
    abilityPoints += ABILITY_POINTS_PER_LEVEL;
    attributePoints += ATTRIBUTE_POINTS_PER_LEVEL;
  }
  if (level >= MAX_LEVEL) xp = 0;
  return { state: { level, xp, abilityPoints, attributePoints }, levelsGained };
}
