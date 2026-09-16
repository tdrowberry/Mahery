import { describe, expect, it } from 'vitest';
import { getAnimal } from '../../data/animals';
import { getEncounter } from '../../data/encounters';
import { getEnemy } from '../../data/enemies';
import { createNewSave } from '../../state/saveFormat';
import { advance, checkSkillUsable, createBattle, hasStatus, playerUseSkill, type BattleState } from '../combat';

// Balance smoke test: a simple but sensible policy should win each chapter's opening and
// closing fights most of the time. Numbers here are the tuning targets, not gameplay rules.
// Mahery is always the directed unit; the companion fights on its own via the default
// 'balanced' ally stance, so the policy below only ever has to decide for Mahery.

type Setup = { ranks: Record<string, number>; bar: (string | null)[]; strengthBonus: number; vitalityBonus: number };

function policy(s: BattleState): BattleState {
  const u = s.units.mahery;
  const alive = s.enemyIds.filter((id) => s.units[id].health > 0).sort((a, b) => s.units[a].health - s.units[b].health);
  const usable = (id: string) => {
    const k = u.skills.find((x) => x && x.id === id);
    return k && !checkSkillUsable(s, u.id, k);
  };
  const hp = u.health / u.maxHealth;
  if (hp < 0.4 && usable('bear.secondWind')) return playerUseSkill(s, 'bear.secondWind');
  if (usable('bear.unique') && !hasStatus(u, 'resolve') && !u.pending) return playerUseSkill(s, 'bear.unique', alive[0]);
  if (hp < 0.7 && usable('bear.guardStance') && !hasStatus(u, 'guard')) return playerUseSkill(s, 'bear.guardStance');
  if (usable('bear.instinctSurge') && !hasStatus(u, 'strengthUp')) return playerUseSkill(s, 'bear.instinctSurge');
  return playerUseSkill(s, 'bear.basicStrike', alive[0]);
}

function simulate(encounterId: string, setup: Setup, seed: number) {
  const save = createNewSave('bear');
  const attributes = {
    ...save.mahery.attributes,
    strength: save.mahery.attributes.strength + setup.strengthBonus,
    vitality: save.mahery.attributes.vitality + setup.vitalityBonus,
  };
  const enc = getEncounter(encounterId);
  let s = createBattle({
    encounterId, animal: getAnimal('bear'), seed,
    mahery: { attributes, skillRanks: setup.ranks, actionBar: setup.bar },
    enemies: enc.enemyIds.map(getEnemy),
  });
  let guard = 0;
  while (s.phase !== 'victory' && s.phase !== 'defeat' && guard++ < 500) {
    s = s.phase === 'playerTurn' ? policy(s) : advance(s);
    if (s.lastError) throw new Error(`policy error: ${s.lastError}`);
  }
  return { won: s.phase === 'victory', rounds: s.round };
}

function winRate(encounterId: string, setup: Setup, n = 150) {
  let wins = 0; let rounds = 0;
  for (let seed = 1; seed <= n; seed++) {
    const r = simulate(encounterId, setup, seed * 7919);
    if (r.won) wins += 1;
    rounds += r.rounds;
  }
  return { rate: wins / n, avgRounds: rounds / n };
}

const LEVEL1_KIT: Setup = {
  ranks: { 'bear.basicStrike': 1, 'bear.guardStance': 1, 'bear.secondWind': 1, 'bear.instinctSurge': 1 },
  bar: ['bear.basicStrike', 'bear.guardStance', 'bear.secondWind', 'bear.instinctSurge'],
  strengthBonus: 0, vitalityBonus: 0,
};
const BOSS_KIT: Setup = {
  ranks: { 'bear.basicStrike': 1, 'bear.guardStance': 2, 'bear.secondWind': 1, 'bear.instinctSurge': 1, 'bear.unique': 1 },
  bar: ['bear.basicStrike', 'bear.guardStance', 'bear.secondWind', 'bear.unique'],
  strengthBonus: 6, vitalityBonus: 4,
};
// Represents the payoff of a little extra grinding beyond a bare first-timer's kit - a couple
// of roaming fights' worth of ability/attribute points and maybe a found gem or two.
const CH1_GROUND_KIT: Setup = {
  ranks: { 'bear.basicStrike': 2, 'bear.guardStance': 2, 'bear.secondWind': 1, 'bear.instinctSurge': 1, 'bear.weaken': 1, 'bear.unique': 2 },
  bar: ['bear.basicStrike', 'bear.guardStance', 'bear.secondWind', 'bear.weaken', 'bear.unique'],
  strengthBonus: 10, vitalityBonus: 8,
};
const CH2_FULL_KIT: Setup = {
  ranks: { 'bear.basicStrike': 2, 'bear.guardStance': 2, 'bear.secondWind': 2, 'bear.instinctSurge': 2, 'bear.unique': 2 },
  bar: ['bear.basicStrike', 'bear.guardStance', 'bear.secondWind', 'bear.unique'],
  strengthBonus: 12, vitalityBonus: 8,
};

