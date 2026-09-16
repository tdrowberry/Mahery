import { describe, expect, it } from 'vitest';
import type { Attributes, EnemyDef, EnemyMove } from '../../data/types';
import { getAnimal } from '../../data/animals';
import { SHARED_KINDS } from '../../data/sharedSkills';
import { maxHealth, maxSpirit, scaledValue } from '../formulas';
import { createRng } from '../rng';
import {
  advance, createBattle, effectiveAttributes, getStatus, hasStatus, playerSelectUnit, playerUseSkill, playerWait, type BattleState,
} from '../combat';
import { gainXp, xpToNextLevel } from '../../data/progression';
import { checkUnlock, getAnimalSkills, resolveCompanionSkills } from '../skills';
import { createNewSave, migrate } from '../../state/saveFormat';

const bear = getAnimal('bear');

const fang: EnemyMove = {
  id: 'fang', name: 'Fang', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1, weight: 1, icon: 'slash', anim: 'strike',
  summary: '', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1 }],
};
const venom: EnemyMove = {
  id: 'venom', name: 'Venom', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1, weight: 1, icon: 'venom', anim: 'venom',
  summary: '', ai: { targetLacksStatus: 'poison' }, effects: [{ kind: 'status', status: 'poison', duration: 3, magnitude: 1, scaling: 'instinct', target: 'target' }],
};

function enemy(overrides: Partial<EnemyDef> & { moves?: EnemyMove[] } = {}): EnemyDef {
  return {
    id: 'dummy', name: 'Dummy', description: '', color: '#000', art: 'skulker', isBoss: false,
    attributes: { vitality: 10, strength: 10, instinct: 5, speed: 0 },
    evasionBonus: 0,
    moves: [fang],
    ...overrides,
  };
}

const ALL_SKILLS = getAnimalSkills(bear);
const ids = Object.fromEntries(ALL_SKILLS.map((s) => [s.sharedKind ?? 'unique', s.id])) as Record<string, string>;

/** Keep advancing until it is exactly this unit's turn, or the battle ends. */
function advanceToTurn(s: BattleState, unitId: string, guard = 60): BattleState {
  let g = 0;
  while (!(s.phase === 'playerTurn' && s.currentActor === unitId) && s.phase !== 'victory' && s.phase !== 'defeat' && g++ < guard) {
    s = advance(s);
  }
  return s;
}

/**
 * A solo-Mahery battle: the companion is knocked out immediately (bypassing combat, just for
 * setup) so only Mahery and the enemy act - the deterministic single-actor shape most of these
 * tests are built around. Dual-active party mechanics get their own battles below.
 */
function battle(opts: {
  enemies?: EnemyDef[];
  attrs?: Partial<Attributes>;
  ranks?: Record<string, number>;
  bar?: (string | null)[];
  seed?: number;
} = {}): BattleState {
  const attrs: Attributes = { vitality: 10, strength: 10, instinct: 10, speed: 1, ...opts.attrs };
  const ranks = opts.ranks ?? { [ids.basicStrike]: 1, [ids.guardStance]: 1, [ids.secondWind]: 1, [ids.instinctSurge]: 1, [ids.unique]: 1 };
  const bar = opts.bar ?? [ids.basicStrike, ids.guardStance, ids.secondWind, ids.unique];
  const s = createBattle({
    encounterId: 'test', animal: bear, seed: opts.seed ?? 1,
    mahery: { attributes: attrs, skillRanks: ranks, actionBar: bar },
    enemies: opts.enemies ?? [enemy()],
  });
  s.units.companion.health = 0;
  return advanceToTurn(s, 'mahery');
}

/** run the enemy's turn (and anything else queued) until Mahery is up again */
function runEnemies(s: BattleState): BattleState {
  return advanceToTurn(s, 'mahery');
}

/**
 * A full party battle: Mahery and the companion both alive and both able to act. Deliberately
 * NOT pre-advanced into anyone's turn - selecting a unit only changes who pauses for input on
 * their NEXT turn, not one already popped off the queue, so tests need to select before the
 * first advance() call if they want to direct the companion from round one.
 */
