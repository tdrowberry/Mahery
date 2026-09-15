import type { ActiveSkill, AnimalDef, RankDef, SharedKind, SkillDef } from '../data/types';
import { SHARED_KINDS, SHARED_SKILLS } from '../data/sharedSkills';
import { STAND_TOGETHER } from '../data/companion';
import { MAX_RANK } from '../data/progression';

export const sharedSkillId = (animalId: string, kind: SharedKind) => `${animalId}.${kind}`;

const fillAnimal = (skillId: string, animalId: string) => skillId.replace('{animal}', animalId);

/** Build the animal's 5 skills: 4 shared (template + flavor) and 1 unique. */
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
      requiresAny: t.requiresAny?.map((g) => g.map((r) => ({ ...r, skillId: fillAnimal(r.skillId, animal.id) }))),
      minLevel: t.minLevel,
    };
  });
  return [...shared, animal.uniqueSkill];
}

export function findSkill(animal: AnimalDef, skillId: string): SkillDef | undefined {
  if (skillId === STAND_TOGETHER.id) return STAND_TOGETHER;
  return getAnimalSkills(animal).find((s) => s.id === skillId);
}

export function resolveSkill(def: SkillDef, rank: number): ActiveSkill {
  const r = Math.min(MAX_RANK, Math.max(1, rank));
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
  if (current >= MAX_RANK) return { ok: false, reason: 'Already at max rank.', nextRank: current };
  if (abilityPoints < rankCost) return { ok: false, reason: 'Not enough Ability Points.', nextRank };
  if (def.minLevel && level < def.minLevel) return { ok: false, reason: `Requires level ${def.minLevel}.`, nextRank };
  const nameOf = (id: string) => allSkills.find((s) => s.id === id)?.name ?? id;
  const satisfied = (req: { skillId: string; rank: number }) => (skillRanks[req.skillId] ?? 0) >= req.rank;
  if (def.requires) {
    const missing = def.requires.find((r) => !satisfied(r));
    if (missing) return { ok: false, reason: `Requires ${nameOf(missing.skillId)} rank ${missing.rank}.`, nextRank };
  }
  if (def.requiresAny && !def.requiresAny.some((group) => group.every(satisfied))) {
    const names = def.requiresAny.map((g) => g.map((r) => `${nameOf(r.skillId)} rank ${r.rank}`).join(' + ')).join(' or ');
    return { ok: false, reason: `Requires ${names}.`, nextRank };
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

/**
 * The companion's kit: every shared skill Mahery has actually unlocked, at his rank in it
 * (the bond means the companion already knows the same moves), plus Stand Together. No
 * separate action bar to manage - whichever of these it needs, it can use, whether the
 * player is directing it or it's fighting on its own per the current ally stance.
 */
export function resolveCompanionSkills(animal: AnimalDef, skillRanks: Record<string, number>): ActiveSkill[] {
  const skills = getAnimalSkills(animal);
  const borrowed = SHARED_KINDS
    .map((kind) => skills.find((s) => s.sharedKind === kind)!)
    .filter((def) => (skillRanks[def.id] ?? 0) > 0)
    .map((def) => resolveSkill(def, skillRanks[def.id]));
  return [...borrowed, resolveSkill(STAND_TOGETHER, 1)];
}
