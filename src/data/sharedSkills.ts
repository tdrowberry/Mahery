import type { SharedKind, SharedSkillTemplate } from './types';

// The shared skills: one set of numbers reused by all 11 animals. Animals only supply names and
// flavor (see animals.ts). Tune once, applies everywhere. Skill ids in prerequisites use the
// placeholder "{animal}", replaced by engine/skills.ts.
//
// Deliberately one straight line, not a branching tree: each skill requires rank 1 of the one
// before it, in SHARED_KINDS order, ending at the animal's signature (see animals.ts's unique()
// helper, which requires rally). No forks means the tree draws with zero crossing lines, and it
// puts the most situational, high-payoff tools last - you earn your way to them, in order.

export const SHARED_KINDS: SharedKind[] = [
  'basicStrike', 'guardStance', 'secondWind', 'instinctSurge', 'weaken', 'powerStrike',
  'secondBreath', 'rendingClaw', 'quickStrike', 'hamstring', 'rally',
];

const chainRequires = (index: number) =>
  index === 0 ? undefined : [{ skillId: `{animal}.${SHARED_KINDS[index - 1]}`, rank: 1 }];

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
    requires: chainRequires(1),
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
    requires: chainRequires(2),
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
    requires: chainRequires(3),
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
    requires: chainRequires(4),
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
    requires: chainRequires(5),
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
    requires: chainRequires(6),
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
    requires: chainRequires(7),
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
    requires: chainRequires(8),
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
    requires: chainRequires(9),
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
    requires: chainRequires(10),
    ranks: [
      { spiritCost: 7, cooldown: 3, summary: "Heal the ally 120% Instinct and cleanse their negative effects.", effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.2 }, { kind: 'cleanse' }] },
      { spiritCost: 7, cooldown: 3, summary: "Heal the ally 150% Instinct and cleanse their negative effects.", effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.5 }, { kind: 'cleanse' }] },
      { spiritCost: 7, cooldown: 3, summary: "Heal the ally 180% Instinct and cleanse their negative effects.", effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.8 }, { kind: 'cleanse' }] },
    ],
  },
};
