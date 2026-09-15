import type { EnemyMove } from '../data/types';
import type { Rng } from './rng';
import { effectiveAttributes, type BattleState, type Unit, type UnitId } from './combat';
import { scaledValue } from './formulas';

const hasStatus = (u: Unit, id: string) => u.statuses.some((st) => st.id === id);

/** Rough, RNG-free estimate of a move's damage to one target - ignores crit/variance/guard so
 * it can't "see" luck in advance, just enough to tell a lethal-looking hit from a weak one. */
function estimatedDamage(enemy: Unit, move: EnemyMove, target: Unit): number {
  const attrs = effectiveAttributes(enemy);
  let total = 0;
  for (const e of move.effects) {
    if (e.kind !== 'damage') continue;
    let mult = e.multiplier;
    if (e.bonusVsStatus && hasStatus(target, e.bonusVsStatus.status)) mult *= e.bonusVsStatus.multiplier;
    total += scaledValue(attrs, e.scaling, mult);
  }
  return total;
}

/**
 * Enemy decision: filter moves by cost, cooldown, once-per-battle, and simple rules (checked
 * against the party member the enemy has already chosen to focus this turn). Two layers of
 * purpose on top of the base weighted-random pick: take an outright kill when one is on the
 * table, and let bosses lean on their strongest usable move most of the time instead of
 * spreading evenly across everything, so a boss's pattern reads as a real threat rather than
 * noise. Falls back to the first affordable move.
 */
export function chooseEnemyMove(s: BattleState, enemy: Unit, focusId: UnitId, rng: Rng): EnemyMove | null {
  const moves = enemy.moves ?? [];
  const focus = s.units[focusId];
  const usable = moves.filter((m) => {
    if ((enemy.cooldowns[m.id] ?? 0) > 0) return false;
    if (enemy.spirit < m.spiritCost) return false;
    const ai = m.ai;
    if (!ai) return true;
    if (ai.oncePerBattle && enemy.usedOnce[m.id]) return false;
    if (ai.healthBelowPct !== undefined && enemy.health / enemy.maxHealth >= ai.healthBelowPct) return false;
    if (ai.targetLacksStatus && focus && hasStatus(focus, ai.targetLacksStatus)) return false;
    return true;
  });
  if (usable.length === 0) return null; // nothing sensible to do: the enemy hesitates

  if (focus) {
    const finisher = usable.find((m) => m.target === 'enemy' && estimatedDamage(enemy, m, focus) >= focus.health);
    if (finisher) return finisher;
  }

  if (enemy.isBoss && rng.chance(0.55)) {
    return usable.reduce((best, m) => (m.weight > best.weight ? m : best), usable[0]);
  }

  const total = usable.reduce((sum, m) => sum + m.weight, 0);
  let roll = rng.next() * total;
  for (const m of usable) {
    roll -= m.weight;
    if (roll < 0) return m;
  }
  return usable[usable.length - 1];
}
