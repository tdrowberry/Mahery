import type { ActiveSkill, Stance } from '../data/types';
import type { Rng } from './rng';
import { aliveEnemies, checkSkillUsable, isAlive, type BattleState, type Unit, type UnitId } from './combat';

// The party member you are not directly controlling still fights every round. This picks its
// move automatically, per the stance you set: aggressive always swings for damage, support
// leans on healing and defense, balanced mixes the two like a sensible fighter would.

export interface AllyChoice { skill: ActiveSkill; targetId: UnitId }

const isHeal = (sk: ActiveSkill) => sk.effects.some((e) => e.kind === 'heal' || e.kind === 'shield');
const isSelfBuff = (sk: ActiveSkill) => sk.target === 'self' && !isHeal(sk);
const isOffense = (sk: ActiveSkill) => sk.target === 'enemy' || sk.target === 'allEnemies';
const isAllySupport = (sk: ActiveSkill) => sk.target === 'ally';

function pick(rng: Rng, list: ActiveSkill[]): ActiveSkill | null {
  return list.length ? list[rng.int(0, list.length - 1)] : null;
}

/** Rough "how strong is this" proxy so aggressive/balanced favor the biggest hit they can afford. */
const power = (sk: ActiveSkill) => sk.spiritCost + sk.rank * 2;

export function chooseAllyMove(s: BattleState, unit: Unit, stance: Stance, rng: Rng): AllyChoice | null {
  const skills = unit.skills.filter((sk): sk is ActiveSkill => !!sk);
  const usable = skills.filter((sk) => !checkSkillUsable(s, unit.id, sk));
  if (usable.length === 0) return null;
  if (aliveEnemies(s).length === 0) return null;

  const allyId: UnitId = unit.id === 'mahery' ? 'companion' : 'mahery';
  const ally = s.units[allyId];
  const allyHurt = isAlive(ally) && ally.health / ally.maxHealth < 0.5;
  const selfHurt = unit.health / unit.maxHealth < 0.45;

  const heals = usable.filter(isHeal);
  const support = usable.filter(isAllySupport);
  const buffs = usable.filter(isSelfBuff);
  const attacks = usable.filter(isOffense);

  let chosen: ActiveSkill | null = null;
  if (stance === 'support') {
    if (selfHurt) chosen = pick(rng, heals);
    if (!chosen && allyHurt) chosen = pick(rng, support.length ? support : heals);
    if (!chosen && rng.chance(0.4)) chosen = pick(rng, buffs);
    if (!chosen && rng.chance(0.3)) chosen = pick(rng, support);
  } else if (stance === 'aggressive') {
    if (attacks.length) chosen = attacks.reduce((best, sk) => (power(sk) > power(best) ? sk : best), attacks[0]);
  } else {
    // balanced: patch yourself or your ally up when it matters, otherwise fight, with an
    // occasional buff so Instinct Surge and its kin actually see use.
    if (selfHurt && heals.length && rng.chance(0.7)) chosen = pick(rng, heals);
    if (!chosen && allyHurt && (support.length || heals.length) && rng.chance(0.5)) chosen = pick(rng, support.length ? support : heals);
    if (!chosen && rng.chance(0.2)) chosen = pick(rng, buffs);
  }
  if (!chosen) chosen = pick(rng, attacks) ?? usable[0];

  let targetId: UnitId = unit.id;
  if (chosen.target === 'enemy' || chosen.target === 'allEnemies') {
    const enemies = aliveEnemies(s);
    // finish off whatever is weakest, matching a sensible teammate's judgment
    targetId = enemies.slice().sort((a, b) => a.health - b.health)[0].id;
  } else if (chosen.target === 'ally') {
    targetId = allyId;
  }
  return { skill: chosen, targetId };
}
