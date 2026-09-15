// Scenic backgrounds for the story and battle screens, one per chapter. Only 4 source photos
// exist for 6 chapters, so 5 and 6 reuse 2 and 3's photos with a CSS tint (see .field-bg.tint-*
// / .story-bg.tint-* in global.css) so they still read as a different place and time of day.
export const CHAPTER_BACKGROUNDS: Record<number, { url: string; tint?: 'dark' | 'warm' }> = {
  1: { url: '/art/backgrounds/prairie-river-sunset.jpg' },   // Snake: the open road
  2: { url: '/art/backgrounds/forest-stream.jpg' },          // Spider: the webbed forest
  3: { url: '/art/backgrounds/mountain-river-valley.jpg' },  // Crocodile: the river crossing
  4: { url: '/art/backgrounds/icy-tundra.jpg' },             // Vulture: bleak, at his weakest
  5: { url: '/art/backgrounds/forest-stream.jpg', tint: 'dark' }, // Raven: the black canopy
  6: { url: '/art/backgrounds/mountain-river-valley.jpg', tint: 'warm' }, // Final: the chief's fire
};

/** A scene id like 'ch3.beforeBoss' or 'final.afterStage1' belongs to chapter 3 / 6. Prologue
 * and bond-choice scenes have no chapter yet and get no photo background. */
export function chapterForSceneId(sceneId: string | undefined): number | null {
  if (!sceneId) return null;
  const chMatch = /^ch(\d+)\./.exec(sceneId);
  if (chMatch) return Number(chMatch[1]);
  if (sceneId.startsWith('final.') || sceneId.startsWith('ending.')) return 6;
  return null;
}
