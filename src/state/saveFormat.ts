import type { AnimalId, Attributes } from '../data/types';
import { getAnimal } from '../data/animals';
import { NECKLACE_SLOTS } from '../data/gems';
import {
  ACTION_BAR_SLOTS, BASE_ATTRIBUTES, STARTING_ABILITY_POINTS, STARTING_ATTRIBUTE_POINTS,
  totalAbilityPointsAtLevel,
} from '../data/progression';
import { companionSkillId, sharedSkillId } from '../engine/skills';

// Save file format. Bump SAVE_VERSION and extend migrate() when the shape changes.
// Battle state is never saved.

export const SAVE_VERSION = 4 as const;
export const SAVE_SLOTS = [1, 2, 3] as const;
export type SlotNumber = (typeof SAVE_SLOTS)[number];

interface SaveFileV1 {
  version: 1;
  savedAt: string;
  animalId: AnimalId;
  mahery: {
    level: number;
    xp: number;
    attributes: Attributes;
    abilityPoints: number;
    attributePoints: number;
    marks: number;
    skillRanks: Record<string, number>;
    actionBar: (string | null)[];
  };
  story: {
    chapter: number;
    stage: number;
    clearedStages: string[];
    flags: Record<string, boolean>;
  };
  inventory: {
    items: string[];
    equipment: Partial<Record<string, string | null>>;
  };
}

export interface SaveFileV2 {
  version: 2;
  savedAt: string;
  animalId: AnimalId;
  mahery: {
    level: number;
    xp: number;
    attributes: Attributes;               // raw allocated stats, before gem bonuses
    abilityPoints: number;
    attributePoints: number;
    marks: number;                        // trade currency, from victories and selling gems
    skillRanks: Record<string, number>;   // 'bear.basicStrike' -> 1..3, absent = locked
    actionBar: (string | null)[];         // length ACTION_BAR_SLOTS
  };
  story: {
    chapter: number;
    stage: number;
    clearedStages: string[];
    flags: Record<string, boolean>;
  };
  inventory: {
    items: string[];                    // owned, unequipped gem ids (duplicates allowed)
    necklace: (string | null)[];        // length NECKLACE_SLOTS, one gem id per slot or empty
  };
}

export interface SaveFileV3 {
  version: 3;
  savedAt: string;
  animalId: AnimalId;
  mahery: {
    level: number;
    xp: number;
    attributes: Attributes;               // raw allocated stats, before gem/passive bonuses
    abilityPoints: number;
    attributePoints: number;
    marks: number;                        // trade currency, from victories and selling gems
    skillRanks: Record<string, number>;   // 'bear.basicStrike' -> 1..3, absent = locked
    actionBar: (string | null)[];         // length ACTION_BAR_SLOTS
    passives: string[];                   // chosen passive ids, one per reached choice point
  };
  story: {
    chapter: number;
    stage: number;
    clearedStages: string[];
    flags: Record<string, boolean>;
  };
  inventory: {
    items: string[];                    // owned, unequipped gem ids (duplicates allowed)
    necklace: (string | null)[];        // length NECKLACE_SLOTS, one gem id per slot or empty
  };
}

export interface SaveFileV4 {
  version: 4;
  savedAt: string;
  animalId: AnimalId;
  mahery: {
    level: number;
    xp: number;
    attributes: Attributes;               // raw allocated stats, before gem/passive bonuses
    abilityPoints: number;
    attributePoints: number;
    marks: number;                        // trade currency, from victories and selling gems
    skillRanks: Record<string, number>;   // 'bear.basicStrike' -> 1..3, absent = locked
    actionBar: (string | null)[];         // length ACTION_BAR_SLOTS
    passives: string[];                   // chosen passive ids, one per reached choice point
  };
  /** The bonded animal's own tree, independent of Mahery's - same skill pool (it's the same
   * animal), separately unlocked and separately equipped, so the two fighters play differently
   * even though they draw from the same 12 moves. No attributes here on purpose: those still
   * scale automatically off Mahery's own (see COMPANION_RATIOS in data/companion.ts) - only
   * which moves it knows and which 6 it's actually carrying are the player's call. */
  companion: {
    abilityPoints: number;
    skillRanks: Record<string, number>;
    actionBar: (string | null)[];
  };
  story: {
    chapter: number;
    stage: number;
    clearedStages: string[];
    flags: Record<string, boolean>;
  };
  inventory: {
    items: string[];                    // owned, unequipped gem ids (duplicates allowed)
    necklace: (string | null)[];        // length NECKLACE_SLOTS, one gem id per slot or empty
  };
}

export type SaveFile = SaveFileV4;

export const slotKey = (slot: SlotNumber) => `mahery.save.${slot}`;

export function createNewSave(animalId: AnimalId): SaveFile {
  const animal = getAnimal(animalId);
  const attributes: Attributes = {
    vitality: BASE_ATTRIBUTES.vitality + animal.baseStatMods.vitality,
    strength: BASE_ATTRIBUTES.strength + animal.baseStatMods.strength,
    instinct: BASE_ATTRIBUTES.instinct + animal.baseStatMods.instinct,
    speed: BASE_ATTRIBUTES.speed + animal.baseStatMods.speed,
  };
  const basic = sharedSkillId(animalId, 'basicStrike');
  const actionBar: (string | null)[] = Array(ACTION_BAR_SLOTS).fill(null);
  actionBar[0] = basic;
  const companionBasic = companionSkillId(animalId, 'nudge');
  const companionActionBar: (string | null)[] = Array(ACTION_BAR_SLOTS).fill(null);
  companionActionBar[0] = companionBasic;
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    animalId,
    mahery: {
      level: 1,
      xp: 0,
      attributes,
      abilityPoints: STARTING_ABILITY_POINTS,
      attributePoints: STARTING_ATTRIBUTE_POINTS,
      marks: 0,
      skillRanks: { [basic]: 1 },
      actionBar,
      passives: [],
    },
    companion: {
      abilityPoints: STARTING_ABILITY_POINTS,
      skillRanks: { [companionBasic]: 1 },
      actionBar: companionActionBar,
    },
    story: { chapter: 1, stage: 1, clearedStages: [], flags: {} },
    inventory: { items: [], necklace: Array(NECKLACE_SLOTS).fill(null) },
  };
}

