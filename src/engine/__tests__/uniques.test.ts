import { describe, expect, it } from 'vitest';
import type { AnimalId, Attributes, EnemyDef, EnemyMove } from '../../data/types';
import { ANIMAL_ORDER, getAnimal } from '../../data/animals';
import { getAnimalSkills, resolveSkill } from '../skills';
import { advance, createBattle, hasStatus, playerUseSkill, type BattleState } from '../combat';

// Every animal's signature skill must resolve and be castable without engine errors.

const fang: EnemyMove = {
  id: 'fang', name: 'Fang', target: 'enemy', spiritCost: 0, cooldown: 0, rank: 1, weight: 1, icon: 'slash', anim: 'strike',
  summary: '', effects: [{ kind: 'damage', scaling: 'strength', multiplier: 1 }],
};

const dummy = (id = 'dummy'): EnemyDef => ({
  id, name: 'Dummy', description: '', color: '#000', art: 'skulker', isBoss: false,
  attributes: { vitality: 30, strength: 5, instinct: 5, speed: 0 }, evasionBonus: 0, moves: [fang],
});

function battleFor(animalId: AnimalId, enemies = [dummy()], attrs: Partial<Attributes> = {}): BattleState {
  const animal = getAnimal(animalId);
  const skills = getAnimalSkills(animal);
  const ranks = Object.fromEntries(skills.map((k) => [k.id, 3]));
  let s = createBattle({
    encounterId: 't', animal, seed: 5,
    mahery: { attributes: { vitality: 20, strength: 20, instinct: 10, speed: 5, ...attrs }, skillRanks: ranks, actionBar: skills.map((k) => k.id) },
    enemies,
  });
  s.units.companion.health = 0; // isolate Mahery's signature skill from the companion's own auto-actions
  while (s.phase === 'enemyTurn') s = advance(s);
  return s;
}

const runEnemies = (s: BattleState) => { let g = 0; while (s.phase === 'enemyTurn' && g++ < 20) s = advance(s); return s; };

