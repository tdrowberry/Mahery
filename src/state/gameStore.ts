import { create } from 'zustand';
import type { AnimalId, Attributes, DialogueLine, EncounterDef, Stance } from '../data/types';
import { getAnimal } from '../data/animals';
import { createRoamingEncounter, getChapter, getEncounter } from '../data/encounters';
import { getEnemy } from '../data/enemies';
import { getGem, MAX_GUARD_REDUCTION, necklaceBonuses, shopPrice } from '../data/gems';
import { pendingChoicePoints, passiveBonuses } from '../data/passives';
import { getScene, PROLOGUE_WAKE } from '../data/story';
import {
  ACTION_BAR_SLOTS, BASE_ATTRIBUTES, companionAbilityPointsForLevels, gainXp, MAX_RANK, RANK_COST, respecCost,
} from '../data/progression';
import {
  checkUnlock, companionSkillId, findCompanionSkill, findSkill, getAnimalSkills, getCompanionSkills, sharedSkillId,
} from '../engine/skills';
import {
  advance, createBattle, playerSelectUnit, playerUseSkill, playerWait,
  setAllyStance as setAllyStanceEngine, type BattleState,
} from '../engine/combat';
import {
  clearSlot, createNewSave, loadSlot, writeSlot, type SaveFile, type SlotNumber,
} from './saveFormat';

export type Screen = 'title' | 'story' | 'bond' | 'hub' | 'skills' | 'battle' | 'results' | 'inventory' | 'shop' | 'ending';

export interface Dialogue {
  lines: DialogueLine[];
  index: number;
  then: 'hub' | 'battle' | 'bond' | 'choice';
  /** the scene id this came from (e.g. 'ch2.afterBoss'), so the story screen can pick a
   * background for the chapter the SCENE belongs to - not save.story.chapter, which can
   * already have advanced to the next chapter by the time an "after boss" scene plays. */
  sceneId?: string;
}

export interface BattleResults {
  encounterId: string;
  encounterName: string;
  xp: number;
  levelsGained: number;
  newLevel: number;
  abilityPointsGained: number;
  attributePointsGained: number;
  firstClear: boolean;
  marksGained: number;
  droppedItems: string[];
  chapterAdvanced: boolean;
}

interface GameState {
  slot: SlotNumber | null;
  /** slot reserved for a new game whose bond has not been chosen yet */
  pendingSlot: SlotNumber | null;
  save: SaveFile | null;
  screen: Screen;
  dialogue: Dialogue | null;
  pendingEncounterId: string | null;
  battle: BattleState | null;
  results: BattleResults | null;
  /** the currently-active generated off-road fight, if `battle.encounterId` points at one -
   * kept alongside `battle` since roaming encounters aren't in the static ENCOUNTERS list. */
  roamingEncounter: EncounterDef | null;

  // navigation
  goTo: (screen: Screen) => void;
  newGame: (slot: SlotNumber) => void;
  chooseBond: (animalId: AnimalId) => void;
  continueGame: (slot: SlotNumber) => void;
  deleteSave: (slot: SlotNumber) => void;
  quitToTitle: () => void;

  // story
  advanceDialogue: () => void;

  // progression
  unlockSkill: (skillId: string) => string | null;
  spendAttribute: (attr: keyof Attributes) => void;
  setActionBarSlot: (slotIndex: number, skillId: string | null) => void;
  /** Refunds every spent Ability and Attribute Point (for a Marks fee) and clears the action
   * bar back to just the free Basic Strike, so the whole build can be redone from scratch. */
  resetSkillTree: () => string | null;
  /** locks in one of a reached choice point's two passive perks, permanently (until a respec) */
  choosePassive: (choiceId: string, passiveId: string) => string | null;

  // companion progression - its own tree and action bar, same skill pool as Mahery's animal but
  // unlocked and equipped independently. No attributes here: those still scale automatically
  // off Mahery's own (see COMPANION_RATIOS), only its moveset is the player's call.
  unlockCompanionSkill: (skillId: string) => string | null;
  setCompanionActionBarSlot: (slotIndex: number, skillId: string | null) => void;
  /** Refunds every spent companion Ability Point (for a Marks fee) and clears its action bar
   * back to just the free Basic Strike. */
  resetCompanionSkillTree: () => string | null;

  // necklace gems
  /** equips into the first empty necklace slot; no-op if the necklace is already full */
  equipGem: (itemId: string) => void;
  unequipGem: (slotIndex: number) => void;
  sellItem: (itemId: string) => void;

