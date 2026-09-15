import { useState } from 'react';
import type { ActiveSkill } from '../data/types';
import type { BattleState } from '../engine/combat';
import { checkSkillUsable } from '../engine/combat';
import { ACTION_BAR_SLOTS } from '../data/progression';
import { SkillIcon } from './Icon';
import { SkillTooltip } from './SkillTooltip';

interface Props {
  battle: BattleState;
  skills: (ActiveSkill | null)[];
  armedSkillId: string | null;
  disabled: boolean;
  onPick: (skill: ActiveSkill) => void;
}

/** The combat action bar: a row of circular skill slots, Sonny 2 style. */
export function ActionBar({ battle, skills, armedSkillId, disabled, onPick }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const caster = battle.units[battle.activeId];
  const slots = [...skills];
  while (slots.length < ACTION_BAR_SLOTS) slots.push(null);
  return (
    <div className="skill-slots">
      {slots.slice(0, ACTION_BAR_SLOTS).map((skill, i) => {
        if (!skill) return <div key={i} className="slot empty" title={`Empty slot ${i + 1}`} />;
        const problem = checkSkillUsable(battle, caster.id, skill);
        const cd = caster.cooldowns[skill.id] ?? 0;
        const blocked = disabled || !!problem;
        return (
          <div key={skill.id} className="slot-wrap" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <button
              className={`slot ${armedSkillId === skill.id ? 'armed' : ''} ${blocked ? 'blocked' : ''}`}
              disabled={disabled}
              onClick={() => onPick(skill)}
              data-testid={`skill-${skill.id}`}
              aria-label={skill.name}
            >
              <SkillIcon icon={skill.icon} color={caster.color} size={46} dim={blocked} />
              {cd > 0 && <span className="slot-cd">{cd}</span>}
              {cd === 0 && problem && <span className="slot-x">✕</span>}
            </button>
            {hover === i && <SkillTooltip rank={skill.rank} active={skill} note={problem ?? undefined} />}
          </div>
        );
      })}
    </div>
  );
}
