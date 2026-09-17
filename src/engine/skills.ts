import type { ActiveSkill, AnimalDef, CompanionSharedKind, RankDef, SharedKind, SkillDef } from '../data/types';
import { SHARED_KINDS, SHARED_SKILLS } from '../data/sharedSkills';
import { COMPANION_FINISHERS, COMPANION_SHARED_KINDS, COMPANION_SHARED_SKILLS, COMPANION_SIGNATURE_RANKS } from '../data/companionSkills';
import { STAND_TOGETHER } from '../data/companion';
import { MAX_RANK } from '../data/progression';

export const sharedSkillId = (animalId: string, kind: SharedKind) => `${animalId}.${kind}`;
export const companionSkillId = (animalId: string, kind: CompanionSharedKind) => `${animalId}.companion.${kind}`;
export const companionSignatureId = (animalId: string) => `${animalId}.companion.signature`;

const fillAnimal = (skillId: string, animalId: string) => skillId.replace('{animal}', animalId);

/** Build the animal's 12 skills: 11 shared (template + flavor) and 1 unique. */
export function getAnimalSkills(animal: AnimalDef): SkillDef[] {
  const shared = SHARED_KINDS.map<SkillDef>((kind) => {
    const t = SHARED_SKILLS[kind];
    const flavor = animal.sharedSkillFlavor[kind];
    return {
      id: sharedSkillId(animal.id, kind),
      name: flavor.name,
      flavor: flavor.flavor,
      icon: t.icon,
      anim: t.anim,
      kind: 'shared',
      sharedKind: kind,
      target: t.target,
      ranks: t.ranks,
      requires: t.requires?.map((r) => ({ ...r, skillId: fillAnimal(r.skillId, animal.id) })),
      minLevel: t.minLevel,
    };
  });
  return [...shared, animal.uniqueSkill];
}

export function findSkill(animal: AnimalDef, skillId: string): SkillDef | undefined {
  if (skillId === STAND_TOGETHER.id) return STAND_TOGETHER;
  return getAnimalSkills(animal).find((s) => s.id === skillId);
}

/** Build the companion's own 12 moves: 11 from its pool (template + flavor, see
 * data/companionSkills.ts) and 1 signature (templated numbers, per-animal name/flavor) - a
 * genuinely different, support/healing-leaning kit from Mahery's, not the same moves
 * independently leveled. */
export function getCompanionSkills(animal: AnimalDef): SkillDef[] {
  const shared = COMPANION_SHARED_KINDS.map<SkillDef>((kind) => {
    const t = COMPANION_SHARED_SKILLS[kind];
    const flavor = animal.companionSkillFlavor[kind];
    return {
      id: companionSkillId(animal.id, kind),
      name: flavor.name,
      flavor: flavor.flavor,
      icon: t.icon,
      anim: t.anim,
      kind: 'shared',
      sharedKind: kind,
      target: t.target,
      ranks: t.ranks,
      requires: t.requires?.map((r) => ({ ...r, skillId: fillAnimal(r.skillId, animal.id) })),
      minLevel: t.minLevel,
    };
  });
  const signature: SkillDef = {
    id: companionSignatureId(animal.id),
    name: animal.companionSignatureFlavor.name,
    flavor: animal.companionSignatureFlavor.flavor,
    icon: 'pack',
    anim: 'cast',
    kind: 'unique',
    maxRank: 5,
    target: 'ally',
    ranks: COMPANION_SIGNATURE_RANKS,
    requires: COMPANION_FINISHERS.map((kind) => ({ skillId: companionSkillId(animal.id, kind), rank: 1 })),
    minLevel: 2,
  };
  return [...shared, signature];
}

export function findCompanionSkill(animal: AnimalDef, skillId: string): SkillDef | undefined {
  return getCompanionSkills(animal).find((s) => s.id === skillId);
}

export function resolveSkill(def: SkillDef, rank: number): ActiveSkill {
  const r = Math.min(def.maxRank ?? MAX_RANK, Math.max(1, rank));
  const rd: RankDef = def.ranks[r - 1];
  return {
    id: def.id,
    name: def.name,
    icon: def.icon,
    anim: def.anim,
    target: def.target,
    spiritCost: rd.spiritCost,
    cooldown: rd.cooldown,
    effects: rd.effects,
    summary: rd.summary,
    rank: r,
  };
}

export interface UnlockCheck {
  ok: boolean;
  reason?: string;
  nextRank: number;
}

/** Can the next rank of this skill be bought right now? */
export function checkUnlock(
  def: SkillDef,
  skillRanks: Record<string, number>,
  level: number,
  abilityPoints: number,
  rankCost: number,
  allSkills: SkillDef[],
): UnlockCheck {
  const current = skillRanks[def.id] ?? 0;
  const nextRank = current + 1;
  const maxRank = def.maxRank ?? MAX_RANK;
  if (current >= maxRank) return { ok: false, reason: 'Already at max rank.', nextRank: current };
  if (abilityPoints < rankCost) return { ok: false, reason: 'Not enough Ability Points.', nextRank };
  if (def.minLevel && level < def.minLevel) return { ok: false, reason: `Requires level ${def.minLevel}.`, nextRank };
  const nameOf = (id: string) => allSkills.find((s) => s.id === id)?.name ?? id;
  const satisfied = (req: { skillId: string; rank: number }) => (skillRanks[req.skillId] ?? 0) >= req.rank;
  if (def.requires) {
    const missing = def.requires.find((r) => !satisfied(r));
    if (missing) return { ok: false, reason: `Requires ${nameOf(missing.skillId)} rank ${missing.rank}.`, nextRank };
  }
  return { ok: true, nextRank };
}

/** Mahery's equipped skills, resolved at current rank. Null slots stay null. */
export function resolveActionBar(
  animal: AnimalDef,
  actionBar: (string | null)[],
  skillRanks: Record<string, number>,
): (ActiveSkill | null)[] {
  return actionBar.map((id) => {
    if (!id) return null;
    const def = findSkill(animal, id);
    const rank = skillRanks[id] ?? 0;
    if (!def || rank < 1) return null;
    return resolveSkill(def, rank);
  });
}

/** The companion's own equipped moves (see getCompanionSkills), resolved at current rank. */
export function resolveCompanionActionBar(
  animal: AnimalDef,
  actionBar: (string | null)[],
  skillRanks: Record<string, number>,
): (ActiveSkill | null)[] {
  return actionBar.map((id) => {
    if (!id) return null;
    const def = findCompanionSkill(animal, id);
    const rank = skillRanks[id] ?? 0;
    if (!def || rank < 1) return null;
    return resolveSkill(def, rank);
  });
}

/**
 * Legacy/fallback companion kit: every shared skill Mahery has actually unlocked, at his rank in
 * it, plus Stand Together - unbounded by any 6-slot bar. Real play always gives the companion
 * its own independent action bar instead (see CompanionSetup in engine/combat.ts and
 * save.companion in state/saveFormat.ts); this only still runs when a caller doesn't pass one,
 * which today is just the test/simulation battles that don't care about companion-bar specifics.
 */
export function resolveCompanionSkills(animal: AnimalDef, skillRanks: Record<string, number>): ActiveSkill[] {
  const skills = getAnimalSkills(animal);
  const borrowed = SHARED_KINDS
    .map((kind) => skills.find((s) => s.sharedKind === kind)!)
    .filter((def) => (skillRanks[def.id] ?? 0) > 0)
    .map((def) => resolveSkill(def, skillRanks[def.id]));
  return [...borrowed, resolveSkill(STAND_TOGETHER, 1)];
}