  // shop
  buyGem: (gemId: string) => string | null;

  // battle
  startEncounter: (encounterId: string) => void;
  startRoamingEncounter: () => void;
  battleUseSkill: (skillId: string, targetId?: string) => void;
  battleSelect: (unitId: 'mahery' | 'companion') => void;
  battleSetStance: (stance: Stance) => void;
  battleWait: () => void;
  battleAdvance: () => void;
  retryBattle: () => void;
  leaveBattle: () => void;
  finishBattle: () => void;
  closeResults: () => void;
  chooseEnding: (kind: 'kill' | 'banish') => void;
}

function persist(get: () => GameState, save: SaveFile): SaveFile {
  const slot = get().slot;
  return slot ? writeSlot(slot, save) : save;
}

/** Mahery's stats as they'll actually fight with: raw allocated points plus necklace gems. */
export function effectiveMaheryAttributes(save: SaveFile): Attributes {
  const bonus = necklaceBonuses(save.inventory.necklace).attrs;
  const raw = save.mahery.attributes;
  return {
    vitality: raw.vitality + bonus.vitality,
    strength: raw.strength + bonus.strength,
    instinct: raw.instinct + bonus.instinct,
    speed: raw.speed + bonus.speed,
  };
}

/** Fraction (0..1) of incoming damage reduced by necklace guard gems plus a Thick Scales-style
 * passive, if chosen - both feed the same pool and share the one cap. */
export function effectiveDamageReductionPct(save: SaveFile): number {
  const necklacePct = necklaceBonuses(save.inventory.necklace).guardPct;
  const passivePct = passiveBonuses(save.mahery.passives).damageReductionPct;
  return Math.min(MAX_GUARD_REDUCTION, necklacePct + passivePct);
}

/** Every passive perk's bonuses, summed - see src/data/passives.ts. */
export function effectivePassiveBonuses(save: SaveFile) {
  return passiveBonuses(save.mahery.passives);
}

