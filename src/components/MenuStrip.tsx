import { useState } from 'react';
import { useGame, type Screen } from '../state/gameStore';
import { useUiStore } from '../state/uiStore';
import { getChapter, getEncounter } from '../data/encounters';

/** Sonny 2's bottom bar: menu buttons left, world button center, zone progress right. */
export function MenuStrip({ current }: { current: Screen }) {
  const save = useGame((s) => s.save);
  const goTo = useGame((s) => s.goTo);
  const quitToTitle = useGame((s) => s.quitToTitle);
  const openSettings = useUiStore((s) => s.openSettings);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  if (!save) return null;
  const chapter = getChapter(save.story.chapter);
  const cleared = chapter.encounterIds.filter((id) => save.story.clearedStages.includes(id)).length;
  const nextId = chapter.encounterIds.find((id) => !save.story.clearedStages.includes(id)) ?? chapter.encounterIds[chapter.encounterIds.length - 1];
  const next = getEncounter(nextId);
  const unspent = save.mahery.abilityPoints + save.mahery.attributePoints;
  const bagCount = save.inventory.items.length;
  return (
    <div className="menu-strip">
      <div className="steel ms-left">
        <button className={`ms-btn ${current === 'skills' ? 'on' : ''}`} onClick={() => goTo('skills')} title="Abilities" data-testid="ms-skills">
          <span className="ms-glyph">✦</span><span>Abilities</span>
          {unspent > 0 && <span className="pip">{unspent}</span>}
        </button>
        <button className={`ms-btn ${current === 'inventory' ? 'on' : ''}`} onClick={() => goTo('inventory')} title="Gear and Marks" data-testid="ms-items">
          <span className="ms-glyph">▣</span><span>Items</span>
          {bagCount > 0 && <span className="pip">{bagCount}</span>}
        </button>
        <button className={`ms-btn ${current === 'shop' ? 'on' : ''}`} onClick={() => goTo('shop')} title="Trade Marks for gems" data-testid="ms-shop">
          <span className="ms-glyph">⛃</span><span>Shop</span>
        </button>
        <button className="ms-btn" onClick={openSettings} title="Settings" data-testid="ms-settings">
          <span className="ms-glyph">⚙</span><span>Settings</span>
        </button>
        <button className="ms-btn" onClick={() => setConfirmingQuit(true)} title="Save and return to the title screen" data-testid="ms-quit">
          <span className="ms-glyph">⏏</span><span>Save &amp; Quit</span>
        </button>
      </div>
      <div className="steel ms-center">
        <button className={`round-btn ${current === 'hub' ? 'on' : ''}`} onClick={() => goTo('hub')} title="The Road" data-testid="ms-world">
          <img className="round-btn-img" src="/art/branding/logo-alt.jpg" alt="" />
        </button>
      </div>
      {confirmingQuit && (
        <div className="overlay" onClick={() => setConfirmingQuit(false)}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h2>Save &amp; Quit</h2>
            <div className="muted small" style={{ marginBottom: 14 }}>Save and return to the title screen?</div>
            <div className="row" style={{ justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={quitToTitle} data-testid="confirm-quit-btn">Quit</button>
              <button className="btn btn-sm" onClick={() => setConfirmingQuit(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="steel ms-right">
        <div className="zone-title">Zone {chapter.number} <span className="marks-num small">· {save.mahery.marks} Marks</span></div>
        <div className="zone-sub">{chapter.name}{next ? ` · ${next.name}` : ''}</div>
        <div className="zone-bar"><div className="zone-fill" style={{ width: `${(cleared / chapter.encounterIds.length) * 100}%` }} /></div>
        <div className="zone-stage">Stage {Math.min(cleared + 1, chapter.encounterIds.length)} of {chapter.encounterIds.length}</div>
      </div>
    </div>
  );
}
