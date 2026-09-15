import { useGame } from '../state/gameStore';
import { getAnimal, heroArtId } from '../data/animals';
import { ENEMIES } from '../data/enemies';
import { CHAPTER_BACKGROUNDS, chapterForSceneId } from '../data/backgrounds';
import type { ArtId } from '../data/types';
import { Sprite } from '../components/Sprite';

interface Portrait { key: string; art: ArtId; color: string; speaker: string; flip?: boolean }

export function StoryScreen() {
  const dialogue = useGame((s) => s.dialogue);
  const save = useGame((s) => s.save);
  const advanceDialogue = useGame((s) => s.advanceDialogue);
  if (!dialogue) return null;
  const animal = save ? getAnimal(save.animalId) : null;
  const line = dialogue.lines[dialogue.index];
  const last = dialogue.index === dialogue.lines.length - 1;

  // Who stands on stage: Mahery, the bond once chosen, plus any enemy who speaks in this scene.
  const portraits: Portrait[] = [{ key: 'mahery', art: heroArtId(save?.animalId), color: animal?.color ?? '#c98a4b', speaker: 'Mahery' }];
  if (animal) portraits.push({ key: 'animal', art: animal.art, color: animal.color, speaker: animal.name });
  const speakers = new Set(dialogue.lines.map((l) => l.speaker));
  for (const def of Object.values(ENEMIES)) {
    const name = def.title ? `${def.name} ${def.title}` : def.name;
    if (speakers.has(name)) portraits.push({ key: def.id, art: def.art, color: def.color, speaker: name, flip: true });
  }
  const speakerColor = portraits.find((p) => p.speaker === line.speaker)?.color;
  const bg = CHAPTER_BACKGROUNDS[chapterForSceneId(dialogue.sceneId) ?? -1];

  const skip = () => {
    useGame.setState({ dialogue: { ...dialogue, index: dialogue.lines.length - 1 } });
    advanceDialogue();
  };

  return (
    <div className="game story">
      <div
        className={`story-bg ${bg ? 'has-photo' : ''} ${bg?.tint ? `tint-${bg.tint}` : ''}`}
        style={bg ? { backgroundImage: `linear-gradient(rgba(10,8,6,0.4), rgba(10,8,6,0.6)), url(${bg.url})` } : undefined}
      />
      <div className="story-scene">
        {portraits.map((p, i) => (
          <Sprite
            key={p.key}
            art={p.art}
            color={p.color}
            size={p.art === 'sessik' ? 190 : 160}
            flip={p.flip}
            dimmed={line.speaker !== p.speaker && line.speaker !== 'Narrator'}
            delay={i * 0.5}
            title={p.speaker}
            pose={line.speaker === p.speaker ? 'toward' : 'front'}
          />
        ))}
      </div>
      <div className="steel dialogue" onClick={advanceDialogue} data-testid="dialogue">
        <div className={`speaker ${line.speaker === 'Narrator' ? 'narrator' : ''}`} style={speakerColor ? { color: speakerColor } : undefined}>
          {line.speaker}
        </div>
        <div className="text">{line.text}</div>
        <div className="cont">{last ? 'Click to continue' : `Click to continue (${dialogue.index + 1}/${dialogue.lines.length})`}</div>
      </div>
      <div className="row">
        <button className="btn btn-primary" onClick={advanceDialogue}>{last ? 'Continue' : 'Next'}</button>
        {!last && <button className="btn btn-sm" onClick={skip}>Skip scene</button>}
      </div>
    </div>
  );
}
