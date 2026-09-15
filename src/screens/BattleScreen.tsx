import { useEffect, useState } from 'react';
import { useGame } from '../state/gameStore';
import { getEncounter } from '../data/encounters';
import { CHAPTER_BACKGROUNDS } from '../data/backgrounds';
import type { ActiveSkill, Stance, StatusId } from '../data/types';
import {
  activeUnit, canSelect, needsTargetPick, otherPartyUnit, statusLabel, validTargets, type Unit,
} from '../engine/combat';
import { UnitSprite } from '../components/Sprite';
import { ActionBar } from '../components/ActionBar';
import { CombatLog } from '../components/CombatLog';

const ENEMY_STEP_MS = 700;
const BUFFS: StatusId[] = ['strengthUp', 'instinctUp', 'speedUp', 'resolve', 'standTogether', 'guard', 'airborne'];
const STANCES: { id: Stance; label: string; hint: string }[] = [
  { id: 'aggressive', label: 'Aggressive', hint: 'Always swings for the biggest hit it can afford.' },
  { id: 'balanced', label: 'Balanced', hint: 'Fights, but breaks off to heal or buff when it matters.' },
  { id: 'support', label: 'Support', hint: 'Leans on healing and defense, attacks when there is nothing better to do.' },
];

function HudRow({ unit, active, directing, align }: { unit: Unit; active?: boolean; directing?: boolean; align: 'left' | 'right' }) {
  const hp = Math.max(0, unit.health) / unit.maxHealth;
  const sp = unit.maxSpirit > 0 ? unit.spirit / unit.maxSpirit : 0;
  const shield = unit.statuses.find((s) => s.id === 'guard')?.magnitude ?? 0;
  return (
    <div className={`hud-row ${align} ${active ? 'active' : ''} ${unit.health <= 0 ? 'down' : ''}`} data-testid={`hud-${unit.id}`}>
      <div className="hud-bar hp">
        <div className="fill" style={{ width: `${hp * 100}%` }} />
        <span className="hud-name">{unit.name}{directing && <span className="dir-badge" title="You are directing this one">★</span>}</span>
        <span className="hud-num">{unit.health} <span className="max">{unit.maxHealth}</span>{shield > 0 && <span className="shield-num"> +{shield}</span>}</span>
      </div>
      <div className="hud-bar sp">
        <div className="fill" style={{ width: `${sp * 100}%` }} />
        <span className="hud-num">{unit.spirit} <span className="max">{unit.maxSpirit}</span></span>
      </div>
      <div className="hud-statuses">
        {unit.statuses.map((st) => (
          <span key={st.id} className={`chip ${BUFFS.includes(st.id) ? 'buff' : 'debuff'}`} title={`${statusLabel(st.id)}: ${st.remainingTurns} turn(s)`}>
            {statusLabel(st.id)}{st.id === 'guard' ? ` ${st.magnitude}` : ''} · {st.remainingTurns}
          </span>
        ))}
      </div>
    </div>
  );
}