// A player who never opens the Skills screen or Inventory: only the free starting Basic
// Strike, base attributes untouched, no gems equipped. The kits above are supposed to clear
// their fights by a wide margin *because* they represent real investment - if this build can
// also clear a chapter boss, leveling and itemization aren't actually required to progress.
function naivePolicy(s: BattleState): BattleState {
  const alive = s.enemyIds.find((id) => s.units[id].health > 0)!;
  return playerUseSkill(s, 'bear.basicStrike', alive);
}

function simulateNaive(encounterId: string, seed: number) {
  const save = createNewSave('bear');
  const enc = getEncounter(encounterId);
  let s = createBattle({
    encounterId, animal: getAnimal('bear'), seed,
    mahery: { attributes: save.mahery.attributes, skillRanks: save.mahery.skillRanks, actionBar: save.mahery.actionBar },
    enemies: enc.enemyIds.map(getEnemy),
  });
  let guard = 0;
  while (s.phase !== 'victory' && s.phase !== 'defeat' && guard++ < 500) {
    s = s.phase === 'playerTurn' ? naivePolicy(s) : advance(s);
  }
  return { won: s.phase === 'victory', rounds: s.round };
}

function naiveWinRate(encounterId: string, n = 150) {
  let wins = 0;
  for (let seed = 1; seed <= n; seed++) if (simulateNaive(encounterId, seed * 7919).won) wins += 1;
  return wins / n;
}

