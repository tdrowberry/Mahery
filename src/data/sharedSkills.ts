import type { SharedKind, SharedSkillTemplate } from './types';

// The shared skills: one set of numbers reused by all 11 animals. Animals only supply names and
// flavor (see animals.ts). Tune once, applies everywhere. Skill ids in prerequisites use the
// placeholder "{animal}", replaced by engine/skills.ts.
//
// Basic Strike is the root, free from character creation. From there the tree splits into three
// independent columns - straight lines, not forks within themselves, so nothing ever crosses -
// grouped by what the skill is actually for, so a player can see at a glance what a whole branch
// is about:
//   - Attacks:        setup-and-payoff Strength damage (Weaken feeds Power Strike's bonus).
//   - Healing/Block:  everything about staying alive - a shield, self-heals, Spirit sustain,
//                      and the ally-support heal.
//   - Buffs/Debuffs:  stat-percentage effects, up on you or down on the enemy.
// Each column orders its own skills so the most valuable one lands last. The signature skill
// (see animals.ts's unique() helper) requires rank 1 of *every* column's last skill - you earn
// it by finishing all three branches, not just picking one and ignoring the rest.
export const COLUMN_ATTACKS: SharedKind[] = ['weaken', 'rendingClaw', 'powerStrike'];
export const COLUMN_SUPPORT: SharedKind[] = ['guardStance', 'secondWind', 'secondBreath', 'rally'];
export const COLUMN_BUFFS: SharedKind[] = ['instinctSurge', 'quickStrike', 'hamstring'];
export const SKILL_COLUMNS: SharedKind[][] = [COLUMN_ATTACKS, COLUMN_SUPPORT, COLUMN_BUFFS];
/** The last skill of each column - rank 1 of all three is what the signature skill requires. */
export const COLUMN_FINISHERS: SharedKind[] = SKILL_COLUMNS.map((col) => col[col.length - 1]);

export const SHARED_KINDS: SharedKind[] = ['basicStrike', ...COLUMN_ATTACKS, ...COLUMN_SUPPORT, ...COLUMN_BUFFS];

/** Rank 1 of the previous skill in the same column, or Basic Strike for a column's first skill. */
function columnRequires(column: SharedKind[], index: number) {
  const prev = index === 0 ? 'basicStrike' : column[index - 1];
  return [{ skillId: `{animal}.${prev}`, rank: 1 }];
}
const requiresOf = (kind: SharedKind): { skillId: string; rank: number }[] | undefined => {
  if (kind === 'basicStrike') return undefined;
  for (const column of SKILL_COLUMNS) {
    const i = column.indexOf(kind);
    if (i !== -1) return columnRequires(column, i);
  }
  return undefined;
};

