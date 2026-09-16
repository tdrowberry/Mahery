import { useGame } from '../state/gameStore';
import { getGem } from '../data/gems';
import { xpToNextLevel } from '../data/progression';

export function ResultsScreen() {
  const results = useGame((s) => s.results);
  const save = useGame((s) => s.save);
  const closeResults = useGame((s) => s.closeResults);
  if (!results || !save) return null;
  const m = save.mahery;
  return (
    <div className="game title-screen">
      <div className="panel" style={{ width: 'min(520px, 100%)', textAlign: 'center' }}>
        <h2>{results.encounterName} cleared</h2>
        <div style={{ fontSize: 22, margin: '8px 0' }}>+{results.xp} XP{results.marksGained > 0 && <span className="marks-gain"> · +{results.marksGained} Marks</span>}</div>
        {results.levelsGained > 0 ? (
          <div className="panel" style={{ borderColor: 'var(--accent)', margin: '10px 0' }}>
            <div style={{ fontSize: 20, color: 'var(--accent-2)' }}>Level up! Mahery is now level {results.newLevel}.</div>
            <div className="muted small" style={{ marginTop: 6 }}>
              +{results.abilityPointsGained} Ability Points, +{results.attributePointsGained} Attribute Points. Spend them on the Skills screen.
            </div>
          </div>
        ) : (
          <div className="muted small">{m.xp} / {xpToNextLevel(m.level)} XP to level {m.level + 1}</div>
        )}
        {results.droppedItems.length > 0 && (
          <div className="panel" style={{ margin: '10px 0' }}>
            <div className="small" style={{ color: 'var(--accent-2)', marginBottom: 4 }}>Found:</div>
            <ul className="loot-list">
              {results.droppedItems.map((id, i) => {
                const gem = getGem(id);
                return <li key={i} className={`gem-lv-${gem.level}`}>{gem.name}</li>;
              })}
            </ul>
            <div className="muted small">Manage your necklace from the Items screen.</div>
          </div>
        )}
        {results.chapterAdvanced && (
          <div className="panel" style={{ borderColor: 'var(--good)', margin: '10px 0' }}>
            <div style={{ fontSize: 18, color: 'var(--good)' }}>Chapter complete. A new road opens.</div>
          </div>
        )}
        {!results.firstClear && <div className="muted small" style={{ marginTop: 6 }}>Replay: no new story.</div>}
        <div className="muted small" style={{ marginTop: 8 }}>Both party members recover fully after the fight.</div>
        <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={closeResults} data-testid="results-continue">Continue</button>
      </div>
    </div>
  );
}