export function BattleScreen() {
  const battle = useGame((s) => s.battle);
  const save = useGame((s) => s.save);
  const battleUseSkill = useGame((s) => s.battleUseSkill);
  const battleSelect = useGame((s) => s.battleSelect);
  const battleSetStance = useGame((s) => s.battleSetStance);
  const battleWait = useGame((s) => s.battleWait);
  const battleAdvance = useGame((s) => s.battleAdvance);
  const retryBattle = useGame((s) => s.retryBattle);
  const leaveBattle = useGame((s) => s.leaveBattle);
  const finishBattle = useGame((s) => s.finishBattle);
  const [armed, setArmed] = useState<ActiveSkill | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [showStance, setShowStance] = useState(false);

  // Enemy and auto-ally turns play out one beat at a time so the fight is readable.
  useEffect(() => {
    if (!battle || battle.phase !== 'enemyTurn') return;
    const t = setTimeout(() => battleAdvance(), ENEMY_STEP_MS);
    return () => clearTimeout(t);
  }, [battle, battleAdvance]);

  useEffect(() => { setArmed(null); }, [battle?.currentActor, battle?.round]);

  if (!battle) return null;
  const enc = getEncounter(battle.encounterId);
  const bg = CHAPTER_BACKGROUNDS[enc.chapter];
  const directed = activeUnit(battle); // who the player is currently giving orders to
  const other = otherPartyUnit(battle); // fights automatically per the ally stance
  const acting = battle.currentActor ? battle.units[battle.currentActor] : null;
  const enemies = battle.enemyIds.map((id) => battle.units[id]);
  const playerTurn = battle.phase === 'playerTurn';
  const selectProblem = canSelect(battle, other.id === 'mahery' ? 'mahery' : 'companion');
  const over = battle.phase === 'victory' || battle.phase === 'defeat';

  const pick = (skill: ActiveSkill) => {
    if (!playerTurn) return;
    if (needsTargetPick(skill)) {
      const targets = validTargets(battle, directed.id, skill.target);
      if (targets.length === 1) { battleUseSkill(skill.id, targets[0]); setArmed(null); return; }
      setArmed(armed?.id === skill.id ? null : skill);
      return;
    }
    battleUseSkill(skill.id);
    setArmed(null);
  };

  const clickEnemy = (id: string) => {
    if (!armed || !playerTurn) return;
    battleUseSkill(armed.id, id);
    setArmed(null);
  };

  const select = (unitId: 'mahery' | 'companion') => {
    if (unitId === battle.activeId) return;
    battleSelect(unitId);
  };

  return (
    <div className="game arena">
      {/* top HUD: party left, enemies right, round in the middle */}
      <div className="steel hud">
        <div className="hud-side">
          <HudRow unit={battle.units.mahery} active={battle.currentActor === 'mahery'} directing={battle.activeId === 'mahery'} align="left" />
          <HudRow unit={battle.units.companion} active={battle.currentActor === 'companion'} directing={battle.activeId === 'companion'} align="left" />
        </div>
        <div className="hud-mid">
          <div className="round-badge" title="Round">{battle.round}</div>
          <div className="hud-next">
            {playerTurn ? <span className="now">{directed.name}</span> : acting ? <span>{acting.name}</span> : <span>...</span>}
          </div>
        </div>
        <div className="hud-side right">
          {enemies.map((e) => <HudRow key={e.id} unit={e} active={battle.currentActor === e.id} align="right" />)}
        </div>
      </div>

      {/* battlefield */}
      <div className="field">
        <div
          className={`field-bg ${bg ? 'has-photo' : ''} ${bg?.tint ? `tint-${bg.tint}` : ''}`}
          style={bg ? { backgroundImage: `linear-gradient(rgba(10,8,6,0.35), rgba(10,8,6,0.55)), url(${bg.url})` } : undefined}
        />
        <div className="field-title">{enc.name}</div>
        {battle.banner && <div className="banner" data-testid="banner">{battle.banner}</div>}
        {armed && !battle.banner && <div className="banner hint-banner">Choose a target for {armed.name}.</div>}
        <div className="field-party">
          <div className={`party-slot ${battle.activeId === 'mahery' ? 'directing' : ''}`} onClick={() => select('mahery')} data-testid="select-mahery">
            <UnitSprite unit={battle.units.mahery} size={battle.activeId === 'mahery' ? 175 : 145} active={battle.currentActor === 'mahery'} label={null} necklace={save?.inventory.necklace} />
          </div>
          <div className={`party-slot ${battle.activeId === 'companion' ? 'directing' : ''}`} onClick={() => select('companion')} data-testid="select-companion">
            <UnitSprite unit={battle.units.companion} size={battle.activeId === 'companion' ? 175 : 145} active={battle.currentActor === 'companion'} label={null} delay={0.5} />
          </div>
        </div>
        <div className="field-enemies">
          {enemies.map((e, i) => (
            <div key={e.id} className="enemy-slot" data-testid={`enemy-${e.id}`}>
              <UnitSprite
                unit={e}
                size={enemies.length > 1 ? 150 : 180}
                active={battle.currentActor === e.id}
                targetable={!!armed && playerTurn}
                onClick={() => clickEnemy(e.id)}
                label={armed && playerTurn && e.health > 0 ? e.name : null}
                delay={0.4 * (i + 1)}
              />
            </div>
          ))}
        </div>

        {over && (
          <div className="overlay">
            <div className="box">
              <h2>{battle.phase === 'victory' ? 'Victory' : 'Defeat'}</h2>
              {battle.phase === 'victory' ? (
                <>
                  <div className="muted" style={{ marginBottom: 12 }}>{enc.xpReward} XP earned.</div>
                  <button className="btn btn-primary" onClick={finishBattle} data-testid="continue-btn">Continue</button>
                </>
              ) : (
                <div className="row" style={{ justifyContent: 'center' }}>
                  <button className="btn btn-primary" onClick={retryBattle}>Retry</button>
                  <button className="btn" onClick={leaveBattle}>Back to camp</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* bottom controls: teammate + stance, wait button, action bar for whoever you're directing */}
      <div className="controls">
        <div className="steel ctl-left">
          <button className="team-btn" disabled={!!selectProblem} onClick={() => select(other.id === 'mahery' ? 'mahery' : 'companion')} title={selectProblem ?? `Direct ${other.name} instead`} data-testid="select-other-btn">
            &lt; Direct {other.name} instead &gt;
          </button>
          <div className="team-meta">
            <span className="muted small">{other.name} · {other.health}/{other.maxHealth}</span>
            <button className="mini-btn" onClick={() => setShowStance((v) => !v)} title="Set this one's stance" data-testid="stance-toggle">⚙</button>
          </div>
          {showStance && (
            <div className="stance-row">
              {STANCES.map((st) => (
                <button
                  key={st.id}
                  className={`stance-btn ${battle.allyStance === st.id ? 'on' : ''}`}
                  onClick={() => battleSetStance(st.id)}
                  title={st.hint}
                  data-testid={`stance-${st.id}`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="steel ctl-center">
          <button className={`round-btn ${playerTurn ? 'on' : ''}`} disabled={!playerTurn} onClick={battleWait} title="Wait: end this turn without acting" data-testid="wait-btn">
            <span>◔</span>
          </button>
          <button className="mini-btn" onClick={() => setShowLog((v) => !v)} title="Combat log">{showLog ? '▾' : '▸'}</button>
          <button className="mini-btn danger" onClick={leaveBattle} title="Retreat to camp">✕</button>
        </div>
        <div className="steel ctl-right">
          <div className="ctl-actor">{directed.name} {playerTurn ? 'acts' : <span className="muted">waiting...</span>}</div>
          <ActionBar battle={battle} skills={directed.skills} armedSkillId={armed?.id ?? null} disabled={!playerTurn} onPick={pick} />
          <div className="error" data-testid="battle-error">{battle.lastError ?? ''}</div>
        </div>
      </div>

      {showLog && (
        <div className="steel log-panel">
          <CombatLog entries={battle.log} />
        </div>
      )}
    </div>
  );
}
