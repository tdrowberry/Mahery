import type { EncounterDef } from './types';

// Chapter 1, Snake, and Chapter 2, Spider. Each chapter is 5 stages: 4 regular fights that
// scale up, then a boss. Every non-boss stage is replayable for XP once unlocked.

export const ENCOUNTERS: EncounterDef[] = [
  // ---------- Chapter 1: Snake ----------
  {
    id: 'ch1-s1', chapter: 1, stage: 1, name: 'The Dry Gulch', subtitle: 'Two skulkers hold the road.',
    enemyIds: ['skulker', 'skulker'], xpReward: 100, isBoss: false,
    sceneBefore: 'ch1.beforeStage1', sceneAfter: 'ch1.afterStage1',
  },
  {
    id: 'ch1-s2', chapter: 1, stage: 2, name: 'Thornbrake Crossing', subtitle: 'A skulker and something faster.',
    enemyIds: ['skulker', 'viperAmbusher'], xpReward: 120, isBoss: false,
  },
  {
    id: 'ch1-s3', chapter: 1, stage: 3, name: 'The Hissing Flats', subtitle: 'Three skulkers, out in the open.',
    enemyIds: ['skulker', 'skulker', 'skulker'], xpReward: 140, isBoss: false,
  },
  {
    id: 'ch1-s4', chapter: 1, stage: 4, name: "Serpent's Narrows", subtitle: 'Two ambushers, both patient.',
    enemyIds: ['viperAmbusher', 'viperAmbusher'], xpReward: 160, isBoss: false,
  },
  {
    id: 'ch1-s5', chapter: 1, stage: 5, name: "Sessik's Den", subtitle: 'Boss: Sessik the Coiled.',
    enemyIds: ['sessik'], xpReward: 220, isBoss: true,
    sceneBefore: 'ch1.beforeBoss', sceneAfter: 'ch1.afterBoss',
  },

  // ---------- Chapter 2: Spider ----------
  {
    id: 'ch2-s1', chapter: 2, stage: 1, name: 'The Webbed Eaves', subtitle: 'The road narrows into a forest strung with silk.',
    enemyIds: ['webSkulker', 'webSkulker'], xpReward: 150, isBoss: false,
    sceneBefore: 'ch2.beforeStage1', sceneAfter: 'ch2.afterStage1',
  },
  {
    id: 'ch2-s2', chapter: 2, stage: 2, name: 'Silked Hollow', subtitle: 'A weaver, and something bigger waiting behind it.',
    enemyIds: ['webSkulker', 'widowStalker'], xpReward: 180, isBoss: false,
  },
  {
    id: 'ch2-s3', chapter: 2, stage: 3, name: 'The Snare Path', subtitle: 'Three weavers, working together.',
    enemyIds: ['webSkulker', 'webSkulker', 'webSkulker'], xpReward: 210, isBoss: false,
  },
  {
    id: 'ch2-s4', chapter: 2, stage: 4, name: "Widow's Reach", subtitle: 'Two stalkers, in no hurry at all.',
    enemyIds: ['widowStalker', 'widowStalker'], xpReward: 240, isBoss: false,
  },
  {
    id: 'ch2-s5', chapter: 2, stage: 5, name: "Vethra's Web", subtitle: 'Boss: Vethra the Weaver.',
    enemyIds: ['vethra'], xpReward: 320, isBoss: true,
    sceneBefore: 'ch2.beforeBoss', sceneAfter: 'ch2.afterBoss',
  },

  // ---------- Chapter 3: Crocodile ----------
  {
    id: 'ch3-s1', chapter: 3, stage: 1, name: 'The Sunken Ford', subtitle: 'The road disappears into brown water.',
    enemyIds: ['snapper', 'snapper'], xpReward: 260, isBoss: false,
    sceneBefore: 'ch3.beforeStage1', sceneAfter: 'ch3.afterStage1',
  },
  {
    id: 'ch3-s2', chapter: 3, stage: 2, name: 'Mudback Shallows', subtitle: 'A snapper, and something that does not need to hurry.',
    enemyIds: ['snapper', 'strangler'], xpReward: 300, isBoss: false,
  },
  {
    id: 'ch3-s3', chapter: 3, stage: 3, name: 'The Reed Maze', subtitle: 'Three snappers, patient in the shallows.',
    enemyIds: ['snapper', 'snapper', 'snapper'], xpReward: 340, isBoss: false,
  },
  {
    id: 'ch3-s4', chapter: 3, stage: 4, name: 'Stillwater Bend', subtitle: 'Two stranglers, and no current strong enough to move them.',
    enemyIds: ['strangler', 'strangler'], xpReward: 380, isBoss: false,
  },
  {
    id: 'ch3-s5', chapter: 3, stage: 5, name: 'The Drowned Hollow', subtitle: 'Boss: Drevik the Drowned.',
    enemyIds: ['drevik'], xpReward: 460, isBoss: true,
    sceneBefore: 'ch3.beforeBoss', sceneAfter: 'ch3.afterBoss',
  },

  // ---------- Chapter 4: Vulture ----------
  {
    id: 'ch4-s1', chapter: 4, stage: 1, name: 'Bone Orchard', subtitle: 'Dead trees, and things circling above them.',
    enemyIds: ['picker', 'picker'], xpReward: 340, isBoss: false,
    sceneBefore: 'ch4.beforeStage1', sceneAfter: 'ch4.afterStage1',
  },
  {
    id: 'ch4-s2', chapter: 4, stage: 2, name: 'The Picked Field', subtitle: 'A picker, and a bigger shape landing behind it.',
    enemyIds: ['picker', 'carrionStalker'], xpReward: 390, isBoss: false,
  },
  {
    id: 'ch4-s3', chapter: 4, stage: 3, name: 'Carrion Ridge', subtitle: 'Three of them, watching from three directions.',
    enemyIds: ['picker', 'picker', 'picker'], xpReward: 440, isBoss: false,
  },
  {
    id: 'ch4-s4', chapter: 4, stage: 4, name: 'The Long Watch', subtitle: 'Two stalkers, content to wait you out.',
    enemyIds: ['carrionStalker', 'carrionStalker'], xpReward: 480, isBoss: false,
  },
  {
    id: 'ch4-s5', chapter: 4, stage: 5, name: "Skarrow's Roost", subtitle: 'Boss: Skarrow the Unburied.',
    enemyIds: ['skarrow'], xpReward: 560, isBoss: true,
    sceneBefore: 'ch4.beforeBoss', sceneAfter: 'ch4.afterBoss',
  },

  // ---------- Chapter 5: Raven ----------
  {
    id: 'ch5-s1', chapter: 5, stage: 1, name: 'The Black Canopy', subtitle: 'The trees go quiet all at once.',
    enemyIds: ['talon', 'talon'], xpReward: 420, isBoss: false,
    sceneBefore: 'ch5.beforeStage1', sceneAfter: 'ch5.afterStage1',
  },
  {
    id: 'ch5-s2', chapter: 5, stage: 2, name: "Shrike's Pass", subtitle: 'A talon, and something heavier dropping in behind you.',
    enemyIds: ['talon', 'shadowwing'], xpReward: 480, isBoss: false,
  },
  {
    id: 'ch5-s3', chapter: 5, stage: 3, name: 'The Feathered Dark', subtitle: 'Three of them, never in the same place twice.',
    enemyIds: ['talon', 'talon', 'talon'], xpReward: 540, isBoss: false,
  },
  {
    id: 'ch5-s4', chapter: 5, stage: 4, name: "Corvath's Shadow", subtitle: 'Two raiders, testing you before he bothers to.',
    enemyIds: ['shadowwing', 'shadowwing'], xpReward: 600, isBoss: false,
  },
  {
    id: 'ch5-s5', chapter: 5, stage: 5, name: "The Unbound's Perch", subtitle: 'Boss: Corvath the Unbound.',
    enemyIds: ['corvath'], xpReward: 700, isBoss: true,
    sceneBefore: 'ch5.beforeBoss', sceneAfter: 'ch5.afterBoss',
  },

  // ---------- Final Chapter: the Old Chief ----------
  {
    id: 'final-s1', chapter: 6, stage: 1, name: 'The Old Camp', subtitle: 'Home, and it does not recognize him either.',
    enemyIds: ['clanWarrior', 'clanWarrior'], xpReward: 650, isBoss: false,
    sceneBefore: 'final.beforeStage1', sceneAfter: 'final.afterStage1',
  },
  {
    id: 'final-s2', chapter: 6, stage: 2, name: "The Chief's Fire", subtitle: 'Boss: Yorrun, the Old Chief.',
    enemyIds: ['yorrun'], xpReward: 900, isBoss: true,
    sceneBefore: 'final.beforeBoss', sceneAfter: 'final.afterBoss',
  },
];

