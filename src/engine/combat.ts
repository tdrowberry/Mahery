import type {
  ActiveSkill, AnimalDef, AnimStyle, ArtId, Attributes, Effect, EnemyDef, EnemyMove, Stance, StatusId, VoiceLines,
} from '../data/types';
import { COMPANION_RATIOS, STAND_TOGETHER } from '../data/companion';
import { heroArtId } from '../data/animals';
import { createRng, type Rng } from './rng';
import {
  applyVariance, CRIT_MULTIPLIER, critChance, evasionChance, maxHealth, maxSpirit, round, scaledValue,
} from './formulas';
import { resolveActionBar, resolveCompanionActionBar, resolveCompanionSkills, resolveSkill } from './skills';
import { chooseEnemyMove } from './ai';
import { chooseAllyMove } from './allyAi';

// ---------- Types ----------

export type UnitId = string;
export type Side = 'player' | 'enemy';
/** Mahery and the companion always fight side by side now: both take their own turn every
 * round, ordered by their own Speed alongside the enemies. `activeId` is only about input
 * routing - which of the two the player is currently giving manual orders to. Whichever one
 * is NOT selected still acts every round, automatically, per `allyStance`. */
export type PartyId = 'mahery' | 'companion';

export interface StatusInstance {
  id: StatusId;
  remainingTurns: number;
  magnitude: number;
  extra?: number;
  sourceId: UnitId;
  /** applied during the owner's own side's turn: skip the first end-of-turn decrement */
  fresh: boolean;
  /** for stackable debuffs (Weaken, Bleed): how many applications are folded into `magnitude`
   * right now, capped - see STACKABLE_CAP in addStatus. Absent/1 for everything else. */
  stacks?: number;
}

/** Eagle's Skyfall Dive: a strike waiting for the caster's next turn. */
export interface PendingStrike {
  name: string;
  targetId: UnitId;
  multiplier: number;
  ignoreGuardPct: number;
}

/**
 * A telegraphed heavy attack: the caster winds up this turn (dealing nothing) and unleashes it
 * at the start of its next turn, for bonus damage over just casting it plainly. It's a real
 * timing choice for whoever it's aimed at - brace (guard/shield), heal through it, or punish the
 * wind-up: if the caster takes enough damage while charging (breakThresholdPct of its max
 * Health), the strike is staggered and lands for much less instead.
 */
export interface ChargedAttack {
  name: string;
  targetId: UnitId;
  multiplier: number;
  ignoreGuardPct: number;
  healthAtChargeStart: number;
  breakThresholdPct: number;
}

/** A momentary "this unit just acted" marker for triggering an attack animation in the UI. */
export interface UnitLastAction {
  seq: number;
  anim: AnimStyle;
  /** The concrete move lets the renderer choose bite vs claw vs sweep artwork. */
  skillId?: string;
  name?: string;
  /** Who this hit was aimed at - lets the renderer travel the attacker's sprite to the actual
   * target's position instead of just lunging in place. Absent for self/ally/aoe moves, which
   * don't cross the field. */
  targetId?: UnitId;
}

export interface Unit {
  id: UnitId;
  name: string;
  side: Side;
  kind: 'mahery' | 'companion' | 'enemy';
  color: string;
  art: ArtId;
  attributes: Attributes;
  maxHealth: number;
  health: number;
  maxSpirit: number;
  spirit: number;
  evasionBonus: number;
  /** passive fraction (0..1) of incoming damage reduced, from Mahery's equipped guard gems
   * and/or a chosen passive perk */
  damageReductionPct?: number;
  /** flat bonus (0..1) added to crit chance, from a chosen passive perk */
  critChanceBonus?: number;
  /** flat bonus Spirit regenerated per turn on top of SPIRIT_REGEN_PER_TURN, from a passive */
  spiritRegenBonus?: number;
  statuses: StatusInstance[];
  cooldowns: Record<string, number>;
  usedOnce: Record<string, boolean>;
  /** action bar for player units (null = empty slot); enemies keep their moves here too */
  skills: (ActiveSkill | null)[];
  moves?: EnemyMove[];
  isBoss: boolean;
  /** renders bigger with a red-eyed tint - see EnemyDef.corrupted */
  corrupted?: boolean;
  pending?: PendingStrike;
  chargedAttack?: ChargedAttack;
  /** effectAnim: which skill.anim landed this hit, so the UI can show a matching impact effect
   * (slash marks, a beam, ...) on the unit that took it - set only for a real weapon-style hit,
   * not heals/shields/DoT ticks. */
  lastHit?: { amount: number; kind: 'damage' | 'heal' | 'miss' | 'crit' | 'shield' | 'poison'; seq: number; effectAnim?: AnimStyle };
  lastAction?: UnitLastAction;
}

export type LogKind = 'info' | 'damage' | 'heal' | 'status' | 'system' | 'voice';
export interface LogEntry { seq: number; text: string; kind: LogKind }

export type Phase = 'playerTurn' | 'enemyTurn' | 'victory' | 'defeat';

export interface BattleState {
  encounterId: string;
  units: Record<UnitId, Unit>;
  enemyIds: UnitId[];
  queue: string[];       // remaining actors this round: 'mahery' | 'companion' | an enemy id
  round: number;
  phase: Phase;
  activeId: PartyId;
  /** how the non-selected party member picks its moves */
  allyStance: Stance;
  currentActor: string | null;
  log: LogEntry[];
  seq: number;
  rngState: number;
  voice: VoiceLines | null;
  animalName: string;
  flags: Record<string, boolean>;
  /** set when the player's most recent action was rejected */
  lastError: string | null;
  /** short banner text for the battlefield, cleared on the next action */
  banner: string | null;
}

