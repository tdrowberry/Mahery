import { useState, type DragEvent } from 'react';
import { useGame } from '../state/gameStore';
import { getAnimal } from '../data/animals';
import { ACTION_BAR_SLOTS, MAX_RANK, RANK_COST } from '../data/progression';
import type { Attributes, SkillDef } from '../data/types';
import { checkUnlock, getAnimalSkills, resolveCompanionSkills } from '../engine/skills';
import { maxHealth, maxSpirit } from '../engine/formulas';
import { SkillIcon } from '../components/Icon';
import { SkillTooltip } from '../components/SkillTooltip';
import { MenuStrip } from '../components/MenuStrip';

const ATTRS: { key: keyof Attributes; label: string; color: string; note: string }[] = [
  { key: 'vitality', label: 'Vitality', color: '#7fbf6a', note: '+5 max Health' },
  { key: 'strength', label: 'Strength', color: '#e06b5c', note: 'Physical damage' },
  { key: 'instinct', label: 'Instinct', color: '#b28ae0', note: '+3 Spirit, healing, effects' },
  { key: 'speed', label: 'Speed', color: '#e8c15a', note: 'Turn order, crit, evasion' },
];

// Tree layout in a 300x350 box: basic strike at the top branches three ways, each branch
// grows a second node, then everything funnels down to the signature skill at the bottom.
const TREE_POS: Record<string, { x: number; y: number }> = {
  basicStrike: { x: 150, y: 32 },
  guardStance: { x: 55, y: 108 },
  powerStrike: { x: 150, y: 108 },
  secondWind: { x: 245, y: 108 },
  weaken: { x: 55, y: 190 },
  instinctSurge: { x: 150, y: 190 },
  rally: { x: 245, y: 190 },
  unique: { x: 150, y: 280 },
};
const TREE_LINKS: [string, string][] = [
  ['basicStrike', 'guardStance'], ['basicStrike', 'powerStrike'], ['basicStrike', 'secondWind'],
  ['guardStance', 'weaken'], ['powerStrike', 'weaken'],
  ['guardStance', 'instinctSurge'], ['secondWind', 'instinctSurge'],
  ['secondWind', 'rally'],
  ['guardStance', 'unique'],
];