export const useGame = create<GameState>((set, get) => ({
  slot: null,
  pendingSlot: null,
  save: null,
  screen: 'title',
  dialogue: null,
  pendingEncounterId: null,
  battle: null,
  results: null,
  roamingEncounter: null,

  goTo: (screen) => set({ screen }),

  // New game: Mahery wakes (no bond yet), then the player chooses the animal.
  newGame: (slot) => {
    clearSlot(slot);
    set({
      slot: null, pendingSlot: slot, save: null, battle: null, results: null,
      dialogue: { lines: PROLOGUE_WAKE, index: 0, then: 'bond', sceneId: 'prologue.wake' },
      screen: 'story',
    });
  },

  chooseBond: (animalId) => {
    const slot = get().pendingSlot;
    if (!slot) return;
    const save = writeSlot(slot, createNewSave(animalId));
    const animal = getAnimal(animalId);
    set({
      slot, pendingSlot: null, save,
      dialogue: { lines: getScene('prologue.bond', animal), index: 0, then: 'hub', sceneId: 'prologue.bond' },
      screen: 'story',
    });
  },

  continueGame: (slot) => {
    const save = loadSlot(slot);
    if (!save) return;
    set({ slot, save, screen: 'hub', battle: null, results: null, dialogue: null, pendingSlot: null });
  },

  deleteSave: (slot) => {
    clearSlot(slot);
    if (get().slot === slot) set({ slot: null, save: null });
  },

  quitToTitle: () => set({ screen: 'title', battle: null, dialogue: null, results: null, pendingEncounterId: null, pendingSlot: null }),

  advanceDialogue: () => {
    const { dialogue, save } = get();
    if (!dialogue) return;
    if (dialogue.index + 1 < dialogue.lines.length) {
      set({ dialogue: { ...dialogue, index: dialogue.index + 1 } });
      return;
    }
    if (dialogue.then === 'bond') {
      set({ dialogue: null, screen: 'bond' });
      return;
    }
    if (dialogue.then === 'battle' && get().pendingEncounterId) {
      const id = get().pendingEncounterId!;
      set({ dialogue: null });
      beginBattle(set, get, id);
      return;
    }
    if (dialogue.then === 'choice') {
      set({ dialogue: null, screen: 'ending' });
      return;
    }
    if (save) persist(get, save);
    set({ dialogue: null, screen: 'hub' });
  },

  unlockSkill: (skillId) => {
    const { save } = get();
    if (!save) return 'No save loaded.';
    const animal = getAnimal(save.animalId);
    const all = getAnimalSkills(animal);
    const def = findSkill(animal, skillId);
    if (!def) return 'Unknown skill.';
    const check = checkUnlock(def, save.mahery.skillRanks, save.mahery.level, save.mahery.abilityPoints, RANK_COST, all);
    if (!check.ok) return check.reason ?? 'Cannot unlock.';
    const skillRanks = { ...save.mahery.skillRanks, [skillId]: Math.min(MAX_RANK, check.nextRank) };
    const next: SaveFile = {
      ...save,
      mahery: { ...save.mahery, skillRanks, abilityPoints: save.mahery.abilityPoints - RANK_COST },
    };
    set({ save: persist(get, next) });
    return null;
  },

  spendAttribute: (attr) => {
    const { save } = get();
    if (!save || save.mahery.attributePoints <= 0) return;
    const next: SaveFile = {
      ...save,
      mahery: {
        ...save.mahery,
        attributes: { ...save.mahery.attributes, [attr]: save.mahery.attributes[attr] + 1 },
        attributePoints: save.mahery.attributePoints - 1,
      },
    };
    set({ save: persist(get, next) });
  },

  resetSkillTree: () => {
    const { save } = get();
    if (!save) return 'No save loaded.';
    const cost = respecCost(save.mahery.level);
    if (save.mahery.marks < cost) return `Not enough Marks (needs ${cost}).`;

    const animal = getAnimal(save.animalId);
    const baseAttributes: Attributes = {
      vitality: BASE_ATTRIBUTES.vitality + animal.baseStatMods.vitality,
      strength: BASE_ATTRIBUTES.strength + animal.baseStatMods.strength,
      instinct: BASE_ATTRIBUTES.instinct + animal.baseStatMods.instinct,
      speed: BASE_ATTRIBUTES.speed + animal.baseStatMods.speed,
    };
    const basic = sharedSkillId(save.animalId, 'basicStrike');
    // Every rank ever bought cost exactly RANK_COST, except Basic Strike's first rank, which
    // is free from character creation - refund everything else.
    const ranksSpent = Object.values(save.mahery.skillRanks).reduce((sum, r) => sum + r, 0) - 1;
    const attrSpent = (Object.keys(baseAttributes) as (keyof Attributes)[])
      .reduce((sum, k) => sum + (save.mahery.attributes[k] - baseAttributes[k]), 0);

    const next: SaveFile = {
      ...save,
      mahery: {
        ...save.mahery,
        marks: save.mahery.marks - cost,
        abilityPoints: save.mahery.abilityPoints + Math.max(0, ranksSpent) * RANK_COST,
        attributePoints: save.mahery.attributePoints + Math.max(0, attrSpent),
        attributes: baseAttributes,
        skillRanks: { [basic]: 1 },
        actionBar: [basic, ...Array(ACTION_BAR_SLOTS - 1).fill(null)],
        passives: [],
      },
    };
    set({ save: persist(get, next) });
    return null;
  },

  choosePassive: (choiceId, passiveId) => {
    const { save } = get();
    if (!save) return 'No save loaded.';
    const point = pendingChoicePoints(save.animalId, save.mahery.skillRanks, save.mahery.passives)
      .find((p) => p.id === choiceId);
    if (!point) return 'That choice is not available.';
    if (!point.options.some((o) => o.id === passiveId)) return 'Not one of the options for this choice.';
    const next: SaveFile = {
      ...save,
      mahery: { ...save.mahery, passives: [...save.mahery.passives, passiveId] },
    };
    set({ save: persist(get, next) });
    return null;
  },

  setActionBarSlot: (slotIndex, skillId) => {
    const { save } = get();
    if (!save) return;
    const actionBar = [...save.mahery.actionBar];
    if (skillId) {
      if ((save.mahery.skillRanks[skillId] ?? 0) < 1) return;
      // a skill can only sit in one slot
      const existing = actionBar.indexOf(skillId);
      if (existing >= 0 && existing !== slotIndex) actionBar[existing] = actionBar[slotIndex];
    }
    actionBar[slotIndex] = skillId;
    set({ save: persist(get, { ...save, mahery: { ...save.mahery, actionBar } }) });
  },

  unlockCompanionSkill: (skillId) => {
    const { save } = get();
    if (!save) return 'No save loaded.';
    const animal = getAnimal(save.animalId);
    const all = getCompanionSkills(animal);
    const def = findCompanionSkill(animal, skillId);
    if (!def) return 'Unknown skill.';
    const check = checkUnlock(def, save.companion.skillRanks, save.mahery.level, save.companion.abilityPoints, RANK_COST, all);
    if (!check.ok) return check.reason ?? 'Cannot unlock.';
    const skillRanks = { ...save.companion.skillRanks, [skillId]: Math.min(MAX_RANK, check.nextRank) };
    const next: SaveFile = {
      ...save,
      companion: { ...save.companion, skillRanks, abilityPoints: save.companion.abilityPoints - RANK_COST },
    };
    set({ save: persist(get, next) });
    return null;
  },

  setCompanionActionBarSlot: (slotIndex, skillId) => {
    const { save } = get();
    if (!save) return;
    const actionBar = [...save.companion.actionBar];
    if (skillId) {
      if ((save.companion.skillRanks[skillId] ?? 0) < 1) return;
      const existing = actionBar.indexOf(skillId);
      if (existing >= 0 && existing !== slotIndex) actionBar[existing] = actionBar[slotIndex];
    }
    actionBar[slotIndex] = skillId;
    set({ save: persist(get, { ...save, companion: { ...save.companion, actionBar } }) });
  },

  resetCompanionSkillTree: () => {
    const { save } = get();
    if (!save) return 'No save loaded.';
    const cost = respecCost(save.mahery.level);
    if (save.mahery.marks < cost) return `Not enough Marks (needs ${cost}).`;
    const basic = companionSkillId(save.animalId, 'nudge');
    const ranksSpent = Object.values(save.companion.skillRanks).reduce((sum, r) => sum + r, 0) - 1;
    const next: SaveFile = {
      ...save,
      mahery: { ...save.mahery, marks: save.mahery.marks - cost },
      companion: {
        abilityPoints: save.companion.abilityPoints + Math.max(0, ranksSpent) * RANK_COST,
        skillRanks: { [basic]: 1 },
        actionBar: [basic, ...Array(ACTION_BAR_SLOTS - 1).fill(null)],
      },
    };
    set({ save: persist(get, next) });
    return null;
  },

  equipGem: (itemId) => {
    const { save } = get();
    if (!save) return;
    const idx = save.inventory.items.indexOf(itemId);
    if (idx === -1) return;
    const slotIndex = save.inventory.necklace.indexOf(null);
    if (slotIndex === -1) return; // necklace full - unequip one first
    const items = [...save.inventory.items];
    items.splice(idx, 1);
    const necklace = [...save.inventory.necklace];
    necklace[slotIndex] = itemId;
    set({ save: persist(get, { ...save, inventory: { items, necklace } }) });
  },

  unequipGem: (slotIndex) => {
    const { save } = get();
    if (!save) return;
    const itemId = save.inventory.necklace[slotIndex];
    if (!itemId) return;
    const items = [...save.inventory.items, itemId];
    const necklace = [...save.inventory.necklace];
    necklace[slotIndex] = null;
    set({ save: persist(get, { ...save, inventory: { items, necklace } }) });
  },

  sellItem: (itemId) => {
    const { save } = get();
    if (!save) return;
    const idx = save.inventory.items.indexOf(itemId);
    if (idx === -1) return;
    const def = getGem(itemId);
    const items = [...save.inventory.items];
    items.splice(idx, 1);
    set({
      save: persist(get, {
        ...save,
        mahery: { ...save.mahery, marks: save.mahery.marks + def.sellValue },
        inventory: { ...save.inventory, items },
      }),
    });
  },

  buyGem: (gemId) => {
    const { save } = get();
    if (!save) return 'No save loaded.';
    const def = getGem(gemId);
    const price = shopPrice(def.level);
    if (save.mahery.marks < price) return 'Not enough Marks.';
    set({
      save: persist(get, {
        ...save,
        mahery: { ...save.mahery, marks: save.mahery.marks - price },
        inventory: { ...save.inventory, items: [...save.inventory.items, gemId] },
      }),
    });
    return null;
  },

  startEncounter: (encounterId) => {
    const { save } = get();
    if (!save) return;
    const enc = getEncounter(encounterId);
    const animal = getAnimal(save.animalId);
    const sceneKey = enc.sceneBefore ? `seen:${enc.sceneBefore}` : null;
    if (enc.sceneBefore && sceneKey && !save.story.flags[sceneKey]) {
      const next: SaveFile = { ...save, story: { ...save.story, flags: { ...save.story.flags, [sceneKey]: true } } };
      set({
        save: persist(get, next),
        pendingEncounterId: encounterId,
        dialogue: { lines: getScene(enc.sceneBefore, animal), index: 0, then: 'battle', sceneId: enc.sceneBefore },
        screen: 'story',
      });
      return;
    }
    beginBattle(set, get, encounterId);
  },

  startRoamingEncounter: () => {
    const { save } = get();
    if (!save) return;
    const enc = createRoamingEncounter(save.story.chapter);
    set({ roamingEncounter: enc });
    beginBattle(set, get, enc.id);
  },

  battleUseSkill: (skillId, targetId) => {
    const { battle } = get();
    if (!battle) return;
    set({ battle: playerUseSkill(battle, skillId, targetId) });
  },

  battleSelect: (unitId) => {
    const { battle } = get();
    if (!battle) return;
    set({ battle: playerSelectUnit(battle, unitId) });
  },

  battleSetStance: (stance) => {
    const { battle } = get();
    if (!battle) return;
    set({ battle: setAllyStanceEngine(battle, stance) });
  },

  battleWait: () => {
    const { battle } = get();
    if (!battle) return;
    set({ battle: playerWait(battle) });
  },

  battleAdvance: () => {
    const { battle } = get();
    if (!battle) return;
    set({ battle: advance(battle) });
  },

  retryBattle: () => {
    const { battle } = get();
    if (!battle) return;
    beginBattle(set, get, battle.encounterId);
  },

  leaveBattle: () => set({ battle: null, roamingEncounter: null, pendingEncounterId: null, screen: 'hub' }),

  finishBattle: () => {
    const { battle, save } = get();
    if (!battle || !save || battle.phase !== 'victory') return;
    const enc = resolveEncounter(get().roamingEncounter, battle.encounterId);

    // Loot and marks roll fresh on every clear, so replaying a stage (or another roaming
    // fight) stays worth doing. Guaranteed boss loot is the one exception - it's a one-time
    // "you beat this fight specifically" reward, not something to hand out on every replay.
    const firstClear = !enc.isRoaming && !save.story.clearedStages.includes(enc.id);
    let marksGained = 0;
    const droppedItems: string[] = [];
    for (const enemyId of enc.enemyIds) {
      const def = getEnemy(enemyId);
      marksGained += def.marksReward ?? 0;
      for (const drop of def.loot ?? []) {
        if (Math.random() < drop.chance) droppedItems.push(drop.itemId);
      }
      if (enc.isBoss && firstClear && def.guaranteedLoot) droppedItems.push(def.guaranteedLoot);
    }

    if (enc.isRoaming) {
      // Off the road entirely: Marks, XP and any loot, but no story progress of any kind.
      const { state: lv, levelsGained } = gainXp(
        { level: save.mahery.level, xp: save.mahery.xp, abilityPoints: save.mahery.abilityPoints, attributePoints: save.mahery.attributePoints },
        enc.xpReward,
      );
      const next: SaveFile = {
        ...save,
        mahery: { ...save.mahery, ...lv, marks: save.mahery.marks + marksGained },
        companion: {
          ...save.companion,
          abilityPoints: save.companion.abilityPoints + companionAbilityPointsForLevels(save.mahery.level, levelsGained),
        },
        inventory: { ...save.inventory, items: [...save.inventory.items, ...droppedItems] },
      };
      // roamingEncounter stays in state until closeResults - the Results screen still needs
      // to resolve encounterId back to a name/chapter for anything that looks it up again.
      set({
        save: persist(get, next),
        results: {
          encounterId: enc.id, encounterName: enc.name, xp: enc.xpReward, levelsGained, newLevel: lv.level,
          abilityPointsGained: lv.abilityPoints - save.mahery.abilityPoints,
          attributePointsGained: lv.attributePoints - save.mahery.attributePoints,
          firstClear: false, marksGained, droppedItems, chapterAdvanced: false,
        },
        battle: null,
        screen: 'results',
      });
      return;
    }

    const { state: lv, levelsGained } = gainXp(
      { level: save.mahery.level, xp: save.mahery.xp, abilityPoints: save.mahery.abilityPoints, attributePoints: save.mahery.attributePoints },
      enc.xpReward,
    );
    const clearedStages = firstClear ? [...save.story.clearedStages, enc.id] : save.story.clearedStages;

    let story = { ...save.story, clearedStages, stage: Math.max(save.story.stage, enc.stage + 1) };
    let chapterAdvanced = false;
    if (enc.isBoss && firstClear && enc.chapter === save.story.chapter) {
      const chapterDef = getChapter(enc.chapter);
      if (chapterDef.encounterIds.every((id) => clearedStages.includes(id))) {
        story = { ...story, chapter: save.story.chapter + 1, stage: 1 };
        chapterAdvanced = true;
      }
    }

    const next: SaveFile = {
      ...save,
      mahery: { ...save.mahery, ...lv, marks: save.mahery.marks + marksGained },
      companion: {
        ...save.companion,
        abilityPoints: save.companion.abilityPoints + companionAbilityPointsForLevels(save.mahery.level, levelsGained),
      },
      story,
      inventory: { ...save.inventory, items: [...save.inventory.items, ...droppedItems] },
    };
    set({
      save: persist(get, next),
      results: {
        encounterId: enc.id, encounterName: enc.name, xp: enc.xpReward, levelsGained, newLevel: lv.level,
        abilityPointsGained: lv.abilityPoints - save.mahery.abilityPoints,
        attributePointsGained: lv.attributePoints - save.mahery.attributePoints,
        firstClear, marksGained, droppedItems, chapterAdvanced,
      },
      battle: null,
      screen: 'results',
    });
  },

  closeResults: () => {
    const { results, save } = get();
    if (!results || !save) { set({ results: null, screen: 'hub' }); return; }
    if (get().roamingEncounter?.id === results.encounterId) {
      set({ results: null, roamingEncounter: null, screen: 'hub' });
      return;
    }
    const enc = getEncounter(results.encounterId);
    const animal = getAnimal(save.animalId);
    const sceneKey = enc.sceneAfter ? `seen:${enc.sceneAfter}` : null;
    if (enc.sceneAfter && sceneKey && !save.story.flags[sceneKey]) {
      const next: SaveFile = { ...save, story: { ...save.story, flags: { ...save.story.flags, [sceneKey]: true } } };
      set({
        save: persist(get, next),
        results: null,
        dialogue: { lines: getScene(enc.sceneAfter, animal), index: 0, then: enc.id === 'final-s2' ? 'choice' : 'hub', sceneId: enc.sceneAfter },
        screen: 'story',
      });
      return;
    }
    set({ results: null, screen: 'hub' });
  },

  chooseEnding: (kind) => {
    const { save } = get();
    if (!save) return;
    const animal = getAnimal(save.animalId);
    const next: SaveFile = { ...save, story: { ...save.story, flags: { ...save.story.flags, [`ending:${kind}`]: true } } };
    set({
      save: persist(get, next),
      dialogue: { lines: getScene(kind === 'kill' ? 'ending.kill' : 'ending.banish', animal), index: 0, then: 'hub', sceneId: `ending.${kind}` },
      screen: 'story',
    });
  },
}));

