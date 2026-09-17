import { useState, type DragEvent, type ReactNode } from 'react';
import { useGame } from '../state/gameStore';
import { getAnimal } from '../data/animals';
import { ACTION_BAR_SLOTS, MAX_RANK, RANK_COST, respecCost } from '../data/progression';
import type { AnimalDef, Attributes, SkillDef } from '../data/types';
import { checkUnlock, getAnimalSkills, getCompanionSkills } from '../engine/skills';
import { maxHealth, maxSpirit } from '../engine/formulas';
import { getPassive, pendingChoicePoints } from '../data/passives';
import { SkillIcon } from '../components/Icon';
import { SkillTooltip } from '../components/SkillTooltip';
import { MenuStrip } from '../components/MenuStrip';

/** A skill's own rank ceiling if it set one (signature skills go to 5), else the shared default. */
const maxRankOf = (def: SkillDef) => def.maxRank ?? MAX_RANK;

const ATTRS: { key: keyof Attributes; label: string; color: string; note: string }[] = [
  { key: 'vitality', label: 'Vitality', color: '#7fbf6a', note: '+5 max Health' },
  { key: 'strength', label: 'Strength', color: '#e06b5c', note: 'Physical damage' },
  { key: 'instinct', label: 'Instinct', color: '#b28ae0', note: '+3 Spirit, healing, effects' },
  { key: 'speed', label: 'Speed', color: '#e8c15a', note: 'Turn order, crit, evasion' },
];

/** A same-column link is a straight vertical drop; a root fan-out or signature convergence link
 * (different x) bends once through the horizontal midpoint instead of cutting a diagonal. */
const linkPath = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  if (a.x === b.x) return `M${a.x},${a.y} L${b.x},${b.y}`;
  const midY = (a.y + b.y) / 2;
  return `M${a.x},${a.y} L${a.x},${midY} L${b.x},${midY} L${b.x},${b.y}`;
};

// Basic Strike is the root at the top; three independent columns (see sharedSkills.ts's
// COLUMN_ATTACKS/COLUMN_SUPPORT/COLUMN_BUFFS) flow straight down from it, one skill per row, and
// the signature skill sits below all three once every column's last skill is rank 1. Every link
// is rendered as an orthogonal (horizontal-then-vertical) elbow via linkPath, so even the root's
// fan-out and the signature's convergence never draw a diagonal line.
const MAHERY_TREE_POS: Record<string, { x: number; y: number }> = {
  basicStrike: { x: 150, y: 30 },
  // Attacks (left)
  weaken: { x: 50, y: 130 },
  rendingClaw: { x: 50, y: 230 },
  powerStrike: { x: 50, y: 330 },
  // Healing / Block (center) - the longest column, four skills deep
  guardStance: { x: 150, y: 130 },
  secondWind: { x: 150, y: 230 },
  secondBreath: { x: 150, y: 330 },
  rally: { x: 150, y: 430 },
  // Buffs / Debuffs (right)
  instinctSurge: { x: 250, y: 130 },
  quickStrike: { x: 250, y: 230 },
  hamstring: { x: 250, y: 330 },
  unique: { x: 150, y: 530 },
};
const MAHERY_TREE_LINKS: [string, string][] = [
  ['basicStrike', 'weaken'], ['weaken', 'rendingClaw'], ['rendingClaw', 'powerStrike'], ['powerStrike', 'unique'],
  ['basicStrike', 'guardStance'], ['guardStance', 'secondWind'], ['secondWind', 'secondBreath'], ['secondBreath', 'rally'], ['rally', 'unique'],
  ['basicStrike', 'instinctSurge'], ['instinctSurge', 'quickStrike'], ['quickStrike', 'hamstring'], ['hamstring', 'unique'],
];
const MAHERY_TREE_HEIGHT = 560;