function partyBattle(opts: { enemies?: EnemyDef[]; attrs?: Partial<Attributes>; seed?: number } = {}): BattleState {
  const attrs: Attributes = { vitality: 20, strength: 15, instinct: 10, speed: 5, ...opts.attrs };
  const ranks = { [ids.basicStrike]: 1, [ids.guardStance]: 1, [ids.secondWind]: 1, [ids.instinctSurge]: 1, [ids.unique]: 1 };
  const bar = [ids.basicStrike, ids.guardStance, ids.secondWind, ids.unique];
  return createBattle({
    encounterId: 'test', animal: bear, seed: opts.seed ?? 1,
    mahery: { attributes: attrs, skillRanks: ranks, actionBar: bar },
    enemies: opts.enemies ?? [enemy()],
  });
}

describe('formulas', () => {
  it('follow the GDD draft', () => {
    const a: Attributes = { vitality: 10, strength: 12, instinct: 8, speed: 8 };
    expect(maxHealth(a)).toBe(100);
    expect(maxSpirit(a)).toBe(44);
    expect(scaledValue(a, 'strength', 1.25)).toBe(15);
    expect(scaledValue(a, 'instinct', 2)).toBe(16);
  });
  it('rng is deterministic per seed', () => {
    const a = createRng(42); const b = createRng(42);
    expect([a.next(), a.next()]).toEqual([b.next(), b.next()]);
  });
});

describe('turn order', () => {
  it('a faster enemy acts before a slower one, both interleaved with the party', () => {
    const fast = enemy({ id: 'fast', name: 'Fast', attributes: { vitality: 10, strength: 1, instinct: 1, speed: 50 } });
    const slow = enemy({ id: 'slow', name: 'Slow', attributes: { vitality: 10, strength: 1, instinct: 1, speed: 1 } });
    let s = createBattle({
      encounterId: 't', animal: bear, seed: 3,
      mahery: { attributes: { vitality: 10, strength: 10, instinct: 10, speed: 10 }, skillRanks: { [ids.basicStrike]: 1 }, actionBar: [ids.basicStrike] },
      enemies: [slow, fast],
    });
    s = advance(s); // fastest overall acts first
    expect(s.currentActor).toBe('fast_1');
    // slow (speed 1) is the weakest in the round, so it resolves last
    expect(s.queue[s.queue.length - 1]).toBe('slow_0');
  });
  it('both Mahery and the companion get their own turn each round', () => {
    const s = createBattle({
      encounterId: 't', animal: bear, seed: 3,
      mahery: { attributes: { vitality: 10, strength: 10, instinct: 10, speed: 10 }, skillRanks: { [ids.basicStrike]: 1 }, actionBar: [ids.basicStrike] },
      enemies: [enemy({ attributes: { vitality: 10, strength: 1, instinct: 1, speed: 1 } })],
    });
    const s1 = advance(s);
    // whichever of the two acted, the other is still queued for this same round
    const seen = new Set([s1.currentActor, ...s1.queue]);
    expect(seen.has('mahery')).toBe(true);
    expect(seen.has('companion')).toBe(true);
  });
  it('breaks speed ties randomly across seeds', () => {
    const firsts = new Set<string>();
    for (let seed = 1; seed < 30; seed++) {
      const e = enemy({ attributes: { vitality: 10, strength: 1, instinct: 1, speed: 10 } });
      const s = createBattle({
        encounterId: 't', animal: bear, seed,
        mahery: { attributes: { vitality: 10, strength: 10, instinct: 10, speed: 10 }, skillRanks: { [ids.basicStrike]: 1 }, actionBar: [ids.basicStrike] },
        enemies: [e],
      });
      firsts.add(advance(s).currentActor ?? '');
    }
    expect(firsts.size).toBeGreaterThan(1);
  });
});

