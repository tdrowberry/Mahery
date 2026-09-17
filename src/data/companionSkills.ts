import type { CompanionSharedKind, CompanionSkillTemplate, RankDef } from './types';

// The companion's own move pool: one set of numbers reused by all 11 animals, same pattern as
// sharedSkills.ts, but a genuinely different kit, not a second copy of Mahery's - it leans
// support and healing, with real ally-targeted tools (a shield, a buff, a spirit share) Mahery's
// own kit doesn't have, and only two attacks instead of three. Animals only supply names and
// flavor (see animals.ts's companionSkillFlavor). Same linear-column shape as Mahery's tree
// (see sharedSkills.ts) - Nudge is the free root, then three independent columns, ending at a
// signature move once all three finish.

export const COMPANION_COLUMN_ATTACKS: CompanionSharedKind[] = ['bite', 'pounce'];
export const COMPANION_COLUMN_SUPPORT: CompanionSharedKind[] = ['nuzzle', 'shieldAlly', 'lick', 'share', 'calm'];
export const COMPANION_COLUMN_BUFFS: CompanionSharedKind[] = ['rallyCry', 'quicken', 'harry'];
export const COMPANION_SKILL_COLUMNS: CompanionSharedKind[][] = [
  COMPANION_COLUMN_ATTACKS, COMPANION_COLUMN_SUPPORT, COMPANION_COLUMN_BUFFS,
];
/** The last skill of each column - rank 1 of all three is what the companion's signature move
 * requires, same convergence pattern as Mahery's tree. */
export const COMPANION_FINISHERS: CompanionSharedKind[] = COMPANION_SKILL_COLUMNS.map((col) => col[col.length - 1]);

export const COMPANION_SHARED_KINDS: CompanionSharedKind[] = [
  'nudge', ...COMPANION_COLUMN_ATTACKS, ...COMPANION_COLUMN_SUPPORT, ...COMPANION_COLUMN_BUFFS,
];

/** Rank 1 of the previous skill in the same column, or Nudge for a column's first skill. The
 * '.companion.' infix is baked into the placeholder itself (unlike sharedSkills.ts's plain
 * '{animal}.kind') so engine/skills.ts's fillAnimal can fill it in with one plain substitution,
 * matching companionSkillId's own id shape exactly. */
function columnRequires(column: CompanionSharedKind[], index: number) {
  const prev = index === 0 ? 'nudge' : column[index - 1];
  return [{ skillId: `{animal}.companion.${prev}`, rank: 1 }];
}
const requiresOf = (kind: CompanionSharedKind): { skillId: string; rank: number }[] | undefined => {
  if (kind === 'nudge') return undefined;
  for (const column of COMPANION_SKILL_COLUMNS) {
    const i = column.indexOf(kind);
    if (i !== -1) return columnRequires(column, i);
  }
  return undefined;
};

