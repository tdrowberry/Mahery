import { useState } from 'react';
import { useGame } from '../state/gameStore';
import { GEM_KIND_COLOR, GEM_KIND_LABEL, shopInventory, shopPrice } from '../data/gems';
import type { GemKind } from '../data/types';
import { MenuStrip } from '../components/MenuStrip';

const KIND_OPTIONS: (GemKind | 'all')[] = ['all', 'vitality', 'strength', 'instinct', 'speed', 'guard'];

/** Buy gems outright with Marks instead of waiting on a drop. Stock is capped by chapter, and
 * priced well above sell value, so selling off an outgrown gem only ever funds part of the next
 * one - Marks from roaming fights and campaign wins are what actually gets you there. */
export function ShopScreen() {
  const save = useGame((s) => s.save);
  const buyGem = useGame((s) => s.buyGem);
  const [kindFilter, setKindFilter] = useState<GemKind | 'all'>('all');
  const [levelFilter, setLevelFilter] = useState<number | 'all'>('all');
  if (!save) return null;
  const stock = shopInventory(save.story.chapter)
    .filter((gem) => kindFilter === 'all' || gem.kind === kindFilter)
    .filter((gem) => levelFilter === 'all' || gem.level === levelFilter);
  const levelCap = Math.max(...shopInventory(save.story.chapter).map((g) => g.level));
  const marks = save.mahery.marks;

  return (
    <div className="game">
      <div className="steel ab-panel" style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="ab-title">Gem Trader</div>
        <div className="muted small" style={{ marginBottom: 10 }}>
          Buying is pricier than selling - a gem you've outgrown only ever covers part of the next
          one. The trader's stock grows as the road goes on.
        </div>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 12 }}>
          <span className="small muted">Trade Marks</span>
          <span className="marks-num">{marks}</span>
        </div>
        <div className="row" style={{ justifyContent: 'center', marginBottom: 12, gap: 10 }}>
          <label className="small muted">
            Kind{' '}
            <select value={kindFilter} onChange={(e) => setKindFilter(e.target.value as GemKind | 'all')} data-testid="shop-filter-kind">
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>{k === 'all' ? 'All' : GEM_KIND_LABEL[k]}</option>
              ))}
            </select>
          </label>
          <label className="small muted">
            Level{' '}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              data-testid="shop-filter-level"
            >
              <option value="all">All</option>
              {Array.from({ length: levelCap }, (_, i) => i + 1).map((lvl) => (
                <option key={lvl} value={lvl}>{lvl}</option>
              ))}
            </select>
          </label>
        </div>
        {stock.length === 0 && <div className="muted small" style={{ textAlign: 'center', marginBottom: 10 }}>No gems match that filter.</div>}
        <div className="bag-list">
          {stock.map((gem) => {
            const price = shopPrice(gem.level);
            const affordable = marks >= price;
            return (
              <div key={gem.id} className={`bag-item gem-lv-${gem.level}`} data-testid={`shop-${gem.id}`}>
                <div className="bag-item-head">
                  <span className="bag-item-name">{gem.name}</span>
                  <span className="badge">Lv.{gem.level}</span>
                </div>
                <div className="muted small">{gem.flavor}</div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                  <span className="bag-item-stat" style={{ color: GEM_KIND_COLOR[gem.kind] }}>
                    {gem.kind === 'guard' ? `-${Math.round(gem.bonus * 100)}% dmg taken` : `+${gem.bonus} ${GEM_KIND_LABEL[gem.kind]}`}
                  </span>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={!affordable}
                    onClick={() => buyGem(gem.id)}
                    data-testid={`buy-${gem.id}`}
                    title={affordable ? undefined : 'Not enough Marks'}
                  >
                    Buy ({price})
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <MenuStrip current="shop" />
    </div>
  );
}
