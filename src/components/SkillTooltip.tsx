import type { ActiveSkill, SkillDef } from '../data/types';
import { MAX_RANK } from '../data/progression';

const TARGET_TEXT: Record<SkillDef['target'], string> = {
  enemy: 'one enemy',
  allEnemies: 'all enemies',
  self: 'self',
  ally: 'ally',
};

const costLine = (cost: number, cd: number) =>
  `${cost === 0 ? 'This move costs nothing.' : `Costs ${cost} Spirit.`}${cd ? ` (CD: ${cd})` : ''}`;

/** Sonny 2 style tooltip: header, cost line, current tier text, and a preview of the next tier. */
export function SkillTooltip({ def, rank, active, note }: { def?: SkillDef; rank: number; active?: ActiveSkill; note?: string }) {
  const name = def?.name ?? active?.name ?? '';
  const current = def ? (rank > 0 ? def.ranks[rank - 1] : null) : active ?? null;
  const next = def && rank < MAX_RANK ? def.ranks[rank] : null;
  const target = def?.target ?? active?.target ?? 'self';
  return (
    <div className="tooltip">
      <div className="t-head">({rank}/{MAX_RANK}) {name}</div>
      <div className="t-cost">{current ? costLine(current.spiritCost, current.cooldown) : 'You have no points in this ability yet.'}</div>
      {def?.flavor && <div className="t-flavor">{def.flavor}</div>}
      {current && <div className="t-body">{current.summary} <span className="muted">Target: {TARGET_TEXT[target]}.</span></div>}
      {note && <div className="t-note">{note}</div>}
      {next && (
        <div className="t-next">
          Next Tier (Lvl. {rank + 1}): {next.summary} {next.spiritCost !== current?.spiritCost || next.cooldown !== current?.cooldown ? costLine(next.spiritCost, next.cooldown) : ''}
        </div>
      )}
    </div>
  );
}