export const COMPANION_SHARED_SKILLS: Record<CompanionSharedKind, CompanionSkillTemplate> = {
  nudge: {
    sharedKind: 'nudge',
    icon: 'slash',
    anim: 'strike',
    target: 'enemy',
    ranks: [
      { spiritCost: 0, cooldown: 0, summary: 'Deal 100% Strength damage.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }] },
      { spiritCost: 0, cooldown: 0, summary: 'Deal 125% Strength damage.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.25 }] },
      { spiritCost: 0, cooldown: 0, summary: 'Deal 150% Strength damage.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.5 }] },
    ],
  },
  bite: {
    sharedKind: 'bite',
    icon: 'power',
    anim: 'strike',
    target: 'enemy',
    requires: requiresOf('bite'),
    ranks: [
      { spiritCost: 6, cooldown: 2, summary: 'Deal 160% Strength damage.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.6 }] },
      { spiritCost: 6, cooldown: 2, summary: 'Deal 185% Strength damage.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.85 }] },
      { spiritCost: 6, cooldown: 2, summary: 'Deal 210% Strength damage.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 2.1 }] },
    ],
  },
  pounce: {
    sharedKind: 'pounce',
    icon: 'shadow',
    anim: 'charge',
    target: 'enemy',
    requires: requiresOf('pounce'),
    ranks: [
      { spiritCost: 7, cooldown: 3, summary: 'Deal 90% Strength damage and weaken the target 20% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.9 }, { kind: 'status', status: 'weaken', duration: 2, magnitude: 0.2, target: 'target' }] },
      { spiritCost: 7, cooldown: 3, summary: 'Deal 100% Strength damage and weaken the target 25% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.0 }, { kind: 'status', status: 'weaken', duration: 2, magnitude: 0.25, target: 'target' }] },
      { spiritCost: 7, cooldown: 3, summary: 'Deal 110% Strength damage and weaken the target 30% for 3 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1.1 }, { kind: 'status', status: 'weaken', duration: 3, magnitude: 0.3, target: 'target' }] },
    ],
  },
  nuzzle: {
    sharedKind: 'nuzzle',
    icon: 'heal',
    anim: 'cast',
    target: 'ally',
    requires: requiresOf('nuzzle'),
    ranks: [
      { spiritCost: 2, cooldown: 2, summary: 'Heal the ally 150% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.5 }] },
      { spiritCost: 2, cooldown: 2, summary: 'Heal the ally 200% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.0 }] },
      { spiritCost: 2, cooldown: 2, summary: 'Heal the ally 250% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.5 }] },
    ],
  },
  shieldAlly: {
    sharedKind: 'shieldAlly',
    icon: 'guardAlly',
    anim: 'cast',
    target: 'ally',
    requires: requiresOf('shieldAlly'),
    ranks: [
      { spiritCost: 6, cooldown: 3, summary: 'Gain the ally a shield of 200% Vitality for 2 turns.', effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 2, duration: 2 }] },
      { spiritCost: 6, cooldown: 3, summary: 'Gain the ally a shield of 300% Vitality for 2 turns.', effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 3, duration: 2 }] },
      { spiritCost: 6, cooldown: 3, summary: 'Gain the ally a shield of 400% Vitality for 2 turns.', effects: [{ kind: 'shield', scaling: 'vitality', multiplier: 4, duration: 2 }] },
    ],
  },
  lick: {
    sharedKind: 'lick',
    icon: 'heal',
    anim: 'cast',
    target: 'self',
    requires: requiresOf('lick'),
    ranks: [
      { spiritCost: 2, cooldown: 2, summary: 'Heal self 150% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 1.5 }] },
      { spiritCost: 2, cooldown: 2, summary: 'Heal self 200% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.0 }] },
      { spiritCost: 2, cooldown: 2, summary: 'Heal self 250% Instinct.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.5 }] },
    ],
  },
  share: {
    sharedKind: 'share',
    icon: 'wind',
    anim: 'cast',
    target: 'ally',
    requires: requiresOf('share'),
    ranks: [
      { spiritCost: 0, cooldown: 4, summary: 'Restore the ally 10 Spirit.', effects: [{ kind: 'restoreSpirit', amount: 10 }] },
      { spiritCost: 0, cooldown: 4, summary: 'Restore the ally 14 Spirit.', effects: [{ kind: 'restoreSpirit', amount: 14 }] },
      { spiritCost: 0, cooldown: 3, summary: 'Restore the ally 18 Spirit.', effects: [{ kind: 'restoreSpirit', amount: 18 }] },
    ],
  },
  calm: {
    sharedKind: 'calm',
    icon: 'blessing',
    anim: 'cast',
    target: 'ally',
    requires: requiresOf('calm'),
    ranks: [
      { spiritCost: 5, cooldown: 4, summary: 'Cleanse the ally of negative effects and heal 50% Instinct.', effects: [{ kind: 'cleanse' }, { kind: 'heal', scaling: 'instinct', multiplier: 0.5 }] },
      { spiritCost: 5, cooldown: 3, summary: 'Cleanse the ally of negative effects and heal 80% Instinct.', effects: [{ kind: 'cleanse' }, { kind: 'heal', scaling: 'instinct', multiplier: 0.8 }] },
      { spiritCost: 5, cooldown: 3, summary: 'Cleanse the ally of negative effects and heal 110% Instinct.', effects: [{ kind: 'cleanse' }, { kind: 'heal', scaling: 'instinct', multiplier: 1.1 }] },
    ],
  },
  rallyCry: {
    sharedKind: 'rallyCry',
    icon: 'roar',
    anim: 'cast',
    target: 'ally',
    requires: requiresOf('rallyCry'),
    ranks: [
      {
        spiritCost: 8, cooldown: 4, summary: "+20% Strength and Instinct for the ally, 3 turns.",
        effects: [
          { kind: 'status', status: 'strengthUp', duration: 3, magnitude: 0.2, target: 'target' },
          { kind: 'status', status: 'instinctUp', duration: 3, magnitude: 0.2, target: 'target' },
        ],
      },
      {
        spiritCost: 8, cooldown: 4, summary: "+30% Strength and Instinct for the ally, 3 turns.",
        effects: [
          { kind: 'status', status: 'strengthUp', duration: 3, magnitude: 0.3, target: 'target' },
          { kind: 'status', status: 'instinctUp', duration: 3, magnitude: 0.3, target: 'target' },
        ],
      },
      {
        spiritCost: 8, cooldown: 4, summary: "+40% Strength and Instinct for the ally, 3 turns.",
        effects: [
          { kind: 'status', status: 'strengthUp', duration: 3, magnitude: 0.4, target: 'target' },
          { kind: 'status', status: 'instinctUp', duration: 3, magnitude: 0.4, target: 'target' },
        ],
      },
    ],
  },
  quicken: {
    sharedKind: 'quicken',
    icon: 'wind',
    anim: 'cast',
    target: 'self',
    requires: requiresOf('quicken'),
    ranks: [
      { spiritCost: 6, cooldown: 4, summary: '+15% Speed for 3 turns.', effects: [{ kind: 'status', status: 'speedUp', duration: 3, magnitude: 0.15, target: 'self' }] },
      { spiritCost: 6, cooldown: 4, summary: '+20% Speed for 3 turns.', effects: [{ kind: 'status', status: 'speedUp', duration: 3, magnitude: 0.2, target: 'self' }] },
      { spiritCost: 6, cooldown: 4, summary: '+25% Speed for 3 turns.', effects: [{ kind: 'status', status: 'speedUp', duration: 3, magnitude: 0.25, target: 'self' }] },
    ],
  },
  harry: {
    sharedKind: 'harry',
    icon: 'weaken',
    anim: 'strike',
    target: 'enemy',
    requires: requiresOf('harry'),
    ranks: [
      { spiritCost: 6, cooldown: 3, summary: 'Deal 70% Strength damage and slow the target 20% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.7 }, { kind: 'status', status: 'speedDown', duration: 2, magnitude: 0.2, target: 'target' }] },
      { spiritCost: 6, cooldown: 3, summary: 'Deal 80% Strength damage and slow the target 25% for 2 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.8 }, { kind: 'status', status: 'speedDown', duration: 2, magnitude: 0.25, target: 'target' }] },
      { spiritCost: 6, cooldown: 3, summary: 'Deal 90% Strength damage and slow the target 30% for 3 turns.', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 0.9 }, { kind: 'status', status: 'speedDown', duration: 3, magnitude: 0.3, target: 'target' }] },
    ],
  },
};

/** The companion's signature move - templated (same numbers for every animal, only name/flavor
 * differ, see animals.ts's companionSignatureFlavor), unlike Mahery's bespoke-per-animal
 * uniqueSkill. A big combined "clutch save" on the ally: heal, cleanse, and a shield all in one,
 * capping off the support identity the rest of the kit builds toward. 5 ranks like Mahery's
 * signature, gated behind rank 1 of all three columns' last move (see COMPANION_FINISHERS). */
export const COMPANION_SIGNATURE_RANKS: [RankDef, RankDef, RankDef, RankDef, RankDef] = [
  { spiritCost: 10, cooldown: 5, summary: 'Heal the ally 200% Instinct, cleanse them, and grant a shield of 150% Vitality for 2 turns.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.0 }, { kind: 'cleanse' }, { kind: 'shield', scaling: 'vitality', multiplier: 1.5, duration: 2 }] },
  { spiritCost: 10, cooldown: 5, summary: 'Heal the ally 230% Instinct, cleanse them, and grant a shield of 180% Vitality for 2 turns.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.3 }, { kind: 'cleanse' }, { kind: 'shield', scaling: 'vitality', multiplier: 1.8, duration: 2 }] },
  { spiritCost: 10, cooldown: 5, summary: 'Heal the ally 260% Instinct, cleanse them, and grant a shield of 210% Vitality for 2 turns.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.6 }, { kind: 'cleanse' }, { kind: 'shield', scaling: 'vitality', multiplier: 2.1, duration: 2 }] },
  { spiritCost: 10, cooldown: 5, summary: 'Heal the ally 290% Instinct, cleanse them, and grant a shield of 240% Vitality for 2 turns.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 2.9 }, { kind: 'cleanse' }, { kind: 'shield', scaling: 'vitality', multiplier: 2.4, duration: 2 }] },
  { spiritCost: 10, cooldown: 5, summary: 'Heal the ally 320% Instinct, cleanse them, and grant a shield of 270% Vitality for 2 turns.', effects: [{ kind: 'heal', scaling: 'instinct', multiplier: 3.2 }, { kind: 'cleanse' }, { kind: 'shield', scaling: 'vitality', multiplier: 2.7, duration: 2 }] },
];