export const SPIRIT_REGEN_PER_TURN = 3;
export const NEGATIVE_STATUSES: StatusId[] = ['poison', 'bleed', 'weaken', 'speedDown', 'stun', 'charging'];
export const INVALID_TARGET_MESSAGE = "The target's status does not meet the requirements of this move.";
const AIRBORNE_EVASION = 0.4;
const PARTY_IDS: PartyId[] = ['mahery', 'companion'];

// ---------- Setup ----------

export interface MaherySetup {
  attributes: Attributes;
  skillRanks: Record<string, number>;
  actionBar: (string | null)[];
  /** passive fraction (0..1) of incoming damage reduced, from equipped necklace guard gems
   * plus any chosen passive perk */
  damageReductionPct?: number;
  /** fraction (0..1) added to max Health, from a chosen passive perk */
  maxHealthPct?: number;
  /** fraction (0..1) every equipped skill's Spirit cost is reduced by, from a passive perk */
  spiritCostReduction?: number;
  critChanceBonus?: number;
  evasionBonus?: number;
  spiritRegenBonus?: number;
}

export interface CompanionSetup {
  skillRanks: Record<string, number>;
  actionBar: (string | null)[];
}

export interface BattleSetup {
  encounterId: string;
  animal: AnimalDef;
  mahery: MaherySetup;
  /** The companion's own action bar, independently unlocked/equipped from Mahery's - omit to
   * fall back to the old "knows everything Mahery does" behavior (every simulated/test battle
   * that doesn't care about companion-bar specifics; real play always passes this explicitly,
   * see beginBattle in state/gameStore.ts). */
  companion?: CompanionSetup;
  enemies: EnemyDef[];
  seed: number;
}

export function createBattle(setup: BattleSetup): BattleState {
  const { animal, mahery, enemies, companion: companionSetup } = setup;
  const mAttrs = mahery.attributes;
  const mHealth = Math.round(maxHealth(mAttrs) * (1 + (mahery.maxHealthPct ?? 0)));
  const mSpirit = maxSpirit(mAttrs);

  const bar = resolveActionBar(animal, mahery.actionBar, mahery.skillRanks);
  const discount = mahery.spiritCostReduction ?? 0;
  const skills = discount > 0
    ? bar.map((sk) => (sk ? { ...sk, spiritCost: Math.max(0, Math.round(sk.spiritCost * (1 - discount))) } : null))
    : bar;

  const maheryUnit: Unit = {
    id: 'mahery', name: 'Mahery', side: 'player', kind: 'mahery', color: '#c98a4b', art: heroArtId(animal.id),
    attributes: { ...mAttrs }, maxHealth: mHealth, health: mHealth, maxSpirit: mSpirit, spirit: mSpirit,
    evasionBonus: mahery.evasionBonus ?? 0, damageReductionPct: mahery.damageReductionPct,
    critChanceBonus: mahery.critChanceBonus, spiritRegenBonus: mahery.spiritRegenBonus,
    statuses: [], cooldowns: {}, usedOnce: {},
    skills, isBoss: false,
  };

  const cAttrs: Attributes = {
    vitality: Math.round(mAttrs.vitality * COMPANION_RATIOS.vitality),
    strength: Math.round(mAttrs.strength * COMPANION_RATIOS.strength),
    instinct: Math.round(mAttrs.instinct * COMPANION_RATIOS.instinct),
    speed: mAttrs.speed,
  };
  const cHealth = Math.round(mHealth * COMPANION_RATIOS.health);
  const cSpirit = Math.round(mSpirit * COMPANION_RATIOS.spirit);
  // The companion's own action bar, unlocked and equipped independently of Mahery's (see
  // CompanionSetup) - Stand Together rides along regardless, since it's the bond itself, not a
  // learnable move competing for one of the 6 slots.
  const companionSkills: (ActiveSkill | null)[] = companionSetup
    ? [...resolveCompanionActionBar(animal, companionSetup.actionBar, companionSetup.skillRanks), resolveSkill(STAND_TOGETHER, 1)]
    : resolveCompanionSkills(animal, mahery.skillRanks);
  const companion: Unit = {
    id: 'companion', name: animal.name, side: 'player', kind: 'companion', color: animal.color, art: animal.art,
    attributes: cAttrs, maxHealth: cHealth, health: cHealth, maxSpirit: cSpirit, spirit: cSpirit,
    evasionBonus: 0, statuses: [], cooldowns: {}, usedOnce: {},
    skills: companionSkills, isBoss: false,
  };

  const units: Record<UnitId, Unit> = { mahery: maheryUnit, companion };
  const enemyIds: UnitId[] = [];
  const nameCounts: Record<string, number> = {};
  enemies.forEach((def, i) => {
    const id = `${def.id}_${i}`;
    nameCounts[def.id] = (nameCounts[def.id] ?? 0) + 1;
    const dupes = enemies.filter((e) => e.id === def.id).length;
    const suffix = dupes > 1 ? ` ${String.fromCharCode(64 + nameCounts[def.id])}` : '';
    const hp = maxHealth(def.attributes);
    const sp = maxSpirit(def.attributes);
    units[id] = {
      id, name: def.title ? `${def.name} ${def.title}` : `${def.name}${suffix}`, side: 'enemy', kind: 'enemy',
      color: def.color, art: def.corrupted ? heroArtId(animal.id) : def.art, attributes: { ...def.attributes },
      maxHealth: hp, health: hp, maxSpirit: sp, spirit: sp, evasionBonus: def.evasionBonus ?? 0,
      statuses: [], cooldowns: {}, usedOnce: {}, skills: def.moves, moves: def.moves, isBoss: def.isBoss,
      corrupted: def.corrupted,
    };
    enemyIds.push(id);
  });

  const state: BattleState = {
    encounterId: setup.encounterId, units, enemyIds, queue: [], round: 0, phase: 'enemyTurn',
    activeId: 'mahery', allyStance: 'balanced', currentActor: null, log: [], seq: 0,
    rngState: setup.seed >>> 0, voice: animal.voice, animalName: animal.name, flags: {}, lastError: null, banner: null,
  };
  pushLog(state, 'system', enemies.length === 1
    ? `${units[enemyIds[0]].name} blocks the way.`
    : `${enemies.length} enemies block the way.`);
  return state;
}