describe('actions and validation', () => {
  it('rejects a skill the caster cannot afford', () => {
    let s = battle({ attrs: { instinct: 0 } }); // spirit = 20
    s = { ...s, units: { ...s.units, mahery: { ...s.units.mahery, spirit: 3 } } };
    const r = playerUseSkill(s, ids.guardStance);
    expect(r.lastError).toMatch(/Spirit/);
    expect(r.phase).toBe('playerTurn');
  });
  it('enforces cooldowns for the listed number of turns', () => {
    let s = battle();
    s = playerUseSkill(s, ids.secondWind); // cooldown 2
    expect(s.lastError).toBeNull();
    s = runEnemies(s);
    expect(s.units.mahery.cooldowns[ids.secondWind]).toBe(2);
    s = playerUseSkill(s, ids.secondWind);
    expect(s.lastError).toMatch(/cooldown/);
    s = playerUseSkill(s, ids.basicStrike, s.enemyIds[0]); s = runEnemies(s);
    s = playerUseSkill(s, ids.basicStrike, s.enemyIds[0]); s = runEnemies(s);
    expect(s.units.mahery.cooldowns[ids.secondWind]).toBeUndefined();
    s = playerUseSkill(s, ids.secondWind);
    expect(s.lastError).toBeNull();
  });
  it('rejects an invalid target with the Sonny 2 message', () => {
    const s = battle();
    const r = playerUseSkill(s, ids.basicStrike, 'mahery');
    expect(r.lastError).toBe("The target's status does not meet the requirements of this move.");
  });
});

describe('statuses', () => {
  it('poison ticks 3 times then fades', () => {
    let s = battle({ enemies: [enemy({ moves: [venom], attributes: { vitality: 10, strength: 0, instinct: 5, speed: 0 } })] });
    s = playerUseSkill(s, ids.basicStrike, s.enemyIds[0]);
    s = runEnemies(s);
    expect(hasStatus(s.units.mahery, 'poison')).toBe(true);
    const hp0 = s.units.mahery.health;
    const ticks: number[] = [];
    const stillPoisoned: boolean[] = [];
    for (let i = 0; i < 3; i++) {
      const before = s.units.mahery.health;
      s = playerUseSkill(s, ids.basicStrike, s.enemyIds[0]);
      ticks.push(before - s.units.mahery.health);
      stillPoisoned.push(hasStatus(s.units.mahery, 'poison'));
      if (i < 2) s = runEnemies(s); // enemy only reapplies once the poison is gone
    }
    // magnitude 1 x Instinct 5 = 5 per tick, then it fades on the third tick
    expect(ticks).toEqual([5, 5, 5]);
    expect(stillPoisoned).toEqual([true, true, false]);
    expect(hp0 - s.units.mahery.health).toBe(15);
  });
  it('shield absorbs damage before health', () => {
    let s = battle({ attrs: { vitality: 20 } }); // shield = 40
    s = playerUseSkill(s, ids.guardStance);
    const shield = getStatus(s.units.mahery, 'guard');
    expect(shield?.magnitude).toBe(40);
    const hp = s.units.mahery.health;
    s = runEnemies(s); // enemy Str 10 hits for ~9-15
    expect(s.units.mahery.health).toBe(hp);
    expect((getStatus(s.units.mahery, 'guard')?.magnitude ?? 0)).toBeLessThan(40);
  });
  it('Resolve reduces damage and reflects part of it', () => {
    let s = battle({ enemies: [enemy({ attributes: { vitality: 10, strength: 100, instinct: 1, speed: 0 } })], attrs: { vitality: 100 } });
    s = playerUseSkill(s, ids.unique); // 40% reduction, 25% reflect
    const hp = s.units.mahery.health;
    const ehp = s.units[s.enemyIds[0]].health;
    s = runEnemies(s);
    const taken = hp - s.units.mahery.health;
    const reflected = ehp - s.units[s.enemyIds[0]].health;
    expect(taken).toBeGreaterThan(0);
    expect(reflected).toBeGreaterThan(0);
    // reflect is 25% of pre-reduction, taken is 60% of it: ratio 0.6/0.25 = 2.4 (rounding aside)
    expect(taken / reflected).toBeGreaterThan(2);
    expect(taken / reflected).toBeLessThan(3);
  });
  it("Weaken reduces the target's effective Strength", () => {
    const s = battle();
    const before = { ...s.units.mahery.attributes };
    s.units.mahery.statuses.push({ id: 'weaken', remainingTurns: 2, magnitude: 0.25, sourceId: 'dummy_0', fresh: false });
    const eff = effectiveAttributes(s.units.mahery);
    expect(eff.strength).toBe(Math.round(before.strength * 0.75));
  });
});