/** Upgrade any older save shape to the current one. Returns null for garbage. */
export function migrate(raw: unknown): SaveFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { version?: number };
  switch (r.version) {
    case 1: {
      // v1's gear was body-slot armor (headband/arm guards/...); v2 replaced it outright with
      // necklace gems, and the old item ids don't mean anything under the new system, so this
      // migration keeps everything about the run except the old bag/equipped gear, which is
      // dropped rather than mistranslated.
      const s = raw as SaveFileV1;
      if (!s.mahery || !s.story || !s.animalId) return null;
      s.mahery.marks ??= 0;
      s.story.flags ??= {};
      s.story.clearedStages ??= [];
      while (s.mahery.actionBar.length < ACTION_BAR_SLOTS) s.mahery.actionBar.push(null);
      // Carry it forward the rest of the way (v2 -> v3) instead of duplicating that logic here.
      return migrate({
        ...s,
        version: 2,
        inventory: { items: [], necklace: Array(NECKLACE_SLOTS).fill(null) },
      });
    }
    case 2: {
      // v2 had no passive perks at all - nothing to translate, everyone just starts with none
      // and can pick them up naturally as they reach the chain's choice points.
      const s = raw as SaveFileV2;
      if (!s.mahery || !s.story || !s.animalId) return null;
      s.inventory ??= { items: [], necklace: Array(NECKLACE_SLOTS).fill(null) };
      s.inventory.items ??= [];
      s.inventory.necklace ??= Array(NECKLACE_SLOTS).fill(null);
      while (s.inventory.necklace.length < NECKLACE_SLOTS) s.inventory.necklace.push(null);
      s.mahery.marks ??= 0;
      s.story.flags ??= {};
      s.story.clearedStages ??= [];
      while (s.mahery.actionBar.length < ACTION_BAR_SLOTS) s.mahery.actionBar.push(null);
      // Carry it forward the rest of the way (v3 -> v4) instead of duplicating that logic here.
      return migrate({ ...s, version: 3, mahery: { ...s.mahery, passives: [] } });
    }
    case 3: {
      const s = raw as SaveFileV3;
      if (!s.mahery || !s.story || !s.animalId) return null;
      s.inventory ??= { items: [], necklace: Array(NECKLACE_SLOTS).fill(null) };
      s.inventory.items ??= [];
      s.inventory.necklace ??= Array(NECKLACE_SLOTS).fill(null);
      while (s.inventory.necklace.length < NECKLACE_SLOTS) s.inventory.necklace.push(null);
      s.mahery.marks ??= 0;
      s.mahery.passives ??= [];
      s.story.flags ??= {};
      s.story.clearedStages ??= [];
      while (s.mahery.actionBar.length < ACTION_BAR_SLOTS) s.mahery.actionBar.push(null);
      // The companion's tree is brand new - back it with the same Ability Point budget Mahery
      // would have earned by this level (see totalAbilityPointsAtLevel) rather than zero, so a
      // save that's already deep into the story doesn't suddenly have a companion stuck on
      // Nudge. Nothing pre-spent: the player picks the build fresh.
      const companionBasic = companionSkillId(s.animalId, 'nudge');
      const actionBar: (string | null)[] = Array(ACTION_BAR_SLOTS).fill(null);
      actionBar[0] = companionBasic;
      return {
        ...s,
        version: 4,
        companion: { abilityPoints: totalAbilityPointsAtLevel(s.mahery.level), skillRanks: { [companionBasic]: 1 }, actionBar },
      };
    }
    case 4: {
      const s = raw as SaveFileV4;
      if (!s.mahery || !s.story || !s.animalId || !s.companion) return null;
      s.inventory ??= { items: [], necklace: Array(NECKLACE_SLOTS).fill(null) };
      s.inventory.items ??= [];
      s.inventory.necklace ??= Array(NECKLACE_SLOTS).fill(null);
      while (s.inventory.necklace.length < NECKLACE_SLOTS) s.inventory.necklace.push(null);
      s.mahery.marks ??= 0;
      s.mahery.passives ??= [];
      s.story.flags ??= {};
      s.story.clearedStages ??= [];
      while (s.mahery.actionBar.length < ACTION_BAR_SLOTS) s.mahery.actionBar.push(null);
      while (s.companion.actionBar.length < ACTION_BAR_SLOTS) s.companion.actionBar.push(null);
      return s;
    }
    default:
      return null;
  }
}

const storage = (): Storage | null => {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
};

export function loadSlot(slot: SlotNumber): SaveFile | null {
  const st = storage();
  if (!st) return null;
  const text = st.getItem(slotKey(slot));
  if (!text) return null;
  try { return migrate(JSON.parse(text)); } catch { return null; }
}

export function writeSlot(slot: SlotNumber, save: SaveFile): SaveFile {
  const stamped = { ...save, savedAt: new Date().toISOString() };
  storage()?.setItem(slotKey(slot), JSON.stringify(stamped));
  return stamped;
}

export function clearSlot(slot: SlotNumber) {
  storage()?.removeItem(slotKey(slot));
}

export function listSlots(): { slot: SlotNumber; save: SaveFile | null }[] {
  return SAVE_SLOTS.map((slot) => ({ slot, save: loadSlot(slot) }));
}
