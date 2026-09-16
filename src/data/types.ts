// Shared types for all game data. UI components never hold skill numbers;
// everything flows from data/ through engine/.

export type Scaling = 'strength' | 'instinct' | 'vitality';
export type TargetRule = 'enemy' | 'allEnemies' | 'self' | 'ally';
export type SharedKind =
  | 'basicStrike' | 'guardStance' | 'instinctSurge' | 'secondWind'
  | 'powerStrike' | 'weaken' | 'rally'
  | 'secondBreath' | 'quickStrike' | 'rendingClaw' | 'hamstring';

/** How the party member you are not directly controlling picks its moves each turn. */
export type Stance = 'aggressive' | 'balanced' | 'support';

export type AnimalId =
  | 'bear' | 'moose' | 'boar' | 'wolf' | 'elk' | 'platypus'
  | 'mountainLion' | 'bobcat' | 'buffalo' | 'eagle' | 'falcon';

/** Stick-figure drawings available in components/Sprite.tsx */
export type ArtId =
  | 'mahery' | 'mahery-bear' | 'mahery-moose' | 'mahery-boar' | 'mahery-wolf' | 'mahery-elk'
  | 'mahery-mountainLion' | 'mahery-bobcat' | 'mahery-buffalo' | 'mahery-eagle' | 'mahery-platypus' | 'mahery-falcon'
  | AnimalId | 'skulker' | 'sessik' | 'weaver' | 'vethra' | 'enemy-snake' | 'enemy-spider'
  | 'enemy-crocodile' | 'enemy-vulture' | 'enemy-raven' | 'clanWarrior' | 'oldChief';

/** Skill glyphs available in components/Icon.tsx */
export type IconId =
  | 'slash' | 'shield' | 'roar' | 'heal' | 'guardAlly'
  | 'resolve' | 'charge' | 'rampage' | 'pack' | 'blessing' | 'venom'
  | 'pounce' | 'shadow' | 'stampede' | 'dive' | 'wind'
  | 'power' | 'weaken' | 'rally';

/**
 * Attack animation style, played on the caster's sprite in components/Sprite.tsx.
 * 'strike' - quick lunge into the target (basic attacks).
 * 'charge' - a bigger leap-up-then-slam-down lunge (antler/tusk/pounce style unique skills).
 * 'cast'   - a pulse of light on the caster, no travel (self/ally buffs, heals, shields).
 * 'venom'  - a short lunge that leaves a toxin-tinted glow (poison moves).
 * 'aoe'    - an in-place stomp/shockwave (hits every enemy at once).
 * 'dive'   - a rise-up on cast (Skyfall Dive's leap). The payoff hit always animates as
 *            'diveStrike' instead, set directly by the engine, not chosen from skill data.
 */
export type AnimStyle = 'strike' | 'charge' | 'cast' | 'venom' | 'aoe' | 'dive' | 'diveStrike';

export type StatusId =
  | 'guard'         // magnitude = shield points remaining
  | 'strengthUp'    // magnitude = fraction, 0.2 = +20%
  | 'instinctUp'    // magnitude = fraction
  | 'speedUp'       // magnitude = fraction
  | 'speedDown'     // magnitude = fraction removed
  | 'poison'        // magnitude = damage per tick
  | 'bleed'         // magnitude = damage per tick (physical)
  | 'weaken'        // magnitude = fraction of Strength removed
  | 'stun'          // skip the next turn
  | 'airborne'      // Eagle: hard to hit while the dive is pending
  | 'resolve'       // magnitude = damage reduction fraction, extra = reflect fraction
  | 'standTogether' // on Mahery: next hit redirects to the companion
  | 'charging';     // telegraphs a heavy attack landing on this unit's next turn - a real window to punish or brace

export interface Attributes {
  vitality: number;
  strength: number;
  instinct: number;
  speed: number;
}

/**
 * Keys for the `special` escape hatch, handled in engine/combat.ts.
 * Each is one unique-skill mechanic that plain effects can't express.
 */
export type SpecialKey =
  | 'splashBehind'     // also hit the enemy standing behind the target (params.multiplier)
  | 'stunChance'       // chance to stun the target (params.chance, params.duration)
  | 'rampage'          // damage rises with the caster's missing Health (params.base, params.bonus)
  | 'packInstinct'     // damage rises per negative effect on the target (params.base, params.perDebuff)
  | 'herdBlessing'     // buff the companion, or self-buff + shield when solo (params.magnitude, duration, shieldMult)
  | 'ambush'           // bonus damage in round 1, execute bonus on wounded targets (params.multiplier, openingBonus, executeThreshold, executeBonus)
  | 'guaranteedCrit'   // damage that always crits (params.multiplier)
  | 'skyfall'          // leap now, strike at the start of your next turn (params.multiplier, ignoreGuardPct)
  | 'extraAction'      // the caster acts again this turn
  | 'lifesteal'        // deal damage to the target and heal the caster by a fraction of it (params.multiplier, drainPct)
  | 'telegraph';       // wind up now, strike at the start of the caster's next turn for bonus damage - unless staggered first (params.multiplier, ignoreGuardPct, breakThresholdPct)