describe('a totally unspecced build (never leveled, never geared)', () => {
  it('can still limp through the very first fight', () => {
    const rate = naiveWinRate('ch1-s1');
    console.log(`naive, ch1-s1: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeGreaterThan(0.5);
  });
  it('can still get through the middle of chapter 1 (regular fights stay forgiving)', () => {
    const rate = naiveWinRate('ch1-s3');
    console.log(`naive, ch1-s3 (3 skulkers): win ${Math.round(rate * 100)}%`);
    expect(rate).toBeGreaterThan(0.7);
  });
  it('cannot beat the chapter 1 boss', () => {
    const rate = naiveWinRate('ch1-s5');
    console.log(`naive, ch1-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat the chapter 2 boss', () => {
    const rate = naiveWinRate('ch2-s5');
    console.log(`naive, ch2-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat the chapter 3 boss', () => {
    const rate = naiveWinRate('ch3-s5');
    console.log(`naive, ch3-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat the chapter 4 boss', () => {
    const rate = naiveWinRate('ch4-s5');
    console.log(`naive, ch4-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat the chapter 5 boss', () => {
    const rate = naiveWinRate('ch5-s5');
    console.log(`naive, ch5-s5 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
  it('cannot beat Yorrun', () => {
    const rate = naiveWinRate('final-s2');
    console.log(`naive, final-s2 boss: win ${Math.round(rate * 100)}%`);
    expect(rate).toBeLessThan(0.03);
  });
});

describe('chapter 1 balance', () => {
  it('stage 1 is winnable with the starting kit', () => {
    const r = winRate('ch1-s1', LEVEL1_KIT);
    console.log(`ch1-s1 (level 1 kit): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.8);
    expect(r.avgRounds).toBeLessThan(12);
  });
  it('the chapter 1 boss is a real risk for a bare-minimum kit, not a reliable win', () => {
    // With slower point gain, a level-4 kit that just cleared stages 1-4 once is *supposed*
    // to be under-geared for this fight - the intent is that a first-timer feels real risk
    // and comes back after grinding a roaming fight or two / better gems, not that this
    // exact kit reliably clears it. See CH1_GROUND_KIT below for the "a bit more invested" case.
    const r = winRate('ch1-s5', BOSS_KIT);
    console.log(`ch1-s5 boss (bare-minimum kit): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.1);
    expect(r.rate).toBeLessThan(0.6);
  });
  it('the chapter 1 boss is comfortably beatable once you grind a little past bare-minimum', () => {
    const r = winRate('ch1-s5', CH1_GROUND_KIT);
    console.log(`ch1-s5 boss (a little grinding): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.7);
    expect(r.avgRounds).toBeLessThan(22);
  });
});

describe('chapter 2 balance', () => {
  it('stage 1 is winnable with a mid-chapter-1 kit', () => {
    const r = winRate('ch2-s1', BOSS_KIT);
    console.log(`ch2-s1 (boss-tier kit): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.7);
    expect(r.avgRounds).toBeLessThan(14);
  });
  it('the chapter 2 boss is beatable with a fuller, rank-2 kit', () => {
    // a genuinely min-maxed build (rank 2 everywhere, real stat investment) is supposed to
    // win reliably - that is the point of the investment - so this only checks a floor, not
    // an artificial "must still be able to lose" ceiling.
    const r = winRate('ch2-s5', CH2_FULL_KIT);
    console.log(`ch2-s5 boss: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.8);
    expect(r.avgRounds).toBeLessThan(24);
  });
});

// Chapters 3-6 assume progressively more leveling and a fuller learned kit, same spirit as
// CH2_FULL_KIT: growing strength/vitality bonuses stand in for the attribute points a player
// would actually have by that point in the road, rather than simulating the full XP curve.
const CH3_KIT: Setup = {
  ranks: { 'bear.basicStrike': 2, 'bear.guardStance': 2, 'bear.secondWind': 2, 'bear.powerStrike': 2, 'bear.weaken': 2, 'bear.unique': 2 },
  bar: ['bear.basicStrike', 'bear.weaken', 'bear.powerStrike', 'bear.guardStance', 'bear.secondWind', 'bear.unique'],
  strengthBonus: 18, vitalityBonus: 14,
};
const CH4_KIT: Setup = {
  ranks: { ...CH3_KIT.ranks, 'bear.powerStrike': 3, 'bear.weaken': 3, 'bear.unique': 3 },
  bar: CH3_KIT.bar,
  strengthBonus: 26, vitalityBonus: 20,
};
const CH5_KIT: Setup = {
  ranks: { ...CH4_KIT.ranks, 'bear.guardStance': 3, 'bear.secondWind': 3 },
  bar: CH4_KIT.bar,
  strengthBonus: 34, vitalityBonus: 26,
};
const FINAL_KIT: Setup = {
  ranks: { ...CH5_KIT.ranks, 'bear.basicStrike': 3 },
  bar: CH5_KIT.bar,
  strengthBonus: 42, vitalityBonus: 32,
};

describe('chapter 3 balance (crocodile)', () => {
  it('stage 1 is winnable with a chapter-2-tier kit', () => {
    const r = winRate('ch3-s1', CH3_KIT);
    console.log(`ch3-s1: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.6);
    expect(r.avgRounds).toBeLessThan(16);
  });
  it('the chapter 3 boss is beatable, not trivial', () => {
    const r = winRate('ch3-s5', CH3_KIT);
    console.log(`ch3-s5 boss (Drevik): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.4);
    expect(r.avgRounds).toBeLessThan(26);
  });
});

describe('chapter 4 balance (vulture)', () => {
  it('stage 1 is winnable with a chapter-3-tier kit', () => {
    const r = winRate('ch4-s1', CH4_KIT);
    console.log(`ch4-s1: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.6);
    expect(r.avgRounds).toBeLessThan(16);
  });
  it('the chapter 4 boss is beatable, not trivial', () => {
    const r = winRate('ch4-s5', CH4_KIT);
    console.log(`ch4-s5 boss (Skarrow): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.4);
    expect(r.avgRounds).toBeLessThan(26);
  });
});

describe('chapter 5 balance (raven)', () => {
  it('stage 1 is winnable with a chapter-4-tier kit', () => {
    const r = winRate('ch5-s1', CH5_KIT);
    console.log(`ch5-s1: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.6);
    expect(r.avgRounds).toBeLessThan(16);
  });
  it('the chapter 5 boss (Broken Pack leader) is beatable, not trivial', () => {
    const r = winRate('ch5-s5', CH5_KIT);
    console.log(`ch5-s5 boss (Corvath): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.35);
    expect(r.avgRounds).toBeLessThan(28);
  });
});

describe('final chapter balance (the old chief)', () => {
  it('the clan warrior stage is winnable with an endgame kit', () => {
    const r = winRate('final-s1', FINAL_KIT);
    console.log(`final-s1: win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.6);
    expect(r.avgRounds).toBeLessThan(16);
  });
  it('Yorrun is beatable with a genuinely maxed endgame kit, the hardest fight in the game', () => {
    const r = winRate('final-s2', FINAL_KIT);
    console.log(`final-s2 boss (Yorrun): win ${Math.round(r.rate * 100)}%, avg ${r.avgRounds.toFixed(1)} rounds`);
    expect(r.rate).toBeGreaterThan(0.3);
    expect(r.avgRounds).toBeLessThan(30);
  });
});