describe('party: both act, either can be targeted', () => {
  it('the companion fights automatically when it is not the one you are directing', () => {
    let s = partyBattle();
    // default: directing Mahery, so the companion should act on its own this round
    let g = 0;
    while (s.units.companion.usedOnce[ids.basicStrike] === undefined && s.phase !== 'victory' && s.phase !== 'defeat' && g++ < 20) {
      if (s.phase === 'playerTurn') s = playerUseSkill(s, ids.basicStrike, s.enemyIds[0]);
      else s = advance(s);
    }
    expect(s.units.companion.usedOnce[ids.basicStrike] || s.units.companion.lastAction).toBeTruthy();
  });
  it('selecting a unit is free and can be done any time, including mid-battle', () => {
    let s = partyBattle();
    s = playerSelectUnit(s, 'companion');
    expect(s.lastError).toBeNull();
    expect(s.activeId).toBe('companion');
    s = playerSelectUnit(s, 'mahery');
    expect(s.lastError).toBeNull();
    expect(s.activeId).toBe('mahery');
  });
  it('an enemy single-target attack can land on either party member, not just the selected one', () => {
    // a sturdy party against a modest enemy, run long enough that a 50/50-ish target pick
    // should land on the companion at least once well within the round budget
    let s = partyBattle({ attrs: { vitality: 30, strength: 15, instinct: 10, speed: 20 }, enemies: [enemy({ attributes: { vitality: 10, strength: 10, instinct: 1, speed: 0 } })] });
    let sawHitOnCompanion = false;
    let g = 0;
    while (!sawHitOnCompanion && s.phase !== 'defeat' && s.phase !== 'victory' && g++ < 400) {
      if (s.phase === 'playerTurn') s = playerWait(s);
      else s = advance(s);
      if (s.units.companion.health < s.units.companion.maxHealth) sawHitOnCompanion = true;
    }
    expect(sawHitOnCompanion).toBe(true);
  });
  it('Stand Together redirects the next hit on Mahery to the companion', () => {
    let s = partyBattle();
    s = playerSelectUnit(s, 'companion');
    s = advanceToTurn(s, 'companion');
    const st = s.units.companion.skills.find((k) => k?.id === 'companion.standTogether')!;
    s = playerUseSkill(s, st.id);
    expect(s.lastError).toBeNull();
    expect(hasStatus(s.units.mahery, 'standTogether')).toBe(true);
    const mHp = s.units.mahery.health;
    const cHp = s.units.companion.health;
    s = runEnemiesParty(s);
    expect(s.units.mahery.health).toBe(mHp);
    expect(s.units.companion.health).toBeLessThan(cHp);
  });
  it('a redirected hit carries its status effects to the companion', () => {
    const venomBite: EnemyMove = {
      id: 'vb', name: 'Venom Bite', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1, weight: 1, icon: 'venom', anim: 'venom', summary: '',
      effects: [
        { kind: 'damage', scaling: 'strength', multiplier: 0.5 },
        { kind: 'status', status: 'poison', duration: 3, magnitude: 1, scaling: 'instinct', target: 'target' },
      ],
    };
    let s = partyBattle({ enemies: [enemy({ moves: [venomBite] })] });
    s = playerSelectUnit(s, 'companion');
    s = advanceToTurn(s, 'companion');
    s = playerUseSkill(s, 'companion.standTogether');
    s = runEnemiesParty(s);
    expect(hasStatus(s.units.mahery, 'poison')).toBe(false);
    expect(hasStatus(s.units.companion, 'poison')).toBe(true);
  });
  it('companion knockout auto-hands control back to Mahery; Mahery down is defeat', () => {
    // durable enough to survive to actually take a turn, hard-hitting enough to one-shot.
    // Seed 2: the weighted target pick (favors whoever is weaker) lands on the companion,
    // which we nudge to near death first so the pick is realistic rather than a coin flip.
    let s = partyBattle({ seed: 2, enemies: [enemy({ attributes: { vitality: 200, strength: 500, instinct: 1, speed: 0 } })] });
    s = playerSelectUnit(s, 'companion');
    s = advanceToTurn(s, 'companion');
    s = playerUseSkill(s, ids.basicStrike, s.enemyIds[0]);
    s.units.companion.health = 1;
    // let the fight run until the companion falls (or the whole thing ends)
    s = runEnemiesUntil(s, (st) => st.units.companion.health === 0 || st.phase === 'victory' || st.phase === 'defeat', 10);
    expect(s.units.companion.health).toBe(0);
    expect(s.activeId).toBe('mahery'); // control snapped back automatically

    // Mahery keeps fighting alone until the overwhelming enemy brings him down too
    let g = 0;
    while (s.phase !== 'defeat' && g++ < 200) {
      s = s.phase === 'playerTurn' ? playerUseSkill(s, ids.basicStrike, s.enemyIds[0]) : advance(s);
    }
    expect(s.phase).toBe('defeat');
  });
  it('companion borrows every shared skill Mahery has unlocked, at his rank, plus Stand Together', () => {
    const skills = resolveCompanionSkills(bear, { [ids.basicStrike]: 3, [ids.guardStance]: 2 });
    expect(skills.map((k) => [k.id, k.rank])).toEqual([
      [ids.basicStrike, 3], [ids.guardStance, 2], ['companion.standTogether', 1],
    ]);
  });
  it('victory when all enemies are down', () => {
    let s = battle({ attrs: { strength: 1000 }, enemies: [enemy(), enemy()] });
    s = playerUseSkill(s, ids.basicStrike, s.enemyIds[0]);
    s = runEnemies(s);
    s = playerUseSkill(s, ids.basicStrike, s.enemyIds[1]);
    expect(s.phase).toBe('victory');
  });
});