// ---------- Helpers ----------

function pushLog(s: BattleState, kind: LogKind, text: string) {
  s.seq += 1;
  s.log.push({ seq: s.seq, text, kind });
  if (s.log.length > 200) s.log.shift();
}

function withRng<T>(s: BattleState, fn: (rng: Rng) => T): T {
  const rng = createRng(s.rngState);
  const out = fn(rng);
  s.rngState = rng.seed;
  return out;
}

const clone = <T,>(v: T): T => structuredClone(v);

export const isAlive = (u: Unit) => u.health > 0;
export const hasStatus = (u: Unit, id: StatusId) => u.statuses.some((st) => st.id === id);
export const getStatus = (u: Unit, id: StatusId) => u.statuses.find((st) => st.id === id);
export const negativeStatusCount = (u: Unit) => u.statuses.filter((st) => NEGATIVE_STATUSES.includes(st.id)).length;
/** Like negativeStatusCount, but a stacked Weaken/Bleed counts for each stack it holds, not just
 * once - rewards actually piling debuffs up, not merely having a few different ones active. */
export const negativeStatusWeight = (u: Unit) =>
  u.statuses.filter((st) => NEGATIVE_STATUSES.includes(st.id)).reduce((sum, st) => sum + (st.stacks ?? 1), 0);

export function effectiveAttributes(u: Unit): Attributes {
  const a = { ...u.attributes };
  for (const st of u.statuses) {
    if (st.id === 'strengthUp') a.strength = Math.round(a.strength * (1 + st.magnitude));
    if (st.id === 'weaken') a.strength = Math.round(a.strength * (1 - st.magnitude));
    if (st.id === 'instinctUp') a.instinct = Math.round(a.instinct * (1 + st.magnitude));
    if (st.id === 'speedUp') a.speed = Math.round(a.speed * (1 + st.magnitude));
    if (st.id === 'speedDown') a.speed = Math.round(a.speed * (1 - st.magnitude));
  }
  return a;
}

export const activeUnit = (s: BattleState) => s.units[s.activeId];
/** The party member the player is NOT currently directing - still fights, just automatically. */
export const otherPartyUnit = (s: BattleState) => s.units[s.activeId === 'mahery' ? 'companion' : 'mahery'];
export const aliveEnemies = (s: BattleState) => s.enemyIds.map((id) => s.units[id]).filter(isAlive);
export const alivePartyIds = (s: BattleState) => PARTY_IDS.filter((id) => isAlive(s.units[id]));

function sayVoice(s: BattleState, key: keyof VoiceLines) {
  const lines = s.voice?.[key];
  if (!lines || lines.length === 0) return;
  const line = withRng(s, (rng) => lines[rng.int(0, lines.length - 1)]);
  pushLog(s, 'voice', `${s.animalName}: "${line}"`);
}

function setLastHit(s: BattleState, u: Unit, amount: number, kind: NonNullable<Unit['lastHit']>['kind'], effectAnim?: AnimStyle) {
  s.seq += 1;
  u.lastHit = { amount, kind, seq: s.seq, effectAnim };
}

// ---------- Targeting ----------

export function validTargets(s: BattleState, casterId: UnitId, rule: ActiveSkill['target']): UnitId[] {
  const caster = s.units[casterId];
  switch (rule) {
    case 'self':
      return [casterId];
    case 'ally': {
      if (caster.side === 'player') {
        const other = casterId === 'mahery' ? 'companion' : 'mahery';
        return isAlive(s.units[other]) ? [other] : [];
      }
      return s.enemyIds.filter((id) => id !== casterId && isAlive(s.units[id]));
    }
    case 'enemy':
    case 'allEnemies':
      return caster.side === 'player' ? s.enemyIds.filter((id) => isAlive(s.units[id])) : alivePartyIds(s);
  }
}

/** true when the player must pick a target for this skill */
export const needsTargetPick = (skill: ActiveSkill) => skill.target === 'enemy';

export function checkSkillUsable(s: BattleState, casterId: UnitId, skill: ActiveSkill): string | null {
  const caster = s.units[casterId];
  if ((caster.cooldowns[skill.id] ?? 0) > 0) return `${skill.name} is on cooldown (${caster.cooldowns[skill.id]}).`;
  if (caster.spirit < skill.spiritCost) return `Not enough Spirit for ${skill.name}.`;
  if (validTargets(s, casterId, skill.target).length === 0) return INVALID_TARGET_MESSAGE;
  return null;
}

/** Which of one or two party members an enemy focuses this turn: leans toward the weaker one. */
function pickEnemyTarget(s: BattleState, _casterId: UnitId, rng: Rng): UnitId | null {
  const targets = alivePartyIds(s);
  if (targets.length === 0) return null;
  if (targets.length === 1) return targets[0];
  const [a, b] = targets;
  const pa = s.units[a].health / s.units[a].maxHealth;
  const pb = s.units[b].health / s.units[b].maxHealth;
  const weightA = 1.5 - pa;
  const weightB = 1.5 - pb;
  return rng.chance(weightA / (weightA + weightB)) ? a : b;
}

// ---------- Damage pipeline ----------

interface DamageOpts { canMiss?: boolean; canCrit?: boolean; forceCrit?: boolean; ignoreGuardPct?: number }

