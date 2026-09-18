import { useEffect, useRef, useState } from 'react';
import { resolveEncounter, useGame } from '../state/gameStore';
import { CHAPTER_BACKGROUNDS } from '../data/backgrounds';
import type { ActiveSkill, Stance, StatusId } from '../data/types';
import {
  activeUnit, canSelect, needsTargetPick, otherPartyUnit, statusLabel, validTargets, type Unit,
} from '../engine/combat';
import { UnitSprite, attackTimingFor } from '../components/Sprite';
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
  const roamingEncounter = useGame((s) => s.roamingEncounter);
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
  // Each party/enemy slot registers its own DOM node here so an attacking unit's sprite can
  // measure the real on-screen distance to its target and travel there, rather than lunging a
  // fixed amount in place. Slots are stable for the whole battle (nothing re-mounts them turn
  // to turn), so reading a rect from a previous commit here is always still valid.
  const slotRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const setSlotRef = (id: string) => (el: HTMLDivElement | null) => { slotRefs.current[id] = el; };

  // Enemy and auto-ally turns play out one beat at a time so the fight is readable.
  useEffect(() => {
    if (!battle || battle.phase !== 'enemyTurn') return;
    const t = setTimeout(() => battleAdvance(), ENEMY_STEP_MS);
    return () => clearTimeout(t);
  }, [battle, battleAdvance]);

  useEffect(() => { setArmed(null); }, [battle?.currentActor, battle?.round]);

  if (!battle) return null;
  const enc = resolveEncounter(roamingEncounter, battle.encounterId);
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

  // How far (in px) this unit's own last action should travel toward its target before playing
  // the attack and coming back - undefined for moves with no target (self-buffs, aoe) or before
  // both slots have measurable positions.
  const travelXFor = (unit: Unit): number | undefined => {
    const targetId = unit.lastAction?.targetId;
    if (!targetId) return undefined;
    const from = slotRefs.current[unit.id];
    const to = slotRefs.current[targetId];
    if (!from || !to) return undefined;
    const a = from.getBoundingClientRect();
    const b = to.getBoundingClientRect();
    const dx = (b.left + b.width / 2) - (a.left + a.width / 2);
    const STOP_SHORT_PX = 90; // leave a gap so attacker and target don't fully overlap at full reach
    return Math.max(0, Math.abs(dx) - STOP_SHORT_PX);
  };

  // The most recently resolved action across the whole battle - whoever's lastAction.seq matches
  // this is the one currently in motion, so a target only picks up a hit-delay from an attack
  // that's genuinely still in flight toward it, not some earlier turn's stale lastAction.
  const latestActionSeq = Math.max(0, ...Object.values(battle.units).map((u) => u.lastAction?.seq ?? 0));

  // How long this unit should hold its hit reaction (flinch/impact flash/floating number) before
  // showing it, timed to when whichever attacker is currently traveling toward it actually
  // arrives - see attackTimingFor. 0 when nothing is currently attacking this unit (heals,
  // poison ticks, and other hits with no in-flight attacker stay instant).
  const hitDelayFor = (target: Unit): number => {
    const attacker = Object.values(battle.units).find((u) => (
      u.lastAction?.targetId === target.id && u.lastAction.seq === latestActionSeq
    ));
    if (!attacker) return 0;
    return attackTimingFor(attacker, travelXFor(attacker))?.impactMs ?? 0;
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
          <div ref={setSlotRef('mahery')} className={`party-slot ${battle.activeId === 'mahery' ? 'directing' : ''}`} onClick={() => select('mahery')} data-testid="select-mahery">
            <UnitSprite unit={battle.units.mahery} size={battle.activeId === 'mahery' ? 175 : 145} active={battle.currentActor === 'mahery'} label={null} travelX={travelXFor(battle.units.mahery)} hitDelayMs={hitDelayFor(battle.units.mahery)} />
          </div>
          <div ref={setSlotRef('companion')} className={`party-slot ${battle.activeId === 'companion' ? 'directing' : ''}`} onClick={() => select('companion')} data-testid="select-companion">
            <UnitSprite unit={battle.units.companion} size={battle.activeId === 'companion' ? 175 : 145} active={battle.currentActor === 'companion'} label={null} delay={0.5} travelX={travelXFor(battle.units.companion)} hitDelayMs={hitDelayFor(battle.units.companion)} />
          </div>
        </div>
        <div className="field-enemies">
          {enemies.map((e, i) => (
            <div key={e.id} ref={setSlotRef(e.id)} className="enemy-slot" data-testid={`enemy-${e.id}`}>
              <UnitSprite
                unit={e}
                size={enemies.length > 1 ? 150 : 180}
                active={battle.currentActor === e.id}
                targetable={!!armed && playerTurn}
                onClick={() => clickEnemy(e.id)}
                label={armed && playerTurn && e.health > 0 ? e.name : null}
                delay={0.4 * (i + 1)}
                travelX={travelXFor(e)}
                hitDelayMs={hitDelayFor(e)}
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
          </div>
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
