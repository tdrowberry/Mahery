import type { Attributes, GemDef, GemKind } from './types';
import { asset } from '../lib/asset';

// Magical gemstones worn on a 5-slot necklace instead of body-slot armor. Every gem is one of
// 5 kinds (one per attribute, plus 'guard' for flat damage reduction) and one of 5 cut levels -
// a level 1 stone is a rough shard, a level 5 stone is a serious, late-game find. Gems are never
// bought or crafted: the only way into the necklace is a monster drop (see loot on EnemyDef).

export const NECKLACE_SLOTS = 5;

// Escalating on purpose - a level 2 stone is worth much more than two level 1s, so a lucky find
// is always worth actually trading in, not just a marginal upgrade.
const ATTR_LEVEL_BONUS = [1, 3, 6, 10, 15];
const GUARD_LEVEL_BONUS = [0.02, 0.04, 0.07, 0.11, 0.16];

// A single gem kind can, in principle, be stacked in all 5 slots - cap the total damage
// reduction from guard stones so a maxed necklace is strong, not literally unhittable.
export const MAX_GUARD_REDUCTION = 0.5;

export const GEM_KIND_LABEL: Record<GemKind, string> = {
  vitality: 'Vitality', strength: 'Strength', instinct: 'Instinct', speed: 'Speed', guard: 'Guard',
};
export const GEM_KIND_COLOR: Record<GemKind, string> = {
  vitality: '#7fbf6a', strength: '#e06b5c', instinct: '#b28ae0', speed: '#e8c15a', guard: '#8fb7e8',
};
export const GEM_KIND_STONE: Record<GemKind, string> = {
  vitality: 'Jade', strength: 'Garnet', instinct: 'Amethyst', speed: 'Citrine', guard: 'Onyx',
};
// Real gem artwork (cropped from the user's reference sheet, see public/art/gems) shown on the
// necklace instead of a flat color swatch. Speed maps to the reference's blue opal rather than
// a yellow citrine - there was no yellow stone in the reference set to match the name.
export const GEM_KIND_ICON: Record<GemKind, string> = {
  vitality: asset('/art/gems/green.png'), strength: asset('/art/gems/red.png'), instinct: asset('/art/gems/purple.png'),
  speed: asset('/art/gems/blue.png'), guard: asset('/art/gems/black.png'),
};
export const LEVEL_LABEL = ['Chipped', 'Set', 'Deep', 'Flawless', 'Radiant'];
const LEVEL_SELL_VALUE = [6, 14, 28, 50, 85];

const LEVEL_FLAVOR = [
  'A rough shard, barely worth mounting. Still, it holds a little of the old power.',
  'Cut and set proper. You can feel the difference when it catches the light.',
  'Color runs all the way through - old stone, taken from something that had held it a long time.',
  'Near flawless. Stones like this don’t turn up twice in a lifetime.',
  'It hums faintly against the skin. Whatever wore this last was not easy to kill.',
];

function makeGemFamily(kind: GemKind): GemDef[] {
  const stone = GEM_KIND_STONE[kind];
  const bonusTable = kind === 'guard' ? GUARD_LEVEL_BONUS : ATTR_LEVEL_BONUS;
  return bonusTable.map((bonus, i) => {
    const level = i + 1;
    return {
      id: `${kind}${level}`,
      name: `${LEVEL_LABEL[i]} ${stone}`,
      flavor: LEVEL_FLAVOR[i],
      kind,
      level,
      bonus,
      sellValue: LEVEL_SELL_VALUE[i],
    };
  });
}

export const GEMS: Record<string, GemDef> = Object.fromEntries(
  (['vitality', 'strength', 'instinct', 'speed', 'guard'] as GemKind[])
    .flatMap(makeGemFamily)
    .map((g) => [g.id, g]),
);

export function getGem(id: string): GemDef {
  const def = GEMS[id];
  if (!def) throw new Error(`Unknown gem "${id}"`);
  return def;
}

// The shop: expensive enough that one purchase is a real, deliberate spend, not a rounding
// error - each level's price is calibrated to roughly a full chapter's worth of Marks income
// (see the "gem shop pricing" check in balance.test.ts), so a player who clears a chapter can
// afford about one gem at that chapter's top available level, not several. Selling off a gem
// you've outgrown still funds only part of the next one.
const SHOP_PRICE = [25, 90, 150, 220, 300];

export function shopPrice(level: number): number {
  return SHOP_PRICE[level - 1] ?? SHOP_PRICE[SHOP_PRICE.length - 1];
}

/** Highest gem level the shop stocks at this point in the story. */
export function shopLevelCap(chapter: number): number {
  return Math.min(5, chapter + 1);
}

/** Every gem currently for sale, cheapest and lowest-level first: all of level 1, then all of
 * level 2, and so on, so the price climbs steadily down the list instead of resetting every
 * time the kind changes. */
export function shopInventory(chapter: number): GemDef[] {
  const cap = shopLevelCap(chapter);
  const kinds: GemKind[] = ['vitality', 'strength', 'instinct', 'speed', 'guard'];
  return Array.from({ length: cap }, (_, i) => i + 1).flatMap((level) => kinds.map((kind) => GEMS[`${kind}${level}`]));
}

/** Sum of every equipped gem's bonus: flat attribute points, plus a capped % damage reduction. */
export function necklaceBonuses(necklace: (string | null)[]): { attrs: Attributes; guardPct: number } {
  const attrs: Attributes = { vitality: 0, strength: 0, instinct: 0, speed: 0 };
  let guardPct = 0;
  for (const id of necklace) {
    if (!id) continue;
    const def = GEMS[id];
    if (!def) continue;
    if (def.kind === 'guard') guardPct += def.bonus;
    else attrs[def.kind] += def.bonus;
  }
  return { attrs, guardPct: Math.min(MAX_GUARD_REDUCTION, guardPct) };
}