// Nudge is the root; the companion's three columns are a different shape from Mahery's (see
// companionSkills.ts) - only 2 Attacks, but 5 Support/Healing (the column the whole kit leans
// on) and 3 Buffs/Debuffs, so Support runs two rows deeper than Mahery's longest column and the
// signature sits lower to match.
const COMPANION_TREE_POS: Record<string, { x: number; y: number }> = {
  nudge: { x: 150, y: 30 },
  // Attacks (left) - just 2, the smallest column on purpose
  bite: { x: 50, y: 130 },
  pounce: { x: 50, y: 230 },
  // Support / Healing (center) - the dominant column, 5 deep
  nuzzle: { x: 150, y: 130 },
  shieldAlly: { x: 150, y: 230 },
  lick: { x: 150, y: 330 },
  share: { x: 150, y: 430 },
  calm: { x: 150, y: 530 },
  // Buffs / Debuffs (right)
  rallyCry: { x: 250, y: 130 },
  quicken: { x: 250, y: 230 },
  harry: { x: 250, y: 330 },
  // keyed 'unique' (not 'signature') to match AbilityTreePanel's keyOf fallback, same as
  // Mahery's tree's capstone - both trees' SkillDefs land on kind:'unique' with no sharedKind.
  unique: { x: 150, y: 630 },
};
const COMPANION_TREE_LINKS: [string, string][] = [
  ['nudge', 'bite'], ['bite', 'pounce'], ['pounce', 'unique'],
  ['nudge', 'nuzzle'], ['nuzzle', 'shieldAlly'], ['shieldAlly', 'lick'], ['lick', 'share'], ['share', 'calm'], ['calm', 'unique'],
  ['nudge', 'rallyCry'], ['rallyCry', 'quicken'], ['quicken', 'harry'], ['harry', 'unique'],
];
const COMPANION_TREE_HEIGHT = 660;

