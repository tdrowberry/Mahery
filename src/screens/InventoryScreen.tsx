import { useGame } from '../state/gameStore';
import { getAnimal, heroArtId } from '../data/animals';
import { GEM_KIND_COLOR, GEM_KIND_LABEL, getGem } from '../data/gems';
import { Sprite } from '../components/Sprite';
import { MenuStrip } from '../components/MenuStrip';

export function InventoryScreen() {
  const save = useGame((s) => s.save);
  const equipGem = useGame((s) => s.equipGem);
  const unequipGem = useGame((s) => s.unequipGem);
  const sellItem = useGame((s) => s.sellItem);
  if (!save) return null;
  const animal = getAnimal(save.animalId);
  const necklace = save.inventory.necklace;
  const necklaceFull = necklace.every((id) => id);

  // group the bag by item id so duplicates show as a stack with a count
  const counts = new Map<string, number>();
  for (const id of save.inventory.items) counts.set(id, (counts.get(id) ?? 0) + 1);
  const stacks = [...counts.entries()];

  return (
    <div className="game">
      <div className="inv-layout">
        <div className="steel ab-panel">
          <div className="ab-title">Necklace</div>
          <div className="inv-figure">
            <Sprite art={heroArtId(save.animalId)} color={animal.color} size={170} title="Mahery" necklace={necklace} />
          </div>
          <div className="muted small" style={{ textAlign: 'center', margin: '0 0 8px' }}>
            5 gem slots. Gems only ever come from what you kill - equip one, and it shows right on the necklace.
          </div>
          <div className="inv-slots">
            {necklace.map((itemId, slotIndex) => {
              const gem = itemId ? getGem(itemId) : null;
              return (
                <div key={slotIndex} className={`inv-slot ${gem ? `gem-lv-${gem.level}` : ''}`} data-testid={`necklace-slot-${slotIndex}`}>
                  {gem ? (
                    <>
                      <div className="inv-slot-label">{GEM_KIND_LABEL[gem.kind]} &middot; Lv.{gem.level}</div>
                      <div className="inv-slot-name">{gem.name}</div>
                      <div className="inv-slot-stat" style={{ color: GEM_KIND_COLOR[gem.kind] }}>
                        {gem.kind === 'guard' ? `-${Math.round(gem.bonus * 100)}% dmg taken` : `+${gem.bonus} ${GEM_KIND_LABEL[gem.kind]}`}
                      </div>
                      <button className="btn btn-sm" onClick={() => unequipGem(slotIndex)}>Unequip</button>
                    </>
                  ) : (
                    <div className="muted small">Empty</div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 10 }}>
            <span className="small muted">Trade Marks</span>
            <span className="marks-num">{save.mahery.marks}</span>
          </div>
        </div>

        <div className="steel ab-panel">
          <div className="ab-title">Bag</div>
          {stacks.length === 0 && <div className="muted small">Nothing yet. Defeated enemies sometimes drop gems.</div>}
          {necklaceFull && stacks.length > 0 && (
            <div className="muted small" style={{ marginBottom: 6 }}>Necklace is full - unequip a gem to make room for a new one.</div>
          )}
          <div className="bag-list">
            {stacks.map(([itemId, count]) => {
              const gem = getGem(itemId);
              return (
                <div key={itemId} className={`bag-item gem-lv-${gem.level}`} data-testid={`bag-${itemId}`}>
                  <div className="bag-item-head">
                    <span className="bag-item-name">{gem.name}{count > 1 && <span className="muted"> x{count}</span>}</span>
                    <span className="badge">Lv.{gem.level}</span>
                  </div>
                  <div className="muted small">{gem.flavor}</div>
                  <div className="row" style={{ justifyContent: 'space-between', marginTop: 4 }}>
                    <span className="bag-item-stat" style={{ color: GEM_KIND_COLOR[gem.kind] }}>
                      {gem.kind === 'guard' ? `-${Math.round(gem.bonus * 100)}% dmg taken` : `+${gem.bonus} ${GEM_KIND_LABEL[gem.kind]}`}
                    </span>
                    <div className="row">
                      <button
                        className="btn btn-sm btn-primary"
                        disabled={necklaceFull}
                        onClick={() => equipGem(itemId)}
                        data-testid={`equip-${itemId}`}
                        title={necklaceFull ? 'Necklace full - unequip a gem first' : `Equip into slot ${necklace.indexOf(null) + 1}`}
                      >
                        Equip
                      </button>
                      <button className="btn btn-sm" onClick={() => sellItem(itemId)} data-testid={`sell-${itemId}`}>Sell ({gem.sellValue})</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <MenuStrip current="inventory" />
    </div>
  );
}