/** Returns the unit that actually took the hit (Stand Together can redirect it). */
function dealDamage(s: BattleState, attackerId: UnitId, targetId: UnitId, base: number, opts: DamageOpts = {}): UnitId {
  const attacker = s.units[attackerId];
  let target = s.units[targetId];
  if (!isAlive(target)) return targetId;
  const { canMiss = true, canCrit = true, forceCrit = false, ignoreGuardPct = 0 } = opts;
  const aAttrs = effectiveAttributes(attacker);

  // 1. evasion
  if (canMiss && !forceCrit) {
    const tAttrs = effectiveAttributes(target);
    const bonus = target.evasionBonus + (hasStatus(target, 'airborne') ? AIRBORNE_EVASION : 0);
    const dodged = withRng(s, (rng) => rng.chance(Math.min(0.75, evasionChance(tAttrs.speed, bonus))));
    if (dodged) {
      pushLog(s, 'info', `${target.name} evades ${attacker.name}'s attack.`);
      setLastHit(s, target, 0, 'miss');
      return targetId;
    }
  }

  // 2. crit and variance
  let amount = base;
  let crit = forceCrit;
  if (canCrit && !forceCrit) {
    crit = withRng(s, (rng) => rng.chance(critChance(aAttrs.speed, attacker.critChanceBonus ?? 0)));
  }
  if (crit) amount *= CRIT_MULTIPLIER;
  amount = withRng(s, (rng) => applyVariance(amount, rng.next()));
  amount = round(amount);

  // 3. Stand Together redirect
  if (target.kind === 'mahery' && hasStatus(target, 'standTogether') && isAlive(s.units.companion)) {
    target.statuses = target.statuses.filter((st) => st.id !== 'standTogether');
    target = s.units.companion;
    pushLog(s, 'status', `${target.name} steps in front of Mahery and takes the hit.`);
  }

  // 3.5. Necklace guard gems: a passive % reduction on whoever actually ends up taking the hit
  // (so a Stand Together redirect to the companion correctly does NOT get Mahery's protection).
  if (target.damageReductionPct) {
    amount = round(amount * (1 - target.damageReductionPct));
  }

  // 4. Hibernator's Resolve: reduce and reflect
  const resolve = getStatus(target, 'resolve');
  if (resolve) {
    const reflected = round(amount * (resolve.extra ?? 0));
    amount = round(amount * (1 - resolve.magnitude));
    if (reflected > 0 && isAlive(attacker)) {
      attacker.health = Math.max(0, attacker.health - reflected);
      setLastHit(s, attacker, reflected, 'damage');
      pushLog(s, 'damage', `${target.name}'s Resolve reflects ${reflected} damage to ${attacker.name}.`);
    }
  }

  // 5. shield
  const guard = getStatus(target, 'guard');
  if (guard && guard.magnitude > 0) {
    const shieldable = round(amount * (1 - ignoreGuardPct));
    const absorbed = Math.min(guard.magnitude, shieldable);
    guard.magnitude -= absorbed;
    amount -= absorbed;
    if (absorbed > 0) pushLog(s, 'status', `${target.name}'s shield absorbs ${absorbed}.`);
    if (guard.magnitude <= 0) target.statuses = target.statuses.filter((st) => st !== guard);
  }

  // 6. apply
  target.health = Math.max(0, target.health - amount);
  setLastHit(s, target, amount, crit ? 'crit' : 'damage', attacker.lastAction?.anim);
  pushLog(s, 'damage', `${attacker.name} hits ${target.name} for ${amount}${crit ? ' (critical!)' : ''}.`);
  if (!isAlive(target)) onUnitDown(s, target);
  if (!isAlive(attacker)) onUnitDown(s, attacker);
  return target.id;
}

function onUnitDown(s: BattleState, u: Unit) {
  if (s.flags[`down:${u.id}`]) return;
  s.flags[`down:${u.id}`] = true;
  u.statuses = [];
  u.pending = undefined;
  u.chargedAttack = undefined;
  u.lastAction = undefined;
  pushLog(s, 'system', `${u.name} is down.`);
  // if you were directing the one that just fell, hand control to the survivor automatically
  if (isPartyId(u.id) && s.activeId === u.id) {
    const other: PartyId = u.id === 'mahery' ? 'companion' : 'mahery';
    if (isAlive(s.units[other])) {
      s.activeId = other;
      pushLog(s, 'system', `${s.units[other].name} takes the lead.`);
    }
  }
}

// Weaken and Bleed compound instead of refreshing: landing a second one while the first is still
// active adds to it rather than replacing it, capped at this many applications' worth. Everything
// that reads these statuses (Strength reduction, DoT tick damage) already just reads `magnitude`,
// so accumulating it here is the only change those consumers need - the cap is expressed as a
// multiple of whatever this application's own magnitude is, not a fixed number, since magnitude
// itself scales with the caster's stats and rank.
const STACKABLE_CAP: Partial<Record<StatusId, number>> = { weaken: 3, bleed: 3 };

function addStatus(s: BattleState, ownerId: UnitId, sourceId: UnitId, id: StatusId, duration: number, magnitude: number, extra?: number) {
  const owner = s.units[ownerId];
  if (!isAlive(owner)) return;
  // applied during the owner's own side's turn: skip the first end-of-turn decrement
  const fresh = s.units[sourceId].side === owner.side;
  const existing = getStatus(owner, id);
  const cap = STACKABLE_CAP[id];
  if (existing) {
    existing.remainingTurns = Math.max(existing.remainingTurns, duration);
    if (id === 'guard') {
      existing.magnitude = Math.max(existing.magnitude, magnitude);
    } else if (cap) {
      existing.magnitude = Math.min(existing.magnitude + magnitude, magnitude * cap);
      existing.stacks = Math.min((existing.stacks ?? 1) + 1, cap);
    } else {
      existing.magnitude = magnitude;
    }
    existing.extra = extra;
    existing.fresh = fresh;
    existing.sourceId = sourceId;
  } else {
    owner.statuses.push({ id, remainingTurns: duration, magnitude, extra, sourceId, fresh, stacks: cap ? 1 : undefined });
  }
}