describe('signature skills', () => {
  it.each(ANIMAL_ORDER)('%s unique skill resolves at all ranks and casts cleanly', (animalId) => {
    const animal = getAnimal(animalId);
    for (let r = 1; r <= 3; r++) {
      const k = resolveSkill(animal.uniqueSkill, r);
      expect(k.summary.length).toBeGreaterThan(10);
      expect(k.effects.length).toBeGreaterThan(0);
    }
    let s = battleFor(animalId);
    s = playerUseSkill(s, `${animalId}.unique`, s.enemyIds[0]);
    expect(s.lastError).toBeNull();
  });

  it('Moose: Antler Charge splashes to the enemy behind and can stun', () => {
    let s = battleFor('moose', [dummy('a'), dummy('b')]);
    const hpB = s.units.b_1.health;
    s = playerUseSkill(s, 'moose.unique', 'a_0');
    expect(s.units.b_1.health).toBeLessThan(hpB);
    // 45% stun at rank 3: across seeds it should land at least once
    let stuns = 0;
    for (let seed = 1; seed <= 12; seed++) {
      let t = battleFor('moose', [dummy('a')]);
      t = { ...t, rngState: seed };
      t = playerUseSkill(t, 'moose.unique', 'a_0');
      if (hasStatus(t.units.a_0, 'stun')) stuns += 1;
    }
    expect(stuns).toBeGreaterThan(0);
  });

  it('stunned enemies skip their turn', () => {
    let s = battleFor('moose', [dummy('a')]);
    s.units.a_0.statuses.push({ id: 'stun', remainingTurns: 1, magnitude: 1, sourceId: 'mahery', fresh: false });
    const hp = s.units.mahery.health;
    s = playerUseSkill(s, 'moose.basicStrike', 'a_0');
    s = runEnemies(s);
    expect(s.units.mahery.health).toBe(hp);
    expect(s.log.some((l) => /stunned and cannot act/.test(l.text))).toBe(true);
  });

  it('Boar: Reckless Rampage hits harder at low Health', () => {
    const dmgAt = (health: number) => {
      let s = battleFor('boar', [dummy()]);
      s.units.mahery.health = health;
      const before = s.units.dummy_0.health;
      s = playerUseSkill(s, 'boar.unique', 'dummy_0');
      return before - s.units.dummy_0.health;
    };
    expect(dmgAt(10)).toBeGreaterThan(dmgAt(150) * 1.5);
  });

  it('Wolf: Pack Instinct scales with debuffs on the target', () => {
    const dmg = (debuffs: number) => {
      let s = battleFor('wolf', [dummy()]);
      if (debuffs >= 1) s.units.dummy_0.statuses.push({ id: 'poison', remainingTurns: 3, magnitude: 1, sourceId: 'mahery', fresh: false });
      if (debuffs >= 2) s.units.dummy_0.statuses.push({ id: 'speedDown', remainingTurns: 3, magnitude: 0.3, sourceId: 'mahery', fresh: false });
      const before = s.units.dummy_0.health;
      s = playerUseSkill(s, 'wolf.unique', 'dummy_0');
      return before - s.units.dummy_0.health;
    };
    expect(dmg(2)).toBeGreaterThan(dmg(0) * 1.6);
  });

  it("Elk: Herd's Blessing buffs the companion, or self-shields when solo", () => {
    let s = battleFor('elk');
    s.units.companion.health = s.units.companion.maxHealth; // battleFor kills it by default; revive for this case
    s = playerUseSkill(s, 'elk.unique');
    expect(hasStatus(s.units.companion, 'strengthUp')).toBe(true);
    expect(hasStatus(s.units.companion, 'speedUp')).toBe(true);
    let solo = battleFor('elk');
    solo.units.companion.health = 0;
    solo = playerUseSkill(solo, 'elk.unique');
    expect(hasStatus(solo.units.mahery, 'guard')).toBe(true);
    expect(hasStatus(solo.units.mahery, 'instinctUp')).toBe(true);
  });

  it('Bobcat: Shadow Stalk always crits and bleeds', () => {
    let s = battleFor('bobcat');
    s = playerUseSkill(s, 'bobcat.unique', 'dummy_0');
    expect(s.units.dummy_0.lastHit?.kind).toBe('crit');
    expect(hasStatus(s.units.dummy_0, 'bleed')).toBe(true);
    const hp = s.units.dummy_0.health;
    s = runEnemies(s);
    expect(s.units.dummy_0.health).toBeLessThan(hp); // bleed ticked at the enemy's end of turn
  });

  it('Eagle: Skyfall Dive lands at the start of the next turn', () => {
    let s = battleFor('eagle');
    s = playerUseSkill(s, 'eagle.unique', 'dummy_0');
    expect(hasStatus(s.units.mahery, 'airborne')).toBe(true);
    const hp = s.units.dummy_0.health;
    s = runEnemies(s);
    expect(s.phase).toBe('playerTurn');
    expect(s.units.dummy_0.health).toBeLessThan(hp);
    expect(s.units.mahery.pending).toBeUndefined();
    expect(hasStatus(s.units.mahery, 'airborne')).toBe(false);
  });

  it('Falcon: Wind Sprint grants an extra action in the same turn', () => {
    let s = battleFor('falcon');
    s = playerUseSkill(s, 'falcon.unique');
    expect(s.phase).toBe('playerTurn');
    expect(s.round).toBe(1);
    s = playerUseSkill(s, 'falcon.basicStrike', 'dummy_0');
    expect(s.phase).not.toBe('playerTurn');
  });

  it('Buffalo: Stampede hits everyone and cleanses', () => {
    let s = battleFor('buffalo', [dummy('a'), dummy('b')]);
    s.units.mahery.statuses.push({ id: 'poison', remainingTurns: 3, magnitude: 2, sourceId: 'a_0', fresh: false });
    const a = s.units.a_0.health; const b = s.units.b_1.health;
    s = playerUseSkill(s, 'buffalo.unique');
    expect(s.units.a_0.health).toBeLessThan(a);
    expect(s.units.b_1.health).toBeLessThan(b);
    expect(hasStatus(s.units.mahery, 'poison')).toBe(false);
  });

  it('Mountain Lion: Ambush Pounce executes wounded targets harder', () => {
    let s1 = battleFor('mountainLion');
    const full = s1.units.dummy_0.health;
    s1 = playerUseSkill(s1, 'mountainLion.unique', 'dummy_0');
    const opening = full - s1.units.dummy_0.health;
    let s2 = battleFor('mountainLion');
    s2.units.dummy_0.health = 40;
    s2.round = 3;
    s2 = playerUseSkill(s2, 'mountainLion.unique', 'dummy_0');
    expect(s2.units.dummy_0.health).toBe(0);
    expect(opening).toBeGreaterThan(0);
  });
});
