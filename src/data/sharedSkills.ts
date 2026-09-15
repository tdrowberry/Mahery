import type { SharedKind, SharedSkillTemplate } from './types';

// The 4 shared skills: one set of numbers reused by all 11 animals.
// Animals only supply names and flavor (see animals.ts). Tune once, applies everywhere.
// Skill ids in prerequisites use the placeholder "{animal}", replaced by engine/skills.ts.

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
    requires: [{ skillId: '{animal}.basicStrike', rank: 1 }],
    ranks: [
      { spiritCost: 6, cooldown: 3, summary: 'Gain a shield of 200% Vitality for 2 turns.', effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 2, duration: 2 }] },
      { spiritCost: 6, cooldown: 3, summary: 'Gain a shield of 300% Vitality for 2 turns.', effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 3, duration: 2 }] },
      { spiritCost: 6, cooldown: 3, summary: 'Gain a shield of 400% Vitality for 2 turns.', effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 4, duration: 2 }] },
    ],
  },
  instinctSurge: {
    sharedKind: 'instinctSurge',
    icon: 'roar',
    anim: 'cast',
    target: 'self',
    requiresAny: [
      [{ skillId: '{animal}.guardStance', rank: 1 }],
      [{ skillId: '{animal}.secondWind', rank: 1 }],
    ],
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
  secondWind: {
    sharedKind: 'secondWind',
    icon: 'heal',
    anim: 'cast',
    target: 'self',
    requires: [{ skillId: '{animal}.basicStrike', rank: 1 }],
    ranks: [
      { spiritCost: 2, cooldown: 2, summary: 'Heal 150% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.5 }] },
      { spiritCost: 2, cooldown: 2, summary: 'Heal 200% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.0 }] },
      { spiritCost: 2, cooldown: 2, summary: 'Heal 250% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.5 }] },
    ],
  },
  powerStrike: {
    sharedKind: 'powerStrike',
    icon: 'power',
    anim: 'charge',
    target: 'enemy',
    requires: [{ skillId: '{animal}.basicStrike', rank: 1 }],
    // Timed with Weaken: a target already weakened takes 40% extra here, so landing the two
    // in the right order matters more than just having both unlocked.
    ranks: [
      { spiritCost: 5, cooldown: 2, summary: 'Deal 160% Strength damage (224% against a weakened target).', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.6, bonusVsStatus: { status: 'weaken', multiplier: 1.4 } }] },
      { spiritCost: 5, cooldown: 2, summary: 'Deal 185% Strength damage (259% against a weakened target).', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.85, bonusVsStatus: { status: 'weaken', multiplier: 1.4 } }] },
      { spiritCost: 5, cooldown: 2, summary: 'Deal 210% Strength damage (294% against a weakened target).', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 2.1, bonusVsStatus: { status: 'weaken', multiplier: 1.4 } }] },
    ],
  },
  weaken: {
    sharedKind: 'weaken',
    icon: 'weaken',
    anim: 'venom',
    target: 'enemy',
    requiresAny: [
      [{ skillId: '{animal}.guardStance', rank: 1 }],
      [{ skillId: '{animal}.powerStrike', rank: 1 }],
    ],
    ranks: [
      { spiritCost: 6, cooldown: 3, summary: 'Deal 90% Strength damage and weaken the target 20% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.9 }, { kind: 'status', status: 'weaken', duration: 2, magnitude: 0.2, target: 'target' }] },
      { spiritCost: 6, cooldown: 3, summary: 'Deal 100% Strength damage and weaken the target 25% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }, { kind: 'status', status: 'weaken', duration: 2, magnitude: 0.25, target: 'target' }] },
      { spiritCost: 6, cooldown: 3, summary: 'Deal 110% Strength damage and weaken the target 30% for 3 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.1 }, { kind: 'status', status: 'weaken', duration: 3, magnitude: 0.3, target: 'target' }] },
    ],
  },
  rally: {
    sharedKind: 'rally',
    icon: 'rally',
    anim: 'cast',
    target: 'ally',
    requires: [{ skillId: '{animal}.secondWind', rank: 1 }],
    ranks: [
      { spiritCost: 7, cooldown: 3, summary: "Heal the ally 120% Instinct and cleanse their negative effects.", effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.2 }, { kind: 'cleanse' }] },
      { spiritCost: 7, cooldown: 3, summary: "Heal the ally 150% Instinct and cleanse their negative effects.", effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.5 }, { kind: 'cleanse' }] },
      { spiritCost: 7, cooldown: 3, summary: "Heal the ally 180% Instinct and cleanse their negative effects.", effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.8 }, { kind: 'cleanse' }] },
    ],
  },
};

export const SHARED_KINDS: SharedKind[] = [
  'basicStrike', 'guardStance', 'instinctSurge', 'secondWind', 'powerStrike', 'weaken', 'rally',
];
