import { useGame } from '../state/gameStore';
import { heroArtId } from '../data/animals';
import { Sprite } from '../components/Sprite';

/** The final choice: Act 2's payoff. Yorrun is beaten and kneeling; the whole clan is watching
 * to see which Mahery decides to be. Kill and Banish each play their own short epilogue scene
 * (data/story.ts: 'ending.kill' / 'ending.banish') and mark the choice on the save for flavor. */
export function EndingScreen() {
  const save = useGame((s) => s.save);
  const chooseEnding = useGame((s) => s.chooseEnding);
  if (!save) return null;

  return (
    <div className="game title-screen">
      <div className="panel" style={{ width: 'min(560px, 100%)', textAlign: 'center' }}>
        <div className="row" style={{ justifyContent: 'center', gap: 24, marginBottom: 8 }}>
          <Sprite art={heroArtId(save.animalId)} color="#c98a4b" size={130} title="Mahery" />
          <Sprite art="oldChief" color="#4a4a52" size={130} title="Yorrun" />
        </div>
        <h2>The Chief's Fire</h2>
        <p className="muted small">
          Yorrun kneels at his own fire, beaten, out of certainty for the first time Mahery has ever seen. The clan is watching. Whatever happens next, they will remember it as who Mahery decided to be.
        </p>
        <div className="row" style={{ justifyContent: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
          <button className="btn btn-danger" style={{ minWidth: 200 }} onClick={() => chooseEnding('kill')} data-testid="ending-kill">
            Kill him
            <div className="small" style={{ fontWeight: 400, marginTop: 4, opacity: 0.85 }}>
              By right of conquest and blood. Both clans are yours - and so is everything that comes after.
            </div>
          </button>
          <button className="btn btn-primary" style={{ minWidth: 200 }} onClick={() => chooseEnding('banish')} data-testid="ending-banish">
            Banish him
            <div className="small" style={{ fontWeight: 400, marginTop: 4, opacity: 0.9 }}>
              The mercy your father died for. Prove him right, and live with what that costs instead.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
