import type { ArtId } from './types';
import { HERO_ANIMALS, ENEMY_SPECIES, type HeroAnimal } from './combatAnimations';

export interface IdleDeathClip {
  src: string;
  /** Total playback time: one loop cycle for idle, the full one-shot run (including the long
   * hold on the final grounded frame) for death. */
  ms: number;
  loop: boolean;
  /** See CombatActionAnimation.preMirrored - the enemy-hybrid strips are already drawn
   * left-facing, so the renderer's usual enemy-side mirror must be skipped for them. */
  preMirrored?: boolean;
}

// Every idle/death strip in the pack shares the same six-frame timing per state (see
// idle-death-manifest.json): idle frames run 170ms each and loop; death runs
// 140/120/130/150/180/850ms once, holding on the final grounded pose.
const IDLE_MS = 170 * 6;
const DEATH_MS = 140 + 120 + 130 + 150 + 180 + 850;

const clip = (name: string, state: 'idle' | 'death', preMirrored?: boolean): IdleDeathClip => ({
  src: `/art/animations/idle-death/${name}-${state}-animated-v1.webp`,
  ms: state === 'idle' ? IDLE_MS : DEATH_MS,
  loop: state === 'idle',
  preMirrored,
});

function baseNameFor(art: ArtId): { name: string; preMirrored?: boolean } | undefined {
  if (art.startsWith('mahery-')) {
    const animal = art.slice('mahery-'.length) as HeroAnimal;
    if (HERO_ANIMALS.includes(animal)) return { name: `hero-${animal}` };
  }
  if (HERO_ANIMALS.includes(art as HeroAnimal)) return { name: `companion-${art}` };
  const enemy = ENEMY_SPECIES[art];
  if (enemy) return { name: `enemy-humanoid-${enemy}`, preMirrored: true };
  // The final boss reuses the wolf-hybrid visual language, same as its attack clips.
  if (art === 'oldChief') return { name: 'hero-wolf' };
  return undefined;
}

/** The looping resting-pose clip for this art, if one exists - undefined falls back to the
 * static-photo/SVG idle presentation. */
export function idleClipFor(art: ArtId): IdleDeathClip | undefined {
  const base = baseNameFor(art);
  return base ? clip(base.name, 'idle', base.preMirrored) : undefined;
}

/** The one-shot collapse clip for this art, if one exists - undefined falls back to the old
 * grayscale-and-topple CSS treatment. */
export function deathClipFor(art: ArtId): IdleDeathClip | undefined {
  const base = baseNameFor(art);
  return base ? clip(base.name, 'death', base.preMirrored) : undefined;
}