const STATUS_LABEL: Record<StatusId, string> = {
  guard: 'Shield', strengthUp: 'Strength Up', instinctUp: 'Instinct Up', speedUp: 'Speed Up', speedDown: 'Slowed',
  poison: 'Poisoned', bleed: 'Bleeding', weaken: 'Weakened', stun: 'Stunned', airborne: 'Airborne',
  resolve: 'Resolve', standTogether: 'Stand Together', charging: 'Winding Up',
};
export const statusLabel = (id: StatusId) => STATUS_LABEL[id];

function logStatus(s: BattleState, tid: UnitId, id: StatusId, duration: number) {
  pushLog(s, 'status', `${s.units[tid].name}: ${statusLabel(id)} (${duration} turn${duration === 1 ? '' : 's'}).`);
}

function applySpecial(
  s: BattleState, casterId: UnitId, targetId: UnitId, key: Extract<Effect, { kind: 'special' }>['key'],
  p: Record<string, number>, skill: ActiveSkill,
): UnitId {
  const caster = s.units[casterId];
  const cAttrs = effectiveAttributes(caster);
  const target = s.units[targetId];
  switch (key) {
    case 'splashBehind': {
      const idx = s.enemyIds.indexOf(targetId);
      const behind = s.enemyIds.slice(idx + 1).concat(s.enemyIds.slice(0, idx)).find((id) => id !== targetId && isAlive(s.units[id]));
      if (behind) {
        pushLog(s, 'info', `${caster.name} crashes through into ${s.units[behind].name}.`);
        dealDamage(s, casterId, behind, scaledValue(cAttrs, 'strength', p.multiplier ?? 0.5));
      }
      return targetId;
    }
    case 'stunChance': {
      if (!isAlive(target)) return targetId;
      if (withRng(s, (rng) => rng.chance(p.chance ?? 0.25))) {
        addStatus(s, targetId, casterId, 'stun', p.duration ?? 1, 1);
        logStatus(s, targetId, 'stun', p.duration ?? 1);
      }
      return targetId;
    }
    case 'rampage': {
      const missing = 1 - caster.health / caster.maxHealth;
      const mult = (p.base ?? 1) + (p.bonus ?? 1.5) * missing;
      if (missing > 0.3) pushLog(s, 'info', `${caster.name} fights harder the more it bleeds.`);
      return dealDamage(s, casterId, targetId, scaledValue(cAttrs, 'strength', mult));
    }
    case 'packInstinct': {
      const debuffs = negativeStatusCount(target);
      const weight = negativeStatusWeight(target);
      const mult = (p.base ?? 1) + (p.perDebuff ?? 0.35) * weight;
      if (debuffs > 0) pushLog(s, 'info', `${caster.name} presses ${debuffs} weakness${debuffs === 1 ? '' : 'es'}${weight > debuffs ? ` (stacked x${weight})` : ''}.`);
      return dealDamage(s, casterId, targetId, scaledValue(cAttrs, 'strength', mult));
    }
    case 'herdBlessing': {
      const otherId = casterId === 'mahery' ? 'companion' : 'mahery';
      const other = s.units[otherId];
      const magnitude = p.magnitude ?? 0.2;
      const duration = p.duration ?? 3;
      if (caster.side === 'player' && isAlive(other)) {
        // the herd is the two of them: both gain Strength and Speed
        for (const id of [otherId, casterId]) {
          addStatus(s, id, casterId, 'strengthUp', duration, magnitude);
          addStatus(s, id, casterId, 'speedUp', duration, magnitude);
        }
        pushLog(s, 'status', `${caster.name} and ${other.name}: Strength Up and Speed Up (${duration} turns).`);
      } else {
        addStatus(s, casterId, casterId, 'instinctUp', duration, magnitude);
        const shield = round(scaledValue(cAttrs, 'vitality', p.shieldMult ?? 2));
        addStatus(s, casterId, casterId, 'guard', 2, shield);
        setLastHit(s, caster, shield, 'shield');
        pushLog(s, 'status', `${caster.name} gathers inward: Instinct Up and a ${shield} point shield.`);
      }
      return targetId;
    }
    case 'ambush': {
      let mult = p.multiplier ?? 1.5;
      if (s.round <= 1) { mult *= 1 + (p.openingBonus ?? 0.5); pushLog(s, 'info', `${caster.name} strikes from ambush!`); }
      if (isAlive(target) && target.health / target.maxHealth < (p.executeThreshold ?? 0.3)) {
        mult *= 1 + (p.executeBonus ?? 1);
        pushLog(s, 'info', `${caster.name} goes for the kill.`);
      }
      return dealDamage(s, casterId, targetId, scaledValue(cAttrs, 'strength', mult));
    }
    case 'guaranteedCrit':
      return dealDamage(s, casterId, targetId, scaledValue(cAttrs, 'strength', p.multiplier ?? 1.2), { forceCrit: true });
    case 'skyfall': {
      caster.pending = { name: skill.name, targetId, multiplier: p.multiplier ?? 2, ignoreGuardPct: p.ignoreGuardPct ?? 0.5 };
      addStatus(s, casterId, casterId, 'airborne', 1, AIRBORNE_EVASION);
      pushLog(s, 'status', `${caster.name} leaps out of reach. The dive comes next turn.`);
      return targetId;
    }
    case 'telegraph': {
      caster.chargedAttack = {
        name: skill.name, targetId, multiplier: p.multiplier ?? 2, ignoreGuardPct: p.ignoreGuardPct ?? 0.3,
        healthAtChargeStart: caster.health, breakThresholdPct: p.breakThresholdPct ?? 0.15,
      };
      addStatus(s, casterId, casterId, 'charging', 1, 1);
      pushLog(s, 'status', `${caster.name} winds up for ${skill.name}! Hit back hard or brace for it.`);
      return targetId;
    }
    case 'lifesteal': {
      const before = target.health;
      const landedId = dealDamage(s, casterId, targetId, scaledValue(cAttrs, 'strength', p.multiplier ?? 0.8));
      const dealt = Math.max(0, before - s.units[landedId].health);
      const healed = round(dealt * (p.drainPct ?? 0.5));
      if (healed > 0 && isAlive(caster)) {
        const capped = Math.min(healed, caster.maxHealth - caster.health);
        caster.health += capped;
        setLastHit(s, caster, capped, 'heal');
        pushLog(s, 'heal', `${caster.name} drains ${capped} Health.`);
      }
      return landedId;
    }
    case 'extraAction':
      return targetId; // handled in playerUseSkill
  }
}

