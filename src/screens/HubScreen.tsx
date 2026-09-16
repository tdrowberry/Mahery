import { useGame } from '../state/gameStore';
import { getChapter, getEncounter } from '../data/encounters';
import { getAnimal, heroArtId } from '../data/animals';
import { xpToNextLevel } from '../data/progression';
import { maxHealth, maxSpirit } from '../engine/formulas';
import { necklaceBonuses } from '../data/gems';
import { Sprite } from '../components/Sprite';
import { MenuStrip } from '../components/MenuStrip';

export function HubScreen() {
  const save = useGame((s) => s.save);
  const startEncounter = useGame((s) => s.startEncounter);
  const startRoamingEncounter = useGame((s) => s.startRoamingEncounter);
  if (!save) return null;
  const animal = getAnimal(save.animalId);
  const m = save.mahery;
  const need = xpToNextLevel(m.level);
  const chapter = getChapter(save.story.chapter);
  const chapterDone = chapter.encounterIds.every((id) => save.story.clearedStages.includes(id));
  const ending = save.story.flags['ending:kill'] ? 'kill' : save.story.flags['ending:banish'] ? 'banish' : null;
  const bonus = necklaceBonuses(save.inventory.necklace).attrs;
  const total = {
    vitality: m.attributes.vitality + bonus.vitality,
    strength: m.attributes.strength + bonus.strength,
    instinct: m.attributes.instinct + bonus.instinct,
    speed: m.attributes.speed + bonus.speed,
  };

  return (
    <div className="game">
      <div className="hub-layout">
        <div className="steel ab-panel">
          <div className="ab-title">The Road · {chapter.name}</div>
          <div className="stack">
            {chapter.encounterIds.map((id, i) => {
              const enc = getEncounter(id);
              const cleared = save.story.clearedStages.includes(id);
              const prev = i === 0 ? null : chapter.encounterIds[i - 1];
              const unlocked = !prev || save.story.clearedStages.includes(prev);
              return (
                <div key={id} className={`stage ${unlocked ? '' : 'locked'}`} data-testid={`stage-${id}`}>
                  <div>
                    <div className="st-name">Stage {enc.stage}: {enc.name} {enc.isBoss && <span className="badge">Boss</span>}</div>
                    <div className="small muted">{enc.subtitle} · {enc.xpReward} XP</div>
                  </div>
                  <div className="row">
                    {cleared && <span className="badge good">Cleared</span>}
                    <button className="btn btn-primary" disabled={!unlocked} onClick={() => startEncounter(id)}>
                      {cleared ? 'Replay' : 'Fight'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {chapterDone && (
            <div className="chapter-done">
              {ending ? (
                <>
                  <b>Mahery's story is complete.</b>{' '}
                  {ending === 'kill'
                    ? 'He took both clans by right of conquest and blood.'
                    : 'He chose mercy, and proved his father right.'}{' '}
                  Every stage on the road can still be replayed for XP and gear.
                </>
              ) : (
                <><b>{chapter.name} complete.</b> The road continues.</>
              )}
            </div>
          )}
        </div>

        <div className="steel ab-panel">
          <div className="ab-title">Mahery</div>
          <div className="hub-figures">
            <Sprite art={heroArtId(save.animalId)} color={animal.color} size={140} title="Mahery" necklace={save.inventory.necklace} />
            <Sprite art={animal.art} color={animal.color} size={130} title={animal.name} delay={0.6} />
          </div>
          <div className="char-class" style={{ textAlign: 'center' }}>Lvl. {m.level} {animal.name}-bonded</div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span className="small muted">Experience</span>
            <span className="muted small">{m.xp} / {need}</span>
          </div>
          <div className="zone-bar"><div className="zone-fill" style={{ width: `${(m.xp / need) * 100}%` }} /></div>
          <div className="attr-grid small">
            <span>Vitality</span><b>{total.vitality}</b>
            <span>Strength</span><b>{total.strength}</b>
            <span>Instinct</span><b>{total.instinct}</b>
            <span>Speed</span><b>{total.speed}</b>
            <span>Health</span><b>{maxHealth(total)}</b>
            <span>Spirit</span><b>{maxSpirit(total)}</b>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
            <span className="small muted">Trade Marks</span>
            <span className="marks-num">{m.marks}</span>
          </div>
          <div className="small muted" style={{ marginTop: 10 }}>{animal.personality}</div>
        </div>

        <div className="steel ab-panel hunt-panel">
          <div className="ab-title">The Hunt</div>
          <div className="muted small" style={{ marginBottom: 8 }}>
            Off the road, not part of the story: a random creature for Marks and a little XP.
            Repeatable any time, no risk to your progress.
          </div>
          <div className="stage" data-testid="stage-roaming">
            <div>
              <div className="st-name">Roam off the road</div>
              <div className="small muted">Fight whatever crosses your path.</div>
            </div>
            <button className="btn" onClick={startRoamingEncounter} data-testid="hunt-btn">Hunt</button>
          </div>
        </div>
      </div>
      <MenuStrip current="hub" />
    </div>
  );
}