export type Effect =
  | {
      kind: 'damage'; scaling: Scaling; multiplier: number; ignoreGuardPct?: number;
      /** extra multiplier on top when the target currently carries this status - rewards setting it up first */
      bonusVsStatus?: { status: StatusId; multiplier: number };
    }
  | { kind: 'heal'; scaling: Scaling; multiplier: number }
  | { kind: 'restoreSpirit'; amount: number }
  | { kind: 'shield'; scaling: Scaling; multiplier: number; duration: number }
  | {
      kind: 'status';
      status: StatusId;
      duration: number;
      magnitude: number;
      extra?: number;
      /** poison and speedDown default to the target; buffs default to the caster */
      target?: 'self' | 'target';
      /** scale magnitude by an attribute of the caster (used by poison and bleed) */
      scaling?: Scaling;
    }
  | { kind: 'cleanse' } // remove negative statuses from the caster
  | { kind: 'special'; key: SpecialKey; params?: Record<string, number> };

export interface RankDef {
  spiritCost: number;
  cooldown: number; // turns of the caster before reuse, 0 = none
  effects: Effect[];
  summary: string;  // tooltip line for this rank
}

export interface SkillDef {
  id: string;   // 'bear.basicStrike', 'bear.unique', 'companion.standTogether'
  name: string;
  flavor: string;
  icon: IconId;
  anim: AnimStyle;
  kind: 'shared' | 'unique' | 'companion';
  sharedKind?: SharedKind;
  target: TargetRule;
  ranks: [RankDef, RankDef, RankDef];
  requires?: { skillId: string; rank: number }[];
  /** alternative prerequisite groups: any one group satisfied is enough */
  requiresAny?: { skillId: string; rank: number }[][];
  minLevel?: number;
}

/** A skill resolved to one rank, ready for the combat engine. */
export interface ActiveSkill {
  id: string;
  name: string;
  icon: IconId;
  anim: AnimStyle;
  target: TargetRule;
  spiritCost: number;
  cooldown: number;
  effects: Effect[];
  summary: string;
  rank: number;
}

export interface SharedSkillTemplate {
  sharedKind: SharedKind;
  icon: IconId;
  anim: AnimStyle;
  target: TargetRule;
  ranks: [RankDef, RankDef, RankDef];
  requires?: { skillId: string; rank: number }[];
  requiresAny?: { skillId: string; rank: number }[][];
  minLevel?: number;
}

export interface VoiceLines {
  prologue: string[];
  beforeStage1: string[];
  afterStage1: string[];
  beforeBoss: string[];
  afterBoss: string[];
  onSwapIn: string[];
  onLowHealth: string[];
  onVictory: string[];
  onDefeat: string[];
}

export interface AnimalDef {
  id: AnimalId;
  name: string;
  tagline: string;      // one line for the bond choice screen
  playstyle: string;    // e.g. "Tank, sustain"
  physicalTraits: string;
  personality: string;
  color: string;   // accent color used to tint the figure
  art: ArtId;      // the companion's drawing
  baseStatMods: Attributes;
  sharedSkillFlavor: Record<SharedKind, { name: string; flavor: string }>;
  uniqueSkill: SkillDef;
  voice: VoiceLines;
}

export interface AiRule {
  healthBelowPct?: number;        // use only when own health is below this fraction
  targetLacksStatus?: StatusId;   // use only when the target does not have this status
  oncePerBattle?: boolean;
}

export interface EnemyMove extends ActiveSkill {
  weight: number;
  ai?: AiRule;
}

export interface LootDrop {
  itemId: string;
  chance: number; // 0..1
}

export interface EnemyDef {
  id: string;
  name: string;
  title?: string;
  description: string;
  color: string;
  art: ArtId;
  attributes: Attributes;
  evasionBonus?: number; // flat fraction added to evasion
  isBoss: boolean;
  moves: EnemyMove[];
  loot?: LootDrop[];
  marksReward?: number; // trade marks dropped alongside XP
  /** Renders as a bigger, red-eyed version of the player's own bonded hybrid form instead of
   * this def's `art` - for kin/clan enemies (the old camp, the old chief) meant to visually
   * echo Mahery himself. Resolved against the current save's animal in engine/combat.ts. */
  corrupted?: boolean;
}

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface EncounterDef {
  id: string;
  chapter: number;
  stage: number;
  name: string;
  subtitle: string;
  enemyIds: string[];
  xpReward: number;
  isBoss: boolean;
  /** scene ids from data/story.ts, resolved against the bonded animal's voice at runtime */
  sceneBefore?: string;
  sceneAfter?: string;
  /** a generated, repeatable off-road fight - not part of the story: no clearedStages entry,
   * no chapter advancement, no scenes. See engine/encounters.ts createRoamingEncounter. */
  isRoaming?: boolean;
}

// ---------- Gems ----------

/** What a gem does: boosts one raw attribute, or 'guard' - a passive % reduction on damage
 * Mahery takes, stacking with (and applied after) any in-battle shield/Resolve reduction. */
export type GemKind = 'vitality' | 'strength' | 'instinct' | 'speed' | 'guard';

export interface GemDef {
  id: string;
  name: string;
  flavor: string;
  kind: GemKind;
  /** 1-5: how far this stone has been cut/refined. Higher levels are strictly better and rarer. */
  level: number;
  /** flat attribute points for vitality/strength/instinct/speed kinds; a 0..1 fraction for guard. */
  bonus: number;
  sellValue: number;
}
