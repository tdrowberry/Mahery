import { useState } from 'react';
import { useGame } from '../state/gameStore';
import { listSlots, type SlotNumber } from '../state/saveFormat';
import { getAnimal } from '../data/animals';
import { Sprite } from '../components/Sprite';

const LOGO_SRC = '/art/branding/logo-main.jpg';

export function TitleScreen() {
  const newGame = useGame((s) => s.newGame);
  const continueGame = useGame((s) => s.continueGame);
  const deleteSave = useGame((s) => s.deleteSave);
  const [confirmDelete, setConfirmDelete] = useState<SlotNumber | null>(null);
  const [tick, setTick] = useState(0);
  const slots = listSlots();

  return (
    <div className="game title-screen">
      <div className="title-bg" />
      <div className="title-hero">
        <img src={LOGO_SRC} alt="Mahery" className="title-logo" />
      </div>
      <h1>Mahery</h1>
      <p className="tagline">
        Exiled after his father is killed for an act of mercy, a boy bonds with a wild animal spirit and sets out to earn a place in a new tribe.
      </p>
      <div className="slots">
        {slots.map(({ slot, save }) => {
          const animal = save ? getAnimal(save.animalId) : null;
          return (
            <div key={slot} className="steel slot-card" data-testid={`slot-${slot}`}>
              <div className="slot-title">Slot {slot}</div>
              {save && animal ? (
                <>
                  <div className="slot-figure"><Sprite art={animal.art} color={animal.color} size={70} title={animal.name} /></div>
                  <div>Level {save.mahery.level} · {animal.name}-bonded</div>
                  <div className="small muted">Chapter {save.story.chapter}, {save.story.clearedStages.length} stage(s) cleared</div>
                  <div className="small muted">Saved {new Date(save.savedAt).toLocaleString()}</div>
                  <button className="btn btn-primary" onClick={() => continueGame(slot)}>Continue</button>
                  {confirmDelete === slot ? (
                    <button className="btn btn-danger btn-sm" onClick={() => { deleteSave(slot); setConfirmDelete(null); setTick(tick + 1); }}>
                      Confirm delete
                    </button>
                  ) : (
                    <button className="btn btn-sm" onClick={() => setConfirmDelete(slot)}>Delete</button>
                  )}
                </>
              ) : (
                <>
                  <div className="muted small">Empty</div>
                  <div className="small">Choose your bond after the opening scene.</div>
                  <button className="btn btn-primary" onClick={() => newGame(slot)}>New Game</button>
                </>
              )}
            </div>
          );
        })}
      </div>
      <div className="muted small">The full road: six chapters, eleven bonds, one choice at the end.</div>
    </div>
  );
}
