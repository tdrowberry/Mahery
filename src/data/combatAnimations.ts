import type { AnimStyle, ArtId } from './types';

export interface CombatActionAnimation {
  src: string;
  /** The source strips contain six frames timed to complete in about 0.91 seconds. */
  ms: number;
}

export interface AnimationAction {
  id?: string;
  name?: string;
  anim: AnimStyle;
}

const CLIP_MS = 910;
const clip = (src: string): CombatActionAnimation => ({ src, ms: CLIP_MS });
const file = (folder: string, name: string) => clip(`/art/animations/${folder}/${name}-animated-v1.webp`);

const HERO_ANIMALS = [
  'bear', 'moose', 'boar', 'wolf', 'elk', 'mountainLion', 'bobcat', 'buffalo', 'eagle', 'platypus', 'falcon',
] as const;
type HeroAnimal = typeof HERO_ANIMALS[number];

const COMPANION_ATTACKS: Record<HeroAnimal, { primary: string; special: string }> = {
  bear: { primary: 'bite-lunge', special: 'paw-swipe' },
  moose: { primary: 'front-hoof-stomp', special: 'antler-charge' },
  boar: { primary: 'bite', special: 'tusk-charge' },
  wolf: { primary: 'bite-lunge', special: 'pounce' },
  elk: { primary: 'front-hoof-strike', special: 'antler-charge' },
  mountainLion: { primary: 'paw-swipe', special: 'pounce' },
  bobcat: { primary: 'paw-swipe', special: 'pounce' },
  buffalo: { primary: 'head-toss', special: 'horn-charge' },
  eagle: { primary: 'beak-strike', special: 'talon-strike' },
  platypus: { primary: 'bill-jab', special: 'tail-slap' },
  falcon: { primary: 'beak-strike', special: 'talon-dive' },
};

const ENEMY_SPECIES: Partial<Record<ArtId, string>> = {
  'enemy-snake': 'snake',
  'enemy-spider': 'spider',
  'enemy-crocodile': 'crocodile',
  'enemy-vulture': 'vulture',
  'enemy-raven': 'raven',
};

const ENEMY_SWEEP: Record<string, string> = {
  snake: 'tail-sweep',
  spider: 'foreleg-sweep',
  crocodile: 'leg-sweep',
  vulture: 'leg-sweep',
  raven: 'leg-sweep',
};

function heroAnimation(animal: HeroAnimal, action: AnimationAction) {
  const idParts = action.id?.split('.') ?? [];
  const suffix = idParts[idParts.length - 1] ?? '';
  let move: string;
  if (action.anim === 'cast') move = 'magic-cast-character';
  else if (suffix === 'rendingClaw' || suffix === 'weaken') move = 'claw-swipe';
  else if (suffix === 'hamstring') move = 'leg-sweep';
  else if (action.anim === 'strike' && suffix !== 'unique') move = 'bite';
  else if (action.anim === 'venom') move = 'bite';
  else move = 'headbutt';
  return file('heroes', `${animal}-${move}`);
}

function companionAnimation(animal: HeroAnimal, action: AnimationAction) {
  if (action.anim === 'cast') return undefined;
  const idParts = action.id?.split('.') ?? [];
  const suffix = idParts[idParts.length - 1];
  const move = suffix === 'pounce' || suffix === 'harry'
    ? COMPANION_ATTACKS[animal].special
    : COMPANION_ATTACKS[animal].primary;
  return file('companions', `companion-${animal}-${move}`);
}

function enemyAnimation(species: string, action: AnimationAction) {
  const name = (action.name ?? '').toLowerCase();
  let move: string;
  if (action.anim === 'cast') move = 'magic-cast-character';
  else if (/bite|fang|peck/.test(name)) move = 'bite';
  else if (/claw|talon|slash|spear|rake/.test(name)) move = 'claw-swipe';
  else if (/sweep|roll|drag|constrict|grip|drop|dive|stoop/.test(name)) move = ENEMY_SWEEP[species];
  else if (action.anim === 'charge' || action.anim === 'diveStrike') move = 'headbutt';
  else if (action.anim === 'venom') move = 'claw-swipe';
  else move = 'bite';
  return file('humanoid-enemies', `enemy-${species}-${move}`);
}

/** Resolve a combat action to the matching one-shot WebP from README2's animation library. */
export function combatAnimationFor(art: ArtId, action: AnimationAction | undefined) {
  if (!action) return undefined;

  if (art.startsWith('mahery-')) {
    const animal = art.slice('mahery-'.length) as HeroAnimal;
    if (HERO_ANIMALS.includes(animal)) return heroAnimation(animal, action);
  }

  if (HERO_ANIMALS.includes(art as HeroAnimal)) {
    return companionAnimation(art as HeroAnimal, action);
  }

  const enemy = ENEMY_SPECIES[art];
  if (enemy) return enemyAnimation(enemy, action);

  // The final boss reuses the wolf-hybrid visual language.
  if (art === 'oldChief') return heroAnimation('wolf', action);
  return undefined;
}