/** `encounterId` is either a real story stage (looked up normally) or the id of the one
 * generated roaming fight currently stored in state - roaming ids never live in ENCOUNTERS.
 * Exported so screens that need the encounter mid-battle (BattleScreen) can resolve it too. */
export function resolveEncounter(roaming: EncounterDef | null, encounterId: string): EncounterDef {
  return roaming && roaming.id === encounterId ? roaming : getEncounter(encounterId);
}

function beginBattle(
  set: (partial: Partial<GameState>) => void,
  get: () => GameState,
  encounterId: string,
) {
  const { save } = get();
  if (!save) return;
  const enc = resolveEncounter(get().roamingEncounter, encounterId);
  const animal = getAnimal(save.animalId);
  const passive = effectivePassiveBonuses(save);
  const battle = createBattle({
    encounterId,
    animal,
    mahery: {
      attributes: effectiveMaheryAttributes(save),
      skillRanks: save.mahery.skillRanks,
      actionBar: save.mahery.actionBar,
      damageReductionPct: effectiveDamageReductionPct(save),
      maxHealthPct: passive.maxHealthPct,
      spiritCostReduction: passive.spiritCostReduction,
      critChanceBonus: passive.critChanceBonus,
      evasionBonus: passive.evasionBonus,
      spiritRegenBonus: passive.spiritRegenBonus,
    },
    companion: { skillRanks: save.companion.skillRanks, actionBar: save.companion.actionBar },
    enemies: enc.enemyIds.map(getEnemy),
    seed: Date.now() % 2147483647,
  });
  // run until it's the player's turn so the screen opens ready to act
  let s = battle;
  let guard = 0;
  while (s.phase !== 'playerTurn' && s.phase !== 'victory' && s.phase !== 'defeat' && guard++ < 80) s = advance(s);
  set({ battle: s, screen: 'battle', pendingEncounterId: null, dialogue: null });
}