export function getEncounter(id: string): EncounterDef {
  const e = ENCOUNTERS.find((x) => x.id === id);
  if (!e) throw new Error(`Unknown encounter "${id}"`);
  return e;
}

export interface ChapterDef { number: number; name: string; encounterIds: string[] }

export const CHAPTERS: ChapterDef[] = [
  { number: 1, name: 'Chapter 1: Snake', encounterIds: ['ch1-s1', 'ch1-s2', 'ch1-s3', 'ch1-s4', 'ch1-s5'] },
  { number: 2, name: 'Chapter 2: Spider', encounterIds: ['ch2-s1', 'ch2-s2', 'ch2-s3', 'ch2-s4', 'ch2-s5'] },
  { number: 3, name: 'Chapter 3: Crocodile', encounterIds: ['ch3-s1', 'ch3-s2', 'ch3-s3', 'ch3-s4', 'ch3-s5'] },
  { number: 4, name: 'Chapter 4: Vulture', encounterIds: ['ch4-s1', 'ch4-s2', 'ch4-s3', 'ch4-s4', 'ch4-s5'] },
  { number: 5, name: 'Chapter 5: Raven', encounterIds: ['ch5-s1', 'ch5-s2', 'ch5-s3', 'ch5-s4', 'ch5-s5'] },
  { number: 6, name: 'Final Chapter: The Old Chief', encounterIds: ['final-s1', 'final-s2'] },
];

export function getChapter(number: number): ChapterDef {
  // A save can advance past the last built chapter (e.g. clearing Chapter 2's boss
  // sets story.chapter to 3). Fall back to the last real chapter, not the first, so
  // the hub keeps showing the player's actual furthest progress instead of resetting
  // the stage list back to Chapter 1.
  return CHAPTERS.find((c) => c.number === number) ?? CHAPTERS[CHAPTERS.length - 1];
}
