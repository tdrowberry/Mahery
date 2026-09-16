import type { RankDef, SkillDef } from './types';

// The bonded animal fights as a second unit, with its own tree and action bar - same 12-move
// pool as Mahery's animal (see sharedSkills.ts), independently unlocked and equipped (see
// save.companion in state/saveFormat.ts). Stand Together below is the one exception: always
// known, never competing for a bar slot, since it's the bond itself rather than a learned move.

export const COMPANION_RATIOS = {
  health: 0.8,   // of Mahery's max Health
  strength: 0.8, // of Mahery's Strength
  vitality: 0.8, // used only for its Guard Stance shield size
  instinct: 0.5, // used only for scaling if it ever gets an Instinct move
  spirit: 0.5,   // of Mahery's max Spirit
};

const standTogetherRank: RankDef = {
  spiritCost: 0,
  cooldown: 3,
  summary: 'For 2 turns, the next hit aimed at Mahery strikes the companion instead.',
  effects: [{ kind: 'status', status: 'standTogether', duration: 2, magnitude: 1, target: 'target' }],
};

export const STAND_TOGETHER: SkillDef = {
  id: 'companion.standTogether',
  name: 'Stand Together',
  flavor: 'The companion steps between Mahery and the next blow aimed at him.',
  kind: 'companion',
  icon: 'guardAlly',
  anim: 'cast',
  target: 'ally',
  ranks: [standTogetherRank, standTogetherRank, standTogetherRank],
};