export function SkillScreen() {
  const save = useGame((s) => s.save);
  const unlockSkill = useGame((s) => s.unlockSkill);
  const spendAttribute = useGame((s) => s.spendAttribute);
  const setActionBarSlot = useGame((s) => s.setActionBarSlot);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [poolPick, setPoolPick] = useState<string | null>(null);
  if (!save) return null;

  const animal = getAnimal(save.animalId);
  const skills = getAnimalSkills(animal);
  const m = save.mahery;
  const ranks = m.skillRanks;
  const selected = skills.find((s) => s.id === selectedId) ?? null;
  const keyOf = (def: SkillDef) => def.sharedKind ?? 'unique';
  const unlocked = skills.filter((s) => (ranks[s.id] ?? 0) > 0);
  const companionKit = resolveCompanionSkills(animal, ranks);
  const check = (def: SkillDef) => checkUnlock(def, ranks, m.level, m.abilityPoints, RANK_COST, skills);

  const onUnlock = (def: SkillDef) => {
    const err = unlockSkill(def.id);
    setMessage(err ?? `${def.name} is now rank ${(ranks[def.id] ?? 0) + 1} of ${MAX_RANK}.`);
  };

  const onDrop = (e: DragEvent, slot: number) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/skill');
    setDragOver(null);
    if (id) setActionBarSlot(slot, id);
  };

  const clickSlot = (i: number) => {
    if (poolPick) { setActionBarSlot(i, poolPick); setPoolPick(null); return; }
    if (m.actionBar[i]) setActionBarSlot(i, null);
  };

  // action bar ring geometry
  const ringR = 78;
  const slotPos = (i: number) => {
    const a = (i / ACTION_BAR_SLOTS) * Math.PI * 2 - Math.PI / 2;
    return { left: 110 + ringR * Math.cos(a) - 26, top: 110 + ringR * Math.sin(a) - 26 };
  };

  return (
    <div className="game">
      <div className="ability-screen">
        {/* left: ability tree */}
        <div className="steel ab-panel">
          <div className="ab-title">Ability Tree</div>
          <div className="tree-box">
            <svg className="tree-links" viewBox="0 0 300 350" width="300" height="350">
              {TREE_LINKS.map(([a, b]) => {
                const pa = TREE_POS[a]; const pb = TREE_POS[b];
                const lit = (ranks[skills.find((s) => keyOf(s) === b)!.id] ?? 0) > 0;
                return <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} className={lit ? 'lit' : ''} />;
              })}
            </svg>
            {skills.map((def) => {
              const pos = TREE_POS[keyOf(def)];
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
                    <span className="node-rank">{rank}/{MAX_RANK}</span>
                  </button>
                  {hoverId === def.id && <SkillTooltip def={def} rank={rank} />}
                </div>
              );
            })}
          </div>
        </div>

        {/* center: character + attributes */}
        <div className="ab-center">
          <div className="steel ab-panel char-panel">
            <div className="char-name">Mahery</div>
            <div className="char-class">Lvl. {m.level} {animal.name}-bonded</div>
            <div className="char-points"><span>Ability Points:</span><b>{m.abilityPoints}</b></div>
            <div className="char-points"><span>Attribute Points:</span><b>{m.attributePoints}</b></div>
            {selected ? (
              <div className="char-detail">
                <div className="sel-head">
                  <SkillIcon icon={selected.icon} color={animal.color} size={34} />
                  <div>
                    <div className="sel-name">{selected.name}</div>
                    <div className="muted small">{(ranks[selected.id] ?? 0) === 0 ? 'Locked' : `Rank ${ranks[selected.id]} of ${MAX_RANK}`}{selected.kind === 'unique' ? ' · Signature' : ''}</div>
                  </div>
                </div>
                <div className="muted small sel-flavor">{selected.flavor}</div>
                <SkillDetail def={selected} rank={ranks[selected.id] ?? 0} all={skills} />
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn btn-primary" disabled={!check(selected).ok} onClick={() => onUnlock(selected)} data-testid="unlock-btn">
                    {(ranks[selected.id] ?? 0) === 0 ? `Learn (${RANK_COST} AP)` : (ranks[selected.id] ?? 0) >= MAX_RANK ? 'Max rank' : `Rank up (${RANK_COST} AP)`}
                  </button>
                  {!check(selected).ok && <span className="muted small">{check(selected).reason}</span>}
                </div>
                {message && <div className="hint" style={{ marginTop: 6 }}>{message}</div>}
              </div>
            ) : (
              <div className="char-tip">
                You can learn new skills with your Ability Points. Hold your mouse over an ability for more information, click it to select.
                <div className="muted small" style={{ marginTop: 8 }}>Tip: drag an unlocked ability from the Ability Pool onto the Combat Action Bar, or click one and then click a slot.</div>
              </div>
            )}
          </div>
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
          </div>
        </div>

        {/* right: action bar ring + ability pool */}
        <div className="steel ab-panel">
          <div className="ab-title">Combat Action Bar</div>
          <div className="ring">
            {m.actionBar.slice(0, ACTION_BAR_SLOTS).map((id, i) => {
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
            <div className="ring-center muted small">{m.actionBar.filter(Boolean).length}/{ACTION_BAR_SLOTS}</div>
          </div>
          <div className="ab-title">Ability Pool</div>
          <div className="pool">
            {unlocked.length === 0 && <div className="muted small">Learn an ability to see it here.</div>}
            {unlocked.map((def) => (
              <div
                key={def.id}
                className={`pool-item ${poolPick === def.id ? 'on' : ''} ${m.actionBar.includes(def.id) ? 'equipped' : ''}`}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/skill', def.id)}
                onClick={() => setPoolPick(poolPick === def.id ? null : def.id)}
                title={m.actionBar.includes(def.id) ? `${def.name} is on the bar` : `Drag ${def.name} to a slot, or click then pick a slot`}
                data-testid={`pool-${def.id}`}
              >
                <SkillIcon icon={def.icon} color={animal.color} size={34} />
                <span className="pool-name">{def.name}</span>
                <span className="pool-rank muted small">{ranks[def.id]}/{MAX_RANK}</span>
              </div>
            ))}
          </div>
          <div className="ab-title">{animal.name} companion</div>
          <ul className="companion-kit small muted">
            {companionKit.map((k) => <li key={k.id}>{k.name} (rank {k.rank})</li>)}
          </ul>
        </div>
      </div>
      <MenuStrip current="skills" />
    </div>
  );
}

function SkillDetail({ def, rank, all }: { def: SkillDef; rank: number; all: SkillDef[] }) {
  const current = rank > 0 ? def.ranks[rank - 1] : null;
  const next = rank < MAX_RANK ? def.ranks[rank] : null;
  const nameOf = (id: string) => all.find((s) => s.id === id)?.name ?? id;
  return (
    <div className="small stack" style={{ gap: 4 }}>
      {current && <div><b>Current:</b> {current.summary} <span className="muted">({current.spiritCost} Spirit{current.cooldown ? `, ${current.cooldown} turn cooldown` : ''})</span></div>}
      {next && <div className={current ? 'muted' : ''}><b>{current ? 'Next tier' : 'Tier 1'}:</b> {next.summary} <span className="muted">({next.spiritCost} Spirit{next.cooldown ? `, ${next.cooldown} turn cooldown` : ''})</span></div>}
      {def.requires && <div className="muted">Requires: {def.requires.map((r) => `${nameOf(r.skillId)} rank ${r.rank}`).join(', ')}</div>}
      {def.requiresAny && <div className="muted">Requires: {def.requiresAny.map((g) => g.map((r) => `${nameOf(r.skillId)} rank ${r.rank}`).join(' + ')).join(' or ')}</div>}
      {def.minLevel && <div className="muted">Requires level {def.minLevel}</div>}
    </div>
  );
}