/** advance until Mahery is up again, letting the companion act automatically along the way */
function runEnemiesParty(s: BattleState): BattleState {
  return advanceToTurn(s, 'mahery');
}
function runEnemiesUntil(s: BattleState, done: (s: BattleState) => boolean, guard = 200): BattleState {
  let g = 0;
  while (!done(s) && g++ < guard) s = advance(s);
  return s;
}

describe('progression', () => {
  it('levels up and grants points', () => {
    const r = gainXp({ level: 1, xp: 0, abilityPoints: 3, attributePoints: 0 }, 100);
    expect(r.levelsGained).toBe(1);
    expect(r.state).toEqual({ level: 2, xp: 0, abilityPoints: 4, attributePoints: 2 });
    expect(xpToNextLevel(2)).toBe(150);
  });
  it('skill tree prerequisites gate unlocks', () => {
    // The whole shared-skill list is one straight chain (see sharedSkills.ts): the signature
    // skill requires rank 1 of the last link, Rally ("Den Call" for bear).
    const unique = ALL_SKILLS.find((k) => k.id === ids.unique)!;
    const noRally = checkUnlock(unique, { [ids.basicStrike]: 1 }, 5, 5, 1, ALL_SKILLS);
    expect(noRally.ok).toBe(false);
    expect(noRally.reason).toMatch(/Den Call rank 1/);
    const lowLevel = checkUnlock(unique, { [ids.basicStrike]: 1, [ids.rally]: 1 }, 1, 5, 1, ALL_SKILLS);
    expect(lowLevel.reason).toMatch(/level 2/);
    const ok = checkUnlock(unique, { [ids.basicStrike]: 1, [ids.rally]: 1 }, 2, 5, 1, ALL_SKILLS);
    expect(ok.ok).toBe(true);
    const maxed = checkUnlock(unique, { [ids.unique]: 3 }, 9, 9, 1, ALL_SKILLS);
    expect(maxed.ok).toBe(false);
  });
  it('the shared-skill chain has no forks - each rank 1 requires only the one before it', () => {
    for (let i = 1; i < SHARED_KINDS.length; i++) {
      const def = ALL_SKILLS.find((k) => k.sharedKind === SHARED_KINDS[i])!;
      expect(def.requires).toEqual([{ skillId: `bear.${SHARED_KINDS[i - 1]}`, rank: 1 }]);
    }
  });
  it('save file round-trips through migrate', () => {
    const save = createNewSave('bear');
    expect(save.mahery.actionBar[0]).toBe(ids.basicStrike);
    expect(migrate(JSON.parse(JSON.stringify(save)))).toEqual(save);
    expect(migrate({ version: 99 })).toBeNull();
    expect(migrate('junk')).toBeNull();
  });
});