export const SHARED_SKILLS: Record<SharedKind, SharedSkillTemplate> = {
  basicStrike: {
    sharedKind: 'basicStrike',
    icon: 'slash',
    anim: 'strike',
    target: 'enemy',
    ranks: [
      { spiritCost: 0, cooldown: 0, summary: 'Deal 100% Strength damage.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }] },
      { spiritCost: 0, cooldown: 0, summary: 'Deal 125% Strength damage.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.25 }] },
      { spiritCost: 0, cooldown: 0, summary: 'Deal 150% Strength damage.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.5 }] },
    ],
  },
  guardStance: {
    sharedKind: 'guardStance',
    icon: 'shield',
    anim: 'cast',
    target: 'self',
    requires: requiresOf('guardStance'),
    ranks: [
      { spiritCost: 6, cooldown: 3, summary: 'Gain a shield of 200% Vitality for 2 turns.', effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 2, duration: 2 }] },
      { spiritCost: 6, cooldown: 3, summary: 'Gain a shield of 300% Vitality for 2 turns.', effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 3, duration: 2 }] },
      { spiritCost: 6, cooldown: 3, summary: 'Gain a shield of 400% Vitality for 2 turns.', effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 4, duration: 2 }] },
    ],
  },
  secondWind: {
    sharedKind: 'secondWind',
    icon: 'heal',
    anim: 'cast',
    target: 'self',
    requires: requiresOf('secondWind'),
    ranks: [
      { spiritCost: 2, cooldown: 2, summary: 'Heal 150% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.5 }] },
      { spiritCost: 2, cooldown: 2, summary: 'Heal 200% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.0 }] },
      { spiritCost: 2, cooldown: 2, summary: 'Heal 250% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.5 }] },
    ],
  },
  instinctSurge: {
    sharedKind: 'instinctSurge',
    icon: 'roar',
    anim: 'cast',
    target: 'self',
    requires: requiresOf('instinctSurge'),
    ranks: [
      {
        spiritCost: 8, cooldown: 4, summary: '+20% Strength and Instinct for 3 turns.',
        effects: [
          { kind: 'status', status: 'strengthUp', duration: 3, magnitude: 0.2, target: 'self' },
          { kind: 'status', status: 'instinctUp', duration: 3, magnitude: 0.2, target: 'self' },
        ],
      },
      {
        spiritCost: 8, cooldown: 4, summary: '+30% Strength and Instinct for 3 turns.',
        effects: [
          { kind: 'status', status: 'strengthUp', duration: 3, magnitude: 0.3, target: 'self' },
          { kind: 'status', status: 'instinctUp', duration: 3, magnitude: 0.3, target: 'self' },
        ],
      },
      {
        spiritCost: 8, cooldown: 4, summary: '+40% Strength and Instinct for 3 turns.',
        effects: [
          { kind: 'status', status: 'strengthUp', duration: 3, magnitude: 0.4, target: 'self' },
          { kind: 'status', status: 'instinctUp', duration: 3, magnitude: 0.4, target: 'self' },
        ],
      },
    ],
  },
  weaken: {
    sharedKind: 'weaken',
    icon: 'weaken',
    anim: 'venom',
    target: 'enemy',
    requires: requiresOf('weaken'),
    ranks: [
      { spiritCost: 6, cooldown: 3, summary: 'Deal 90% Strength damage and weaken the target 20% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.9 }, { kind: 'status', status: 'weaken', duration: 2, magnitude: 0.2, target: 'target' }] },
      { spiritCost: 6, cooldown: 3, summary: 'Deal 100% Strength damage and weaken the target 25% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }, { kind: 'status', status: 'weaken', duration: 2, magnitude: 0.25, target: 'target' }] },
      { spiritCost: 6, cooldown: 3, summary: 'Deal 110% Strength damage and weaken the target 30% for 3 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.1 }, { kind: 'status', status: 'weaken', duration: 3, magnitude: 0.3, target: 'target' }] },
    ],
  },
  powerStrike: {
    sharedKind: 'powerStrike',
    icon: 'power',
    anim: 'charge',
    target: 'enemy',
    requires: requiresOf('powerStrike'),
    // Timed with Weaken: a target already weakened takes 40% extra here, so landing the two
    // in the right order matters more than just having both unlocked.
    ranks: [
      { spiritCost: 5, cooldown: 2, summary: 'Deal 160% Strength damage, +13% per stack of Weaken on the target.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.6, bonusVsStatus: { status: 'weaken', multiplier: 0.13 } }] },
      { spiritCost: 5, cooldown: 2, summary: 'Deal 185% Strength damage, +14% per stack of Weaken on the target.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.85, bonusVsStatus: { status: 'weaken', multiplier: 0.14 } }] },
      { spiritCost: 5, cooldown: 2, summary: 'Deal 210% Strength damage, +15% per stack of Weaken on the target.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 2.1, bonusVsStatus: { status: 'weaken', multiplier: 0.15 } }] },
    ],
  },
  secondBreath: {
    sharedKind: 'secondBreath',
    icon: 'heal',
    anim: 'cast',
    target: 'self',
    requires: requiresOf('secondBreath'),
    ranks: [
      { spiritCost: 0, cooldown: 4, summary: 'Restore 10 Spirit.', effects: [{ kind: 'restoreSpirit', amount: 10 }] },
      { spiritCost: 0, cooldown: 4, summary: 'Restore 14 Spirit.', effects: [{ kind: 'restoreSpirit', amount: 14 }] },
      { spiritCost: 0, cooldown: 3, summary: 'Restore 18 Spirit.', effects: [{ kind: 'restoreSpirit', amount: 18 }] },
    ],
  },
  rendingClaw: {
    sharedKind: 'rendingClaw',
    icon: 'shadow',
    anim: 'strike',
    target: 'enemy',
    requires: requiresOf('rendingClaw'),
    ranks: [
      { spiritCost: 7, cooldown: 3, summary: 'Deal 70% Strength damage and bleed for 25% Strength over 3 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.7 }, { kind: 'status', status: 'bleed', duration: 3, magnitude: 0.25, scaling: 'strength', target: 'target' }] },
      { spiritCost: 7, cooldown: 3, summary: 'Deal 80% Strength damage and bleed for 30% Strength over 3 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.8 }, { kind: 'status', status: 'bleed', duration: 3, magnitude: 0.3, scaling: 'strength', target: 'target' }] },
      { spiritCost: 7, cooldown: 3, summary: 'Deal 90% Strength damage and bleed for 35% Strength over 3 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.9 }, { kind: 'status', status: 'bleed', duration: 3, magnitude: 0.35, scaling: 'strength', target: 'target' }] },
    ],
  },
  quickStrike: {
    sharedKind: 'quickStrike',
    icon: 'wind',
    anim: 'cast',
    target: 'self',
    requires: requiresOf('quickStrike'),
    ranks: [
      { spiritCost: 6, cooldown: 4, summary: '+15% Speed for 3 turns.', effects: [{ kind: 'status', status: 'speedUp', duration: 3, magnitude: 0.15, target: 'self' }] },
      { spiritCost: 6, cooldown: 4, summary: '+20% Speed for 3 turns.', effects: [{ kind: 'status', status: 'speedUp', duration: 3, magnitude: 0.2, target: 'self' }] },
      { spiritCost: 6, cooldown: 4, summary: '+25% Speed for 3 turns.', effects: [{ kind: 'status', status: 'speedUp', duration: 3, magnitude: 0.25, target: 'self' }] },
    ],
  },
  hamstring: {
    sharedKind: 'hamstring',
    icon: 'pounce',
    anim: 'strike',
    target: 'enemy',
    requires: requiresOf('hamstring'),
    ranks: [
      { spiritCost: 6, cooldown: 3, summary: 'Deal 70% Strength damage and slow the target 20% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.7 }, { kind: 'status', status: 'speedDown', duration: 2, magnitude: 0.2, target: 'target' }] },
      { spiritCost: 6, cooldown: 3, summary: 'Deal 80% Strength damage and slow the target 25% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.8 }, { kind: 'status', status: 'speedDown', duration: 2, magnitude: 0.25, target: 'target' }] },
      { spiritCost: 6, cooldown: 3, summary: 'Deal 90% Strength damage and slow the target 30% for 3 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.9 }, { kind: 'status', status: 'speedDown', duration: 3, magnitude: 0.3, target: 'target' }] },
    ],
  },
  rally: {
    sharedKind: 'rally',
    icon: 'rally',
    anim: 'cast',
    target: 'ally',
    requires: requiresOf('rally'),
    ranks: [
      { spiritCost: 7, cooldown: 3, summary: "Heal the ally 120% Instinct and cleanse their negative effects.", effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.2 }, { kind: 'cleanse' }] },
      { spiritCost: 7, cooldown: 3, summary: "Heal the ally 150% Instinct and cleanse their negative effects.", effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.5 }, { kind: 'cleanse' }] },
      { spiritCost: 7, cooldown: 3, summary: "Heal the ally 180% Instinct and cleanse their negative effects.", effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.8 }, { kind: 'cleanse' }] },
    ],
  },
};