function applyEffects(s: BattleState, casterId: UnitId, primaryTargetId: UnitId, skill: ActiveSkill) {
  const caster = s.units[casterId];
  const cAttrs = effectiveAttributes(caster);
  const targets = skill.target === 'allEnemies'
    ? validTargets(s, casterId, 'allEnemies')
    : [primaryTargetId];
  // If a hit gets redirected (Stand Together), later effects on that target follow the hit.
  const landedOn: Record<UnitId, UnitId> = {};
  const actual = (tid: UnitId) => landedOn[tid] ?? tid;

  for (const effect of skill.effects as Effect[]) {
    switch (effect.kind) {
      case 'damage':
        for (const tid of targets) {
          const landedId = actual(tid);
          // bonusVsStatus.multiplier is a fraction ADDED per stack (see STACKABLE_CAP above) -
          // for a status that doesn't stack, presence just counts as 1 "stack".
          const bonus = effect.bonusVsStatus;
          const bonusStatus = bonus && getStatus(s.units[landedId], bonus.status);
          const bonusStacks = bonusStatus?.stacks ?? (bonusStatus ? 1 : 0);
          const multiplier = bonusStatus ? effect.multiplier * (1 + bonus!.multiplier * bonusStacks) : effect.multiplier;
          if (bonusStatus) {
            const stackNote = bonusStacks > 1 ? ` (x${bonusStacks})` : '';
            pushLog(s, 'info', `${caster.name} punishes ${s.units[landedId].name}'s ${statusLabel(bonus!.status)}${stackNote}.`);
          }
          landedOn[tid] = dealDamage(s, casterId, landedId, scaledValue(cAttrs, effect.scaling, multiplier), {
            ignoreGuardPct: effect.ignoreGuardPct,
          });
        }
        break;
      case 'heal': {
        const t = skill.target === 'allEnemies' ? caster : s.units[primaryTargetId];
        const amount = round(scaledValue(cAttrs, effect.scaling, effect.multiplier));
        const healed = Math.min(amount, t.maxHealth - t.health);
        t.health += healed;
        setLastHit(s, t, healed, 'heal');
        pushLog(s, 'heal', `${t.name} recovers ${healed} Health.`);
        break;
      }
      case 'restoreSpirit': {
        const t = s.units[primaryTargetId];
        t.spirit = Math.min(t.maxSpirit, t.spirit + effect.amount);
        pushLog(s, 'heal', `${t.name} restores ${effect.amount} Spirit.`);
        break;
      }
      case 'shield': {
        const amount = round(scaledValue(cAttrs, effect.scaling, effect.multiplier));
        addStatus(s, primaryTargetId, casterId, 'guard', effect.duration, amount);
        setLastHit(s, s.units[primaryTargetId], amount, 'shield');
        pushLog(s, 'status', `${s.units[primaryTargetId].name} gains a ${amount} point shield.`);
        break;
      }
      case 'status': {
        const isBuff = !NEGATIVE_STATUSES.includes(effect.status);
        const explicit = effect.target;
        const ownerId = explicit === 'self' || (!explicit && isBuff) ? casterId : actual(primaryTargetId);
        const magnitude = effect.scaling ? round(scaledValue(cAttrs, effect.scaling, effect.magnitude)) : effect.magnitude;
        for (const tid of skill.target === 'allEnemies' && ownerId !== casterId ? targets.map(actual) : [ownerId]) {
          if (!isAlive(s.units[tid])) continue;
          addStatus(s, tid, casterId, effect.status, effect.duration, magnitude, effect.extra);
          logStatus(s, tid, effect.status, effect.duration);
        }
        break;
      }
      case 'cleanse': {
        // 'ally' skills (Rally) cleanse the ally; every other target rule (self, allEnemies,
        // even 'enemy' in principle) cleanses the caster - Stampede's primary target is an
        // enemy for the damage effect, but the cleanse is always about shaking off your own.
        const t = skill.target === 'ally' ? s.units[primaryTargetId] : caster;
        const before = t.statuses.length;
        t.statuses = t.statuses.filter((st) => !NEGATIVE_STATUSES.includes(st.id));
        if (t.statuses.length !== before) pushLog(s, 'status', `${t.name} shakes off negative effects.`);
        break;
      }
      case 'special':
        landedOn[primaryTargetId] = applySpecial(s, casterId, actual(primaryTargetId), effect.key, effect.params ?? {}, skill);
        break;
    }
  }
}

const hasExtraAction = (skill: ActiveSkill) =>
  skill.effects.some((e) => e.kind === 'special' && e.key === 'extraAction');

function useSkill(s: BattleState, casterId: UnitId, skill: ActiveSkill, targetId: UnitId) {
  const caster = s.units[casterId];
  caster.spirit -= skill.spiritCost;
  if (skill.cooldown > 0) caster.cooldowns[skill.id] = skill.cooldown + 1;
  caster.usedOnce[skill.id] = true;
  s.seq += 1;
  caster.lastAction = { seq: s.seq, anim: skill.anim, skillId: skill.id, name: skill.name, targetId };
  const target = s.units[targetId];
  const onSomeone = skill.target === 'enemy' || skill.target === 'ally';
  pushLog(s, 'info', `${caster.name} uses ${skill.name}${onSomeone ? ` on ${target.name}` : ''}.`);
  applyEffects(s, casterId, targetId, skill);
}

// ---------- Turn flow ----------

