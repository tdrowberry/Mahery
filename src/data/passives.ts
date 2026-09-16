// Passive perks: permanent, always-on bonuses that never take an action-bar slot, so investing
// in them never costs you a damage skill's spot. One choice point sits at the end of each of the
// three skill-tree columns (see sharedSkills.ts's COLUMN_FINISHERS) - finishing a branch lets you
// pick ONE of two passives from it, permanently. This is the build-defining choice the strict
// linear columns deliberately don't have anywhere else: everyone in a given branch learns the
// same skills in the same order, but not everyone finishes the branches in the same order or
// picks the same three passives, and a respec (see progression.ts) clears these too so they can
// be re-picked.

export type PassiveEffect =
  | { kind: 'maxHealthPct'; pct: number }
  | { kind: 'spiritCostReduction'; pct: number }
  | { kind: 'critChanceBonus'; pct: number }
  | { kind: 'damageReductionPct'; pct: number }
  | { kind: 'evasionBonus'; pct: number }
  | { kind: 'spiritRegenBonus'; amount: number };

export interface PassiveDef {
  id: string;
  name: string;
  flavor: string;
  effect: PassiveEffect;
}

export interface PassiveChoicePoint {
  id: string;
  /** the shared skill whose rank 1 unlocks this choice */
  afterSkill: string;
  options: [PassiveDef, PassiveDef];
}

export const PASSIVE_CHOICE_POINTS: PassiveChoicePoint[] = [
  {
    id: 'tier1',
    afterSkill: 'powerStrike',
    options: [
      {
        id: 'ironHide', name: 'Iron Hide',
        flavor: 'The hide toughens with everything it survives. +8% max Health, always.',
        effect: { kind: 'maxHealthPct', pct: 0.08 },
      },
      {
        id: 'quickBreath', name: 'Quick Breath',
        flavor: 'Every move costs a little less breath than it used to. -15% Spirit costs, always.',
        effect: { kind: 'spiritCostReduction', pct: 0.15 },
      },
    ],
  },
  {
    id: 'tier2',
    afterSkill: 'hamstring',
    options: [
      {
        id: 'huntersEdge', name: "Hunter's Edge",
        flavor: 'An instinct for the opening that is about to appear. +8% critical chance, always.',
        effect: { kind: 'critChanceBonus', pct: 0.08 },
      },
      {
        id: 'thickScales', name: 'Thick Scales',
        flavor: 'Old wounds left something behind that keeps new ones shallower. -6% damage taken, always.',
        effect: { kind: 'damageReductionPct', pct: 0.06 },
      },
    ],
  },
  {
    id: 'tier3',
    afterSkill: 'rally',
    options: [
      {
        id: 'lightFoot', name: 'Light Foot',
        flavor: 'Weight distributed like it never learned to commit to a step. +8% evasion, always.',
        effect: { kind: 'evasionBonus', pct: 0.08 },
      },
      {
        id: 'deepWell', name: 'Deep Well',
        flavor: 'There is always a little more left than there should be. +2 Spirit regen per turn, always.',
        effect: { kind: 'spiritRegenBonus', amount: 2 },
      },
    ],
  },
];

export function getPassive(id: string): PassiveDef | undefined {
  for (const point of PASSIVE_CHOICE_POINTS) {
    for (const opt of point.options) if (opt.id === id) return opt;
  }
  return undefined;
}

/** Which choice points are unlocked (rank 1+ in their gating skill) but not yet picked. */
export function pendingChoicePoints(
  animalId: string, skillRanks: Record<string, number>, chosen: string[],
): PassiveChoicePoint[] {
  const chosenPointIds = new Set(chosen.map((id) => getPassive(id) && PASSIVE_CHOICE_POINTS.find((p) => p.options.some((o) => o.id === id))?.id).filter(Boolean));
  return PASSIVE_CHOICE_POINTS.filter((p) => {
    if (chosenPointIds.has(p.id)) return false;
    return (skillRanks[`${animalId}.${p.afterSkill}`] ?? 0) > 0;
  });
}

export interface PassiveBonuses {
  maxHealthPct: number;
  spiritCostReduction: number;
  critChanceBonus: number;
  damageReductionPct: number;
  evasionBonus: number;
  spiritRegenBonus: number;
}

export function passiveBonuses(chosen: string[]): PassiveBonuses {
  const out: PassiveBonuses = {
    maxHealthPct: 0, spiritCostReduction: 0, critChanceBonus: 0,
    damageReductionPct: 0, evasionBonus: 0, spiritRegenBonus: 0,
  };
  for (const id of chosen) {
    const def = getPassive(id);
    if (!def) continue;
    switch (def.effect.kind) {
      case 'maxHealthPct': out.maxHealthPct += def.effect.pct; break;
      case 'spiritCostReduction': out.spiritCostReduction += def.effect.pct; break;
      case 'critChanceBonus': out.critChanceBonus += def.effect.pct; break;
      case 'damageReductionPct': out.damageReductionPct += def.effect.pct; break;
      case 'evasionBonus': out.evasionBonus += def.effect.pct; break;
      case 'spiritRegenBonus': out.spiritRegenBonus += def.effect.amount; break;
    }
  }
  return out;
}