export function SkillScreen() {
  const save = useGame((s) => s.save);
  const unlockSkill = useGame((s) => s.unlockSkill);
  const spendAttribute = useGame((s) => s.spendAttribute);
  const setActionBarSlot = useGame((s) => s.setActionBarSlot);
  const resetSkillTree = useGame((s) => s.resetSkillTree);
  const choosePassive = useGame((s) => s.choosePassive);
  const unlockCompanionSkill = useGame((s) => s.unlockCompanionSkill);
  const setCompanionActionBarSlot = useGame((s) => s.setCompanionActionBarSlot);
  const resetCompanionSkillTree = useGame((s) => s.resetCompanionSkillTree);
  const [tab, setTab] = useState<'mahery' | 'companion'>('mahery');
  if (!save) return null;

  const animal = getAnimal(save.animalId);
  const skills = getAnimalSkills(animal);
  const companionSkills = getCompanionSkills(animal);
  const m = save.mahery;
  const c = save.companion;
  const pendingPassive = pendingChoicePoints(save.animalId, m.skillRanks, m.passives)[0] ?? null;
  const onPickPassive = (passiveId: string) => {
    if (pendingPassive) choosePassive(pendingPassive.id, passiveId);
  };

  return (
    <div className="game">
      {pendingPassive && (
        <div className="steel passive-picker">
          <div className="ab-title">Choose a Passive Perk</div>
          <div className="muted small" style={{ marginBottom: 8 }}>
            Permanent, always in effect, never takes an action-bar slot. Pick one - a respec lets
            you re-pick later, but not swap freely otherwise.
          </div>
          <div className="passive-options">
            {pendingPassive.options.map((opt) => (
              <button key={opt.id} className="passive-option" onClick={() => onPickPassive(opt.id)} data-testid={`passive-${opt.id}`}>
                <div className="sel-name">{opt.name}</div>
                <div className="muted small">{opt.flavor}</div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="ab-tabs">
        <button className={`ab-tab ${tab === 'mahery' ? 'on' : ''}`} onClick={() => setTab('mahery')} data-testid="tab-mahery">
          Mahery
        </button>
        <button className={`ab-tab ${tab === 'companion' ? 'on' : ''}`} onClick={() => setTab('companion')} data-testid="tab-companion">
          {animal.name} Companion
        </button>
      </div>
      {tab === 'mahery' ? (
        <AbilityTreePanel
          key="mahery"
          animal={animal}
          skills={skills}
          treePos={MAHERY_TREE_POS}
          treeLinks={MAHERY_TREE_LINKS}
          treeHeight={MAHERY_TREE_HEIGHT}
          charName="Mahery"
          charClass={`Lvl. ${m.level} ${animal.name}-bonded`}
          level={m.level}
          abilityPoints={m.abilityPoints}
          ranks={m.skillRanks}
          actionBar={m.actionBar}
          onUnlock={unlockSkill}
          onSetBarSlot={setActionBarSlot}
          extraCharInfo={<div className="char-points"><span>Attribute Points:</span><b>{m.attributePoints}</b></div>}
          sidePanels={
            <>
              <div className="steel ab-panel attr-panel">
                <div className="ab-title">Your Attributes</div>
                {ATTRS.map((a) => (
                  <div className="attr-line" key={a.key}>
                    <button className="attr-plus" style={{ background: a.color }} disabled={m.attributePoints <= 0} onClick={() => spendAttribute(a.key)} data-testid={`attr-${a.key}`}>+</button>
                    <span className="attr-name" style={{ color: a.color }}>{a.label}:</span>
                    <span className="attr-note muted small">{a.note}</span>
                    <span className="attr-val">{m.attributes[a.key]}</span>
                  </div>
                ))}
                <div className="muted small" style={{ marginTop: 6 }}>Health {maxHealth(m.attributes)} · Spirit {maxSpirit(m.attributes)}</div>
                {m.passives.length > 0 && (
                  <div className="muted small" style={{ marginTop: 8 }}>
                    <b>Passives:</b> {m.passives.map((id) => getPassive(id)?.name ?? id).join(', ')}
                  </div>
                )}
              </div>
              <ResetPanel
                title="Reset Build"
                description="Refund every Ability and Attribute Point spent (abilities back to none but the free Basic Strike, attributes back to base) and reassign from scratch."
                cost={respecCost(m.level)}
                marks={m.marks}
                onReset={resetSkillTree}
              />
            </>
          }
        />
      ) : (
        <AbilityTreePanel
          key="companion"
          animal={animal}
          skills={companionSkills}
          treePos={COMPANION_TREE_POS}
          treeLinks={COMPANION_TREE_LINKS}
          treeHeight={COMPANION_TREE_HEIGHT}
          charName={`${animal.name} Companion`}
          charClass={`Lvl. ${m.level} · fights at Mahery's side`}
          level={m.level}
          abilityPoints={c.abilityPoints}
          ranks={c.skillRanks}
          actionBar={c.actionBar}
          onUnlock={unlockCompanionSkill}
          onSetBarSlot={setCompanionActionBarSlot}
          sidePanels={
            <>
              <div className="steel ab-panel attr-panel">
                <div className="ab-title">About the Companion</div>
                <div className="muted small">
                  {animal.name} fights at Mahery's side every round. Its Health, Strength, Vitality
                  and Spirit scale automatically off Mahery's own as he levels - only which moves it
                  knows, and which of them it carries into battle, is your call.
                </div>
              </div>
              <ResetPanel
                title="Reset Companion Build"
                description="Refund every companion Ability Point spent and clear its action bar back to just the free Basic Strike, so you can reassign from scratch."
                cost={respecCost(m.level)}
                marks={m.marks}
                onReset={resetCompanionSkillTree}
              />
            </>
          }
        />
      )}
      <MenuStrip current="skills" />
    </div>
  );
}

function ResetPanel({ title, description, cost, marks, onReset }: {
  title: string; description: string; cost: number; marks: number; onReset: () => string | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const onClick = () => {
    if (!confirming) { setConfirming(true); setMessage(null); return; }
    const err = onReset();
    setConfirming(false);
    setMessage(err ?? 'Reset. Reassign from scratch.');
  };
  return (
    <div className="steel ab-panel">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="ab-title">{title}</div>
        <span className="small muted">Marks: <span className="marks-num">{marks}</span></span>
      </div>
      <div className="muted small" style={{ marginBottom: 8 }}>{description}</div>
      {confirming ? (
        <div className="stack" style={{ gap: 6 }}>
          <div className="small" style={{ color: 'var(--bad)' }}>Reset everything for {cost} Marks? This cannot be undone.</div>
          <div className="row">
            <button className="btn btn-primary" onClick={onClick} data-testid="confirm-reset-btn">Confirm Reset</button>
            <button className="btn btn-sm" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn" disabled={marks < cost} onClick={onClick} data-testid="reset-tree-btn">
          Reset ({cost} Marks)
        </button>
      )}
      {message && <div className="hint" style={{ marginTop: 6 }}>{message}</div>}
    </div>
  );
}

/** The tree + mini character panel + action bar + ability pool, reused for both Mahery's own
 * build and the companion's (see sharedSkills.ts - same 12-move pool per animal, independently
 * unlocked and equipped for each fighter). Owns its own selection/drag state so switching tabs
 * never leaves a stale selection pointing at the other fighter's ranks. */
function AbilityTreePanel({
  animal, skills, treePos, treeLinks, treeHeight, charName, charClass, level, abilityPoints, ranks, actionBar,
  onUnlock: unlock, onSetBarSlot, extraCharInfo, sidePanels,
}: {
  animal: AnimalDef; skills: SkillDef[];
  treePos: Record<string, { x: number; y: number }>; treeLinks: [string, string][]; treeHeight: number;
  charName: string; charClass: string; level: number; abilityPoints: number;
  ranks: Record<string, number>; actionBar: (string | null)[];
  onUnlock: (skillId: string) => string | null;
  onSetBarSlot: (slot: number, id: string | null) => void;
  extraCharInfo?: ReactNode;
  sidePanels: ReactNode;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [poolPick, setPoolPick] = useState<string | null>(null);

  const selected = skills.find((s) => s.id === selectedId) ?? null;
  const keyOf = (def: SkillDef) => def.sharedKind ?? 'unique';
  const unlocked = skills.filter((s) => (ranks[s.id] ?? 0) > 0);
  const check = (def: SkillDef) => checkUnlock(def, ranks, level, abilityPoints, RANK_COST, skills);

  const onUnlock = (def: SkillDef) => {
    const err = unlock(def.id);
    setMessage(err ?? `${def.name} is now rank ${(ranks[def.id] ?? 0) + 1} of ${maxRankOf(def)}.`);
  };

  const onDrop = (e: DragEvent, slot: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/skill');
    setDragOver(null);
    if (id) onSetBarSlot(slot, id);
  };

  const clickSlot = (i: number) => {
    if (poolPick) { onSetBarSlot(i, poolPick); setPoolPick(null); return; }
    if (actionBar[i]) onSetBarSlot(i, null);
  };

  // action bar ring geometry
  const ringR = 78;
  const slotPos = (i: number) => {
    const a = (i / ACTION_BAR_SLOTS) * Math.PI * 2 - Math.PI / 2;
    return { left: 110 + ringR * Math.cos(a) - 26, top: 110 + ringR * Math.sin(a) - 26 };
  };

  return (
    <div className="ability-screen">
      {/* left: ability tree */}
      <div className="steel ab-panel">
        <div className="ab-title">Ability Tree</div>
        <div className="tree-box" style={{ height: treeHeight }}>
          <svg className="tree-links" viewBox={`0 0 300 ${treeHeight}`} width="300" height={treeHeight}>
            {treeLinks.map(([a, b]) => {
              const pa = treePos[a]; const pb = treePos[b];
              const lit = (ranks[skills.find((s) => keyOf(s) === b)!.id] ?? 0) > 0;
              return <path key={`${a}-${b}`} d={linkPath(pa, pb)} fill="none" className={lit ? 'lit' : ''} />;
            })}
          </svg>
          {skills.map((def) => {
            const pos = treePos[keyOf(def)];
            const rank = ranks[def.id] ?? 0;
            const c = check(def);
            return (
              <div key={def.id} className="tree-node-wrap" style={{ left: pos.x - 26, top: pos.y - 26 }}
                onMouseEnter={() => setHoverId(def.id)} onMouseLeave={() => setHoverId(null)}>
                <button
                  className={`tree-node ${rank === 0 ? 'locked' : ''} ${selectedId === def.id ? 'on' : ''} ${c.ok ? 'can' : ''}`}
                  onClick={() => { setSelectedId(def.id); setMessage(null); }}
                  draggable={rank > 0}
                  onDragStart={(e) => e.dataTransfer.setData('text/skill', def.id)}
                  data-testid={`node-${def.id}`}
                  aria-label={def.name}
                >
                  <SkillIcon icon={def.icon} color={animal.color} size={52} dim={rank === 0} />
                  <span className="node-rank">{rank}/{maxRankOf(def)}</span>
                </button>
                {hoverId === def.id && <SkillTooltip def={def} rank={rank} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* center: character + side panels (attributes/passives or companion info, reset) */}
      <div className="ab-center">
        <div className="steel ab-panel char-panel">
          <div className="char-name">{charName}</div>
          <div className="char-class">{charClass}</div>
          <div className="char-points"><span>Ability Points:</span><b>{abilityPoints}</b></div>
          {extraCharInfo}
          {selected ? (
            <div className="char-detail">
              <div className="sel-head">
                <SkillIcon icon={selected.icon} color={animal.color} size={34} />
                <div>
                  <div className="sel-name">{selected.name}</div>
                  <div className="muted small">{(ranks[selected.id] ?? 0) === 0 ? 'Locked' : `Rank ${ranks[selected.id]} of ${maxRankOf(selected)}`}{selected.kind === 'unique' ? ' · Signature' : ''}</div>
                </div>
              </div>
              <div className="muted small sel-flavor">{selected.flavor}</div>
              <SkillDetail def={selected} rank={ranks[selected.id] ?? 0} all={skills} />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn btn-primary" disabled={!check(selected).ok} onClick={() => onUnlock(selected)} data-testid="unlock-btn">
                  {(ranks[selected.id] ?? 0) === 0 ? `Learn (${RANK_COST} AP)` : (ranks[selected.id] ?? 0) >= maxRankOf(selected) ? 'Max rank' : `Rank up (${RANK_COST} AP)`}
                </button>
                {!check(selected).ok && <span className="muted small">{check(selected).reason}</span>}
              </div>
              {message && <div className="hint" style={{ marginTop: 6 }}>{message}</div>}
            </div>
          ) : (
            <div className="char-tip">
              You can learn new skills with Ability Points. Hold your mouse over an ability for more information, click it to select.
              <div className="muted small" style={{ marginTop: 8 }}>Tip: drag an unlocked ability from the Ability Pool onto the Combat Action Bar, or click one and then click a slot.</div>
            </div>
          )}
        </div>
        {sidePanels}
      </div>

      {/* right: action bar ring + ability pool */}
      <div className="steel ab-panel">
        <div className="ab-title">Combat Action Bar</div>
        <div className="ring">
          {actionBar.slice(0, ACTION_BAR_SLOTS).map((id, i) => {
            const def = id ? skills.find((s) => s.id === id) : null;
            return (
              <div
                key={i}
                className={`ring-slot ${dragOver === i ? 'over' : ''} ${poolPick ? 'awaiting' : ''}`}
                style={slotPos(i)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(i); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => onDrop(e, i)}
                onClick={() => clickSlot(i)}
                title={def ? `${def.name} (click to clear)` : poolPick ? 'Click to place here' : `Slot ${i + 1}`}
                data-testid={`bar-slot-${i}`}
              >
                {def ? <SkillIcon icon={def.icon} color={animal.color} size={48} /> : <span className="ring-n">{i + 1}</span>}
              </div>
            );
          })}
          <div className="ring-center muted small">{actionBar.filter(Boolean).length}/{ACTION_BAR_SLOTS}</div>
        </div>
        <div className="ab-title">Ability Pool</div>
        <div className="pool">
          {unlocked.length === 0 && <div className="muted small">Learn an ability to see it here.</div>}
          {unlocked.map((def) => (
            <div
              key={def.id}
              className={`pool-item ${poolPick === def.id ? 'on' : ''} ${actionBar.includes(def.id) ? 'equipped' : ''}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/skill', def.id)}
              onClick={() => setPoolPick(poolPick === def.id ? null : def.id)}
              title={actionBar.includes(def.id) ? `${def.name} is on the bar` : `Drag ${def.name} to a slot, or click then pick a slot`}
              data-testid={`pool-${def.id}`}
            >
              <SkillIcon icon={def.icon} color={animal.color} size={34} />
              <span className="pool-name">{def.name}</span>
              <span className="pool-rank muted small">{ranks[def.id]}/{maxRankOf(def)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SkillDetail({ def, rank, all }: { def: SkillDef; rank: number; all: SkillDef[] }) {
  const current = rank > 0 ? def.ranks[rank - 1] : null;
  const next = rank < maxRankOf(def) ? def.ranks[rank] : null;
  const nameOf = (id: string) => all.find((s) => s.id === id)?.name ?? id;
  return (
    <div className="small stack" style={{ gap: 4 }}>
      {current && <div><b>Current:</b> {current.summary} <span className="muted">({current.spiritCost} Spirit{current.cooldown ? `, ${current.cooldown} turn cooldown` : ''})</span></div>}
      {next && <div className={current ? 'muted' : ''}><b>{current ? 'Next tier' : 'Tier 1'}:</b> {next.summary} <span className="muted">({next.spiritCost} Spirit{next.cooldown ? `, ${next.cooldown} turn cooldown` : ''})</span></div>}
      {def.requires && <div className="muted">Requires: {def.requires.map((r) => `${nameOf(r.skillId)} rank ${r.rank}`).join(', ')}</div>}
      {def.minLevel && <div className="muted">Requires level {def.minLevel}</div>}
    </div>
  );
}