function endTurnFor(s: BattleState, unitId: UnitId) {
  const u = s.units[unitId];
  if (!isAlive(u)) return;
  // cooldowns
  for (const k of Object.keys(u.cooldowns)) {
    u.cooldowns[k] = Math.max(0, u.cooldowns[k] - 1);
    if (u.cooldowns[k] === 0) delete u.cooldowns[k];
  }
  // spirit regen
  u.spirit = Math.min(u.maxSpirit, u.spirit + SPIRIT_REGEN_PER_TURN + (u.spiritRegenBonus ?? 0));
  // statuses: damage over time ticks, then durations
  for (const st of [...u.statuses]) {
    if (st.id === 'poison' || st.id === 'bleed') {
      const dmg = round(st.magnitude);
      u.health = Math.max(0, u.health - dmg);
      setLastHit(s, u, dmg, 'poison');
      pushLog(s, 'damage', `${u.name} takes ${dmg} ${st.id} damage.`);
      if (!isAlive(u)) { onUnitDown(s, u); return; }
    }
    if (st.fresh) { st.fresh = false; continue; }
    st.remainingTurns -= 1;
    if (st.remainingTurns <= 0) {
      u.statuses = u.statuses.filter((x) => x !== st);
      pushLog(s, 'status', `${u.name}: ${statusLabel(st.id)} fades.`);
    }
  }
}

function checkOutcome(s: BattleState): boolean {
  if (!isAlive(s.units.mahery)) {
    s.phase = 'defeat';
    s.currentActor = null;
    pushLog(s, 'system', 'Mahery falls. The road wins this time.');
    sayVoice(s, 'onDefeat');
    return true;
  }
  if (aliveEnemies(s).length === 0) {
    s.phase = 'victory';
    s.currentActor = null;
    pushLog(s, 'system', 'Victory.');
    sayVoice(s, 'onVictory');
    return true;
  }
  return false;
}

function buildQueue(s: BattleState) {
  s.round += 1;
  const entries: { id: string; speed: number; tie: number }[] = [];
  withRng(s, (rng) => {
    for (const id of PARTY_IDS) {
      const u = s.units[id];
      if (isAlive(u)) entries.push({ id, speed: effectiveAttributes(u).speed, tie: rng.next() });
    }
    for (const id of s.enemyIds) {
      const u = s.units[id];
      if (isAlive(u)) entries.push({ id, speed: effectiveAttributes(u).speed, tie: rng.next() });
    }
  });
  entries.sort((a, b) => b.speed - a.speed || a.tie - b.tie);
  s.queue = entries.map((e) => e.id);
  pushLog(s, 'system', `Round ${s.round}.`);
}

/** Resolve one party member's pending Skyfall Dive strike. Does not consume their turn. */
function resolveOnePendingStrike(s: BattleState, id: PartyId) {
  const u = s.units[id];
  const p = u.pending;
  if (!p) return;
  u.pending = undefined;
  u.statuses = u.statuses.filter((st) => st.id !== 'airborne');
  const targetId = isAlive(s.units[p.targetId]) ? p.targetId : aliveEnemies(s)[0]?.id;
  if (!targetId) return;
  s.seq += 1;
  u.lastAction = { seq: s.seq, anim: 'diveStrike', name: p.name, targetId };
  pushLog(s, 'info', `${u.name} comes down on ${s.units[targetId].name}: ${p.name}!`);
  dealDamage(s, id, targetId, scaledValue(effectiveAttributes(u), 'strength', p.multiplier), { canMiss: false, ignoreGuardPct: p.ignoreGuardPct });
}

/** Resolve one unit's telegraphed charge attack. Does not consume their turn. */
function resolveOneChargedAttack(s: BattleState, casterId: UnitId) {
  const caster = s.units[casterId];
  const c = caster.chargedAttack;
  if (!c) return;
  caster.chargedAttack = undefined;
  caster.statuses = caster.statuses.filter((st) => st.id !== 'charging');
  const fallback = caster.side === 'enemy' ? alivePartyIds(s)[0] : aliveEnemies(s)[0]?.id;
  const targetId = isAlive(s.units[c.targetId]) ? c.targetId : fallback;
  if (!targetId) return;
  const damageTaken = c.healthAtChargeStart - caster.health;
  const broken = damageTaken >= c.breakThresholdPct * caster.maxHealth;
  s.seq += 1;
  caster.lastAction = { seq: s.seq, anim: 'diveStrike', name: c.name, targetId };
  const attrs = effectiveAttributes(caster);
  if (broken) {
    pushLog(s, 'info', `${caster.name} was staggered mid-charge - ${c.name} lands weakly.`);
    dealDamage(s, casterId, targetId, scaledValue(attrs, 'strength', c.multiplier * 0.35), { ignoreGuardPct: c.ignoreGuardPct });
  } else {
    pushLog(s, 'info', `${caster.name} unleashes ${c.name}!`);
    dealDamage(s, casterId, targetId, scaledValue(attrs, 'strength', c.multiplier), { canMiss: false, ignoreGuardPct: c.ignoreGuardPct });
  }
}

function consumeStun(s: BattleState, u: Unit): boolean {
  const st = getStatus(u, 'stun');
  if (!st) return false;
  u.statuses = u.statuses.filter((x) => x !== st);
  pushLog(s, 'status', `${u.name} is stunned and cannot act.`);
  return true;
}

function isPartyId(id: string): id is PartyId {
  return id === 'mahery' || id === 'companion';
}

/**
 * Move the battle forward by one beat: either it becomes the player's turn for the unit they
 * are directing (returns with phase 'playerTurn'), or exactly one other actor - the auto-acting
 * party member, or an enemy - resolves its turn.
 */
