import { useState } from 'react';
import { useGame } from '../state/gameStore';
import { ANIMAL_ORDER, getAnimal, heroArtId } from '../data/animals';
import type { AnimalId, Attributes } from '../data/types';
import { Sprite } from '../components/Sprite';
import { SkillIcon } from '../components/Icon';

const STAT_LABEL: Record<keyof Attributes, string> = { vitality: 'Vit', strength: 'Str', instinct: 'Ins', speed: 'Spd' };

function modText(mods: Attributes) {
  return (Object.keys(mods) as (keyof Attributes)[])
    .filter((k) => mods[k] !== 0)
    .map((k) => `${mods[k] > 0 ? '+' : ''}${mods[k]} ${STAT_LABEL[k]}`)
    .join('  ');
}

/** The bond choice: shown once, after Mahery wakes and before the animal speaks. */
export function BondScreen() {
  const chooseBond = useGame((s) => s.chooseBond);
  const [picked, setPicked] = useState<AnimalId>('bear');
  const animal = getAnimal(picked);
  const u = animal.uniqueSkill;

  return (
    <div className="game bond-screen">
      <div className="steel bond-header">
        <div className="zone-title">The bond chose in the night.</div>
        <div className="zone-sub">Now see what it chose. The bond is permanent for the whole game.</div>
      </div>
      <div className="bond-layout">
        <div className="bond-grid">
          {ANIMAL_ORDER.map((id) => {
            const a = getAnimal(id);
            return (
              <button
                key={id}
                className={`bond-card ${picked === id ? 'on' : ''}`}
                onClick={() => setPicked(id)}
                data-testid={`bond-${id}`}
              >
                <Sprite art={a.art} color={a.color} size={78} title={a.name} />
                <div className="bond-name">{a.name}</div>
                <div className="bond-style">{a.playstyle}</div>
              </button>
            );
          })}
        </div>
        <div className="steel bond-detail">
          <div className="bond-figure">
            <Sprite art={heroArtId(picked)} color={animal.color} size={150} title="Mahery" />
            <Sprite art={animal.art} color={animal.color} size={150} title={animal.name} delay={0.5} />
          </div>
          <h2>{animal.name}</h2>
          <div className="bond-tagline">{animal.tagline}</div>
          <div className="bond-row"><b>Playstyle</b> {animal.playstyle}</div>
          <div className="bond-row"><b>Stats</b> {modText(animal.baseStatMods)}</div>
          <div className="bond-row"><b>Mahery becomes</b> {animal.personality}</div>
          <div className="bond-row"><b>He changes</b> {animal.physicalTraits}</div>
          <div className="bond-skill">
            <SkillIcon icon={u.icon} color={animal.color} size={40} />
            <div>
              <div className="bond-skill-name">Signature: {u.name}</div>
              <div className="muted small">{u.ranks[0].summary}</div>
            </div>
          </div>
          <div className="bond-row small muted">
            Shared kit: {animal.sharedSkillFlavor.basicStrike.name}, {animal.sharedSkillFlavor.guardStance.name}, {animal.sharedSkillFlavor.instinctSurge.name}, {animal.sharedSkillFlavor.secondWind.name}.
          </div>
          <button className="btn btn-primary bond-confirm" onClick={() => chooseBond(picked)} data-testid="bond-confirm">
            Bond with the {animal.name}
          </button>
        </div>
      </div>
    </div>
  );
}
