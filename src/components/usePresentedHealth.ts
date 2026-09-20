import { useEffect, useState } from 'react';
import type { Unit } from '../engine/combat';

type Hit = NonNullable<Unit['lastHit']>;

/** What a unit had before `hit` landed. Only needed when a fight opens with a hit already
 * resolved but not yet shown - the opening enemy beats play out in the engine before the player's
 * first turn (see beginBattle) - so there's no earlier value to keep showing. A killing blow can
 * overshoot (its amount may exceed what was left), hence the cap at max health. */
function healthBefore(health: number, maxHealth: number, hit: Hit): number {
  if (hit.kind === 'damage' || hit.kind === 'crit' || hit.kind === 'poison') return Math.min(maxHealth, health + hit.amount);
  if (hit.kind === 'heal') return Math.max(0, health - hit.amount);
  return health;
}

/** The health (and shield) a unit should be SHOWN at. The engine resolves an action the instant
 * it's chosen, so `health` already holds the post-hit value while the attacker is still hopping
 * across the field - showing that straight away runs the bar (and the collapse) ahead of the hit
 * it belongs to. When a fresh hit arrives with a delay, this keeps showing the previous value and
 * swaps in the new one when the hit lands: the same moment the slash marks and damage number
 * appear (see `hitDelayMs` in UnitSprite). Anything else - heals, poison ticks, a value that
 * changed with no hit behind it - is shown at once.
 *
 * Which hit has been shown is kept in state (not a ref) so the effect is safe to run twice, and it
 * is keyed on the hit and the values alone, never on the delay: BattleScreen recomputes each
 * unit's delay whenever ANY unit acts, so it is only read when a new hit shows up. */
export function usePresentedHealth(
  unit: Pick<Unit, 'health' | 'maxHealth' | 'lastHit'>,
  shield: number,
  hitDelayMs: number | undefined,
): { health: number; shield: number } {
  const { health, maxHealth, lastHit: hit } = unit;
  const delay = hitDelayMs ?? 0;
  const [shown, setShown] = useState<{ health: number; shield: number; seq: number | undefined }>(() => (
    hit && delay > 0
      ? { health: healthBefore(health, maxHealth, hit), shield, seq: undefined }
      : { health, shield, seq: hit?.seq }
  ));
  useEffect(() => {
    const next = { health, shield, seq: hit?.seq };
    const waiting = !!hit && delay > 0 && (hit.seq !== shown.seq || health !== shown.health || shield !== shown.shield);
    if (!waiting) {
      setShown((prev) => (prev.health === next.health && prev.shield === next.shield && prev.seq === next.seq ? prev : next));
      return;
    }
    const timer = setTimeout(() => setShown(next), delay);
    return () => clearTimeout(timer);
  }, [health, shield, hit?.seq]);
  return shown;
}