export function advance(state: BattleState): BattleState {
  if (state.phase === 'victory' || state.phase === 'defeat' || state.phase === 'playerTurn') return state;
  const s = clone(state);
  s.lastError = null;
  for (;;) {
    if (s.queue.length === 0) buildQueue(s);
    const actor = s.queue[0];
    const unit = s.units[actor];
    if (!unit || !isAlive(unit)) { s.queue.shift(); continue; }

    if (isPartyId(actor)) {
      // A pending Skyfall Dive resolves as its own beat before the unit's real turn, and does
      // not consume the queue slot - the same actor comes back around for their normal action.
      if (unit.pending) {
        s.currentActor = actor;
        resolveOnePendingStrike(s, actor);
        checkOutcome(s);
        return s;
      }
      s.queue.shift();
      s.currentActor = actor;
      if (consumeStun(s, unit)) {
        endTurnFor(s, actor);
        checkOutcome(s);
        return s;
      }
      if (actor === s.activeId) {
        if (actor === 'mahery' && unit.health > 0 && unit.health / unit.maxHealth < 0.3 && !s.flags.lowHealthSaid) {
          s.flags.lowHealthSaid = true;
          sayVoice(s, 'onLowHealth');
        }
        s.phase = 'playerTurn';
        return s;
      }
      // the other party member acts automatically, per the chosen stance
      s.phase = 'enemyTurn'; // reuses the "not waiting on you" pacing the UI already drives
      const choice = withRng(s, (rng) => chooseAllyMove(s, unit, s.allyStance, rng));
      if (choice) useSkill(s, actor, choice.skill, choice.targetId);
      else pushLog(s, 'info', `${unit.name} hesitates.`);
      endTurnFor(s, actor);
      checkOutcome(s);
      return s;
    }

    // enemy turn: a telegraphed charge resolves as its own beat first, same as the party's
    // pending-strike handling above, and doesn't consume the queue slot - this enemy's normal
    // move selection happens on the next call once the charge is spent.
    if (unit.chargedAttack) {
      s.currentActor = actor;
      resolveOneChargedAttack(s, actor);
      checkOutcome(s);
      return s;
    }
    // pick who to focus once (used for AI filtering and any offensive move), then a move
    // filtered against that focus. A move that targets 'self' still goes to the caster.
    s.queue.shift();
    s.phase = 'enemyTurn';
    s.currentActor = actor;
    if (!consumeStun(s, unit)) {
      const focusId = withRng(s, (rng) => pickEnemyTarget(s, actor, rng));
      const move = focusId ? withRng(s, (rng) => chooseEnemyMove(s, unit, focusId, rng)) : null;
      if (move) {
        useSkill(s, actor, move, move.target === 'self' ? actor : (focusId ?? actor));
      } else {
        pushLog(s, 'info', `${unit.name} hesitates.`);
      }
    }
    endTurnFor(s, actor);
    checkOutcome(s);
    return s;
  }
}

function endPlayerTurn(s: BattleState, casterId: UnitId) {
  endTurnFor(s, casterId);
  if (!checkOutcome(s)) {
    s.phase = 'enemyTurn';
    s.currentActor = null;
  }
}

export function playerUseSkill(state: BattleState, skillId: string, targetId?: UnitId): BattleState {
  const s = clone(state);
  s.lastError = null;
  s.banner = null;
  if (s.phase !== 'playerTurn' || !s.currentActor) { s.lastError = 'Not your turn.'; return s; }
  const casterId = s.currentActor;
  const caster = s.units[casterId];
  const skill = caster.skills.find((k) => k && k.id === skillId) ?? null;
  if (!skill) { s.lastError = 'That skill is not equipped.'; return s; }
  const usable = checkSkillUsable(s, casterId, skill);
  if (usable) { s.lastError = usable; s.banner = usable; return s; }
  const targets = validTargets(s, casterId, skill.target);
  let chosen = targetId ?? targets[0];
  if (skill.target === 'self' || skill.target === 'ally') chosen = targets[0];
  if (!targets.includes(chosen)) { s.lastError = INVALID_TARGET_MESSAGE; s.banner = INVALID_TARGET_MESSAGE; return s; }
  useSkill(s, casterId, skill, chosen);
  if (hasExtraAction(skill) && !checkOutcome(s)) {
    pushLog(s, 'info', `${caster.name} acts again!`);
    return s;
  }
  endPlayerTurn(s, casterId);
  return s;
}

/** Sonny 2's center button: wait out the turn without acting. */
export function playerWait(state: BattleState): BattleState {
  const s = clone(state);
  s.lastError = null;
  s.banner = null;
  if (s.phase !== 'playerTurn' || !s.currentActor) { s.lastError = 'Not your turn.'; return s; }
  const casterId = s.currentActor;
  pushLog(s, 'info', `${s.units[casterId].name} waits.`);
  endPlayerTurn(s, casterId);
  return s;
}

export function canSelect(s: BattleState, unitId: PartyId): string | null {
  if (!isAlive(s.units[unitId])) return `${s.units[unitId].name} is down.`;
  return null;
}

/**
 * Choose which party member you are giving manual orders to. Both still act every round
 * regardless; this only changes who pauses for your input versus acting automatically. Free
 * to change any time, including mid-battle, so you can plan ahead for the next round.
 */
export function playerSelectUnit(state: BattleState, unitId: PartyId): BattleState {
  const s = clone(state);
  s.lastError = canSelect(s, unitId);
  s.banner = null;
  if (s.lastError) return s;
  s.activeId = unitId;
  pushLog(s, 'system', `You are now directing ${s.units[unitId].name}.`);
  return s;
}

export function setAllyStance(state: BattleState, stance: Stance): BattleState {
  const s = clone(state);
  s.allyStance = stance;
  const label = stance === 'aggressive' ? 'Aggressive' : stance === 'support' ? 'Support' : 'Balanced';
  pushLog(s, 'system', `${otherPartyUnit(s).name}'s stance: ${label}.`);
  return s;
}

export function isBattleOver(s: BattleState) {
  return s.phase === 'victory' || s.phase === 'defeat';
}
